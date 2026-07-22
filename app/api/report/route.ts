import type { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { buildExtractionPrompt } from '@/lib/prompts/extraction'
import { getPromptForDocType } from '@/lib/prompts/kickoff-report'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

// GET: Fetch existing report for specific docType (`BRD`, `PRD`, `SRS`, or `KICKOFF`)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const docType = searchParams.get('docType') || 'KICKOFF'

    if (!projectId) return new Response('Missing projectId', { status: 400 })

    const { data: report } = await supabase
      .from('kickoff_reports')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (!report) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if exact docType is stored inside extracted_json.docs[docType] or if KICKOFF is the main report_markdown
    const storedDocs = (report.extracted_json as any)?.docs || {}
    let markdownForDoc = storedDocs[docType] || null

    if (!markdownForDoc && docType === 'KICKOFF') {
      markdownForDoc = report.report_markdown
    }

    if (!markdownForDoc) {
      return new Response(JSON.stringify({ exists: false, report }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      exists: true,
      report: {
        ...report,
        report_markdown: markdownForDoc,
        docType,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching report'
    return new Response(msg, { status: 500 })
  }
}

// POST: Extract requirements and stream synthesized document (Kickoff, BRD, PRD, or SRS)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!checkRateLimit(user.id, 10, 60000)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    const docTypeRaw = typeof body.docType === 'string' ? body.docType : 'KICKOFF'
    const allowedDocTypes = ['KICKOFF', 'BRD', 'PRD', 'SRS', 'SOW']
    const docType = allowedDocTypes.includes(docTypeRaw) ? docTypeRaw : 'KICKOFF'

    if (!projectId) return new Response('Missing projectId', { status: 400 })

    // Verify project and fetch uploaded docs + messages
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project || dbError) {
      return new Response(`Forbidden — project not found (${dbError?.message || 'No project matched ID ' + projectId})`, { status: 403 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    const isAdmin = !!profile?.is_admin

    if (!isAdmin && project.user_id && project.user_id !== user.id) {
      return new Response('Forbidden — you do not have access to this project', { status: 403 })
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    const transcript = (messages || [])
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n')

    const uploadedDocs = Array.isArray(project.uploaded_docs) ? project.uploaded_docs : []
    const uploadedDocsText = uploadedDocs
      .map((doc: any) => `[File: ${doc.filename}]\n${doc.extracted_text_snippet || ''}`)
      .join('\n\n')

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

    // Step 1: Check existing report DB entry so we preserve already generated document variations
    const { data: existingReport } = await supabase
      .from('kickoff_reports')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    let extractedPayload: Record<string, unknown> = (existingReport?.extracted_json as any) || {}

    const lastLength = (extractedPayload.last_extraction_transcript_length as number) || 0
    const hasGrownSignificantly = transcript.length > lastLength * 1.2 || transcript.length - lastLength > 500

    // Only run JSON extraction if we haven't extracted yet or transcript has grown significantly
    if (!extractedPayload.project_title || hasGrownSignificantly) {
      const extractionPrompt = buildExtractionPrompt(transcript, uploadedDocsText)
      try {
        const extractionRes = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          config: { responseMimeType: 'application/json' },
          contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
        })
        const parsed = JSON.parse(extractionRes.text || '{}')
        extractedPayload = { 
          ...extractedPayload, 
          ...parsed,
          last_extraction_transcript_length: transcript.length
        }
      } catch {
        // Fallback or keep existing
        if (!extractedPayload.project_title) {
          extractedPayload.project_title = project.title || 'Software Project'
        }
      }
    }

    // Ensure dominant language is preserved or detected
    const dominantLang = (extractedPayload.detected_dominant_language as string) || project.dominant_language || 'English'
    const projectTitle = (extractedPayload.project_title as string) || project.title || 'Software Project'

    // Step 2: Build tailored prompt for requested docType (Kickoff, BRD, PRD, or SRS)
    const reportPrompt = getPromptForDocType(docType, dominantLang, projectTitle) +
      `\n\n### EXTRACTION DATA TO SYNTHESIZE:\n` + JSON.stringify(extractedPayload, null, 2) +
      `\n\n### FULL DISCOVERY TRANSCRIPT & UPLOADED DOCUMENTS:\n` + transcript + `\n\n` + uploadedDocsText

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let fullMarkdown = ''
        try {
          const reportStream = await ai.models.generateContentStream({
            model: 'gemini-flash-lite-latest',
            contents: [{ role: 'user', parts: [{ text: reportPrompt }] }],
          })

          for await (const chunk of reportStream) {
            const text = chunk.text || ''
            if (text) {
              fullMarkdown += text
              controller.enqueue(encoder.encode(text))
            }
          }

          // Step 3: Save generated document into extracted_json.docs[docType]
          const currentDocs = (extractedPayload.docs as Record<string, string>) || {}
          const updatedDocs = { ...currentDocs, [docType]: fullMarkdown }
          const updatedPayload = { ...extractedPayload, docs: updatedDocs, active_doc_type: docType }

          // If docType is KICKOFF, also update report_markdown column directly for backward compatibility
          const mainMarkdown = docType === 'KICKOFF' ? fullMarkdown : (existingReport?.report_markdown || '')

          await supabase
            .from('kickoff_reports')
            .upsert(
              {
                project_id: projectId,
                report_markdown: mainMarkdown,
                extracted_json: updatedPayload,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'project_id' }
            )

        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Report generation error'
          controller.enqueue(encoder.encode(`\n\n[Error generating ${docType}: ${msg}]`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return new Response(msg, { status: 500 })
  }
}
