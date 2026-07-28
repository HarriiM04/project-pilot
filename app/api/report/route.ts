import type { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { buildExtractionPrompt } from '@/lib/prompts/extraction'
import { getPromptForDocType } from '@/lib/prompts/kickoff-report'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseAgencyDetails } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

// Helper: format Date as "DD Month YYYY"
function formatDate(date: Date): string {
  const day = date.getDate()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

// Helper: increment minor version
function incrementVersion(verStr: string): string {
  const parts = verStr.split('.')
  if (parts.length === 2) {
    const major = parseInt(parts[0], 10)
    const minor = parseInt(parts[1], 10)
    return `${major}.${minor + 1}`
  }
  return '1.0'
}

// GET: Fetch existing report for specific docType (`BRD`, `PRD`, `SRS`, or `KICKOFF`)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    let isAdmin = false
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.is_admin) {
      isAdmin = true
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

    const extracted = report.extracted_json as any || {}
    if (!extracted.docs_metadata) {
      extracted.docs_metadata = {}
    }
    if (!extracted.docs_metadata[docType]) {
      extracted.docs_metadata[docType] = {
        version: '1.0',
        status: 'Draft',
        date: formatDate(new Date(report.updated_at || report.created_at || new Date())),
        version_history: []
      }
    }
    const docMeta = extracted.docs_metadata[docType]

    if (isAdmin && docType === 'KICKOFF' && docMeta?.status !== 'Submitted' && !docMeta?.previously_submitted) {
      return new Response(JSON.stringify({ exists: false }), {
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
        metadata: docMeta
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
    const changeSummary = typeof body.changeSummary === 'string' ? body.changeSummary : ''
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

    // Validate Agency Profile branding for Requirement Summary (KICKOFF)
    if (docType === 'KICKOFF') {
      const orgId = project.org_id
      let adminProfile = null
      if (orgId) {
        const { data: adminData } = await supabase
          .from('profiles')
          .select('*')
          .eq('org_id', orgId)
          .eq('is_admin', true)
          .limit(1)
          .maybeSingle()
        adminProfile = adminData
      } else {
        const { data: adminData } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_admin', true)
          .limit(1)
          .maybeSingle()
        adminProfile = adminData
      }

      const agency = parseAgencyDetails(adminProfile)
      if (!agency || !agency.name || !agency.logo) {
        return new Response('Agency profile is incomplete. Please upload an Agency Logo and set an Agency Name in the profile settings first.', { status: 400 })
      }
    }

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

    // Initialize Gemini API with proper authentication
    // Use GOOGLE_API_KEY environment variable (supported by @google/genai SDK)
    // The API key must be in AIza format from Google AI Studio, not AQ. format
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[GEMINI] Missing API key: GOOGLE_API_KEY and GEMINI_API_KEY both undefined')
      return new Response('API key not configured. Set GOOGLE_API_KEY environment variable.', { status: 500 })
    }
    
    // Log key format for debugging (first 10 chars only, never log full key)
    console.log(`[GEMINI] Initializing with API key format: ${apiKey.substring(0, 10)}...`)
    
    const ai = new GoogleGenAI({ apiKey })

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
        console.log('[GEMINI] Starting extraction with model: gemini-flash-lite-latest')
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
      } catch (err: unknown) {
        console.error('[GEMINI] Extraction error:', err instanceof Error ? err.message : String(err))
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
          console.log('[GEMINI] Starting report generation stream for docType:', docType)
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
          
          console.log(`[GEMINI] Report generation complete for ${docType}, length: ${fullMarkdown.length}`)

          // Step 3: Save generated document into extracted_json.docs[docType]
          const currentDocs = (extractedPayload.docs as Record<string, string>) || {}
          const updatedDocs = { ...currentDocs, [docType]: fullMarkdown }
          
          // Versioning transition logic
          if (!extractedPayload.docs_metadata) {
            extractedPayload.docs_metadata = {}
          }
          const oldMeta = (extractedPayload.docs_metadata as any)[docType] || {
            version: '1.0',
            status: 'Draft',
            date: formatDate(new Date()),
            version_history: []
          }

          let newMeta
          if (oldMeta.status === 'Approved') {
            const nextVer = incrementVersion(oldMeta.version || '1.0')
            const historyEntry = {
              version: oldMeta.version || '1.0',
              date: oldMeta.date || formatDate(new Date()),
              changeSummary: changeSummary || 'Refinement based on chat',
              status: 'Approved'
            }
            newMeta = {
              version: nextVer,
              status: 'Draft',
              date: formatDate(new Date()),
              version_history: [...(oldMeta.version_history || []), historyEntry]
            }
          } else {
            newMeta = {
              version: oldMeta.version || '1.0',
              status: 'Draft',
              date: formatDate(new Date()),
              version_history: oldMeta.version_history || []
            }
          }

          ;(extractedPayload.docs_metadata as any)[docType] = newMeta

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
          console.error(`[GEMINI] Stream error for ${docType}:`, msg)
          if (err instanceof Error) {
            console.error('[GEMINI] Full error details:', {
              name: err.name,
              message: err.message,
              stack: err.stack?.substring(0, 500) // Truncate for logging
            })
          }
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

// PATCH: Approve report
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
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

    const { data: existingReport } = await supabase
      .from('kickoff_reports')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (!existingReport) {
      return new Response('Report not found', { status: 404 })
    }

    const extractedPayload = (existingReport.extracted_json as any) || {}
    if (!extractedPayload.docs_metadata) {
      extractedPayload.docs_metadata = {}
    }

    const oldMeta = extractedPayload.docs_metadata[docType] || {
      version: '1.0',
      status: 'Draft',
      date: formatDate(new Date()),
      version_history: []
    }

    const status = typeof body.status === 'string' ? body.status : 'Approved'
    const newMeta = {
      ...oldMeta,
      status,
      previously_submitted: status === 'Submitted' ? true : (oldMeta.previously_submitted || false)
    }

    extractedPayload.docs_metadata[docType] = newMeta

    const { data: updatedReport, error: updateError } = await supabase
      .from('kickoff_reports')
      .update({
        extracted_json: extractedPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .select()
      .single()

    if (updateError) {
      return new Response(updateError.message, { status: 500 })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      report: {
        ...updatedReport,
        metadata: newMeta
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error approving report'
    return new Response(msg, { status: 500 })
  }
}
