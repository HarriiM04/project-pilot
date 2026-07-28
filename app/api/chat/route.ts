import type { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT_DISCOVERY, buildDiscoveryTurnPrompt } from '@/lib/prompts/discovery'
import type { DiscoveryTurnResponse, DiscoveryState } from '@/lib/types'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── Gemini error classifier ───────────────────────────────────────────────

interface GeminiErrorShape {
  status?: number | string
  code?: number | string
  message?: string
  error?: { code?: number; status?: string; message?: string }
}

function classifyGeminiError(err: unknown): string {
  let rawMessage = ''
  if (err instanceof Error) {
    rawMessage = err.message
    try {
      const parsed = JSON.parse(rawMessage) as GeminiErrorShape
      const code = parsed.error?.code || parsed.code || parsed.status
      if (code === 429 || code === 'RESOURCE_EXHAUSTED' || rawMessage.includes('429')) {
        return "I am receiving too many requests right now due to free-tier limits. Please wait about 15 seconds and try again."
      }
    } catch {
      if (rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED') || rawMessage.includes('rate limit')) {
        return "I am receiving too many requests right now due to free-tier limits. Please wait about 15 seconds and try again."
      }
    }
  }
  return "Something went wrong on the AI side. Please try again in a moment."
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!checkRateLimit(user.id, 30, 60000)) {
    return new Response('Rate limit exceeded', { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { messages, projectId } = body
  
  if (!projectId || typeof projectId !== 'string') {
    return new Response('Invalid projectId', { status: 400 })
  }
  if (!Array.isArray(messages) || messages.length > 200) {
    return new Response('Invalid messages', { status: 400 })
  }
  for (const msg of messages) {
    if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return new Response('Invalid message format', { status: 400 })
    }
    // basic sanitization
    msg.content = msg.content.replace(/\u0000/g, '').substring(0, 5000)
  }

  // Verify project ownership and fetch uploaded documents
  const { data: project, error: dbError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project || dbError) {
    return new Response(
      `Forbidden — project not found (${dbError?.message || 'No project matched ID ' + projectId + ' in Supabase'})`,
      { status: 403 }
    )
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

  const uploadedDocs = Array.isArray(project.uploaded_docs) ? project.uploaded_docs : []
  const uploadedDocsText = uploadedDocs
    .map((doc: any) => `[File: ${doc.filename}]\n${doc.extracted_text_snippet || ''}`)
    .join('\n\n')

  // Build chat history text for prompt evaluation
  const chatHistoryText = messages
    .slice(-10) // last 10 turns
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const promptText = buildDiscoveryTurnPrompt(
    chatHistoryText,
    uploadedDocsText,
    project.completeness_score || 0
  )

  // Initialize Gemini API with proper authentication
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[GEMINI] Missing API key: GOOGLE_API_KEY and GEMINI_API_KEY both undefined')
    return new Response('API key not configured. Set GOOGLE_API_KEY environment variable.', { status: 500 })
  }

  console.log(`[GEMINI] Chat: Initializing with API key format: ${apiKey.substring(0, 10)}...`)
  const ai = new GoogleGenAI({ apiKey })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('[GEMINI] Chat: Starting discovery turn with model: gemini-flash-lite-latest')
        const turnResult = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          config: {
            systemInstruction: SYSTEM_PROMPT_DISCOVERY,
            responseMimeType: 'application/json',
          },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
        })

        const jsonText = turnResult.text ?? ''
        console.log(`[GEMINI] Chat: Received response length: ${jsonText.length}`)
        let parsedTurn: DiscoveryTurnResponse | null = null

        try {
          parsedTurn = JSON.parse(jsonText) as DiscoveryTurnResponse
        } catch (parseErr) {
          console.error('[GEMINI] Chat: JSON parse error:', parseErr instanceof Error ? parseErr.message : String(parseErr))
          // Fallback if JSON parsing fails
          parsedTurn = {
            completeness_score: project.completeness_score || 10,
            pillar_status: {
              business_goals: 'partial',
              target_users: 'partial',
              functional_scope: 'partial',
              non_functional_reqs: 'missing',
              constraints: 'missing'
            },
            suggested_quick_replies: ['Tell me more', 'Let me check', 'I have a document to upload'],
            assistant_reply: jsonText.trim() || "Could you tell me a little more about the primary goal of this software?"
          }
        }

        let assistantReply = parsedTurn.assistant_reply || ""
        if (!assistantReply.trim()) {
          assistantReply = "I'm sorry, I couldn't process that properly. Could you rephrase your last point?"
        }
        
        const completeness = Math.min(100, Math.max(0, parsedTurn.completeness_score || 0))

        // Step 1: Stream conversational reply
        controller.enqueue(encoder.encode(assistantReply))

        // Step 2: Save assistant message to DB
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
        if (lastUserMsg) {
          await supabase.from('messages').insert([
            { project_id: projectId, role: 'user', content: lastUserMsg.content },
            { project_id: projectId, role: 'assistant', content: assistantReply },
          ])
        }

        // Step 3: Build DiscoveryState compatibility payload
        const pillarStatus = parsedTurn.pillar_status || {
          business_goals: 'partial', target_users: 'partial', functional_scope: 'partial', non_functional_reqs: 'missing', constraints: 'missing'
        }
        const scoreToNum = (val: string) => val === 'clear' ? 100 : val === 'partial' ? 50 : 0

        const compatibilityState: DiscoveryState = {
          projectName: project.title || 'Untitled Discovery',
          clientName: project.client_name || '',
          domain: parsedTurn.industry_domain || project.domain || 'General Software',
          overallCompletion: completeness,
          sections: [
            { key: 'business_goals', label: 'Business Goals', completion: scoreToNum(pillarStatus.business_goals) },
            { key: 'target_users', label: 'Target Users & Roles', completion: scoreToNum(pillarStatus.target_users) },
            { key: 'functional_scope', label: 'Functional Scope', completion: scoreToNum(pillarStatus.functional_scope) },
            { key: 'non_functional_reqs', label: 'Non-Functional Reqs', completion: scoreToNum(pillarStatus.non_functional_reqs) },
            { key: 'constraints', label: 'Constraints & Tech Stack', completion: scoreToNum(pillarStatus.constraints) }
          ],
          suggestedOptions: parsedTurn.suggested_quick_replies || [],
          requirementsChanged: !!parsedTurn.requirements_changed
        }

        // Step 4: Enqueue sentinel payload for frontend store update
        controller.enqueue(
          encoder.encode(`\n__DISCOVERY_STATE__:${JSON.stringify(compatibilityState)}`)
        )

        // Step 5: Update database project metadata & score
        await supabase
          .from('projects')
          .update({
            completeness_score: completeness,
            dominant_language: parsedTurn.dominant_language || project.dominant_language || 'English',
            domain: parsedTurn.industry_domain || project.domain || '',
            discovery_state: compatibilityState,
          })
          .eq('id', projectId)

        // If requirements changed and a kickoff report exists with 'Submitted' status, reset it to 'Draft'
        if (parsedTurn.requirements_changed) {
          const { data: rep } = await supabase
            .from('kickoff_reports')
            .select('*')
            .eq('project_id', projectId)
            .maybeSingle()

          if (rep) {
            const extracted = (rep.extracted_json as any) || {}
            if (extracted.docs_metadata && extracted.docs_metadata.KICKOFF) {
              const meta = extracted.docs_metadata.KICKOFF
              if (meta.status === 'Submitted') {
                meta.status = 'Draft'
                await supabase
                  .from('kickoff_reports')
                  .update({ extracted_json: extracted })
                  .eq('project_id', projectId)
              }
            }
          }
        }

      } catch (err: unknown) {
        console.error('[GEMINI] Chat error:', err instanceof Error ? err.message : String(err))
        if (err instanceof Error) {
          console.error('[GEMINI] Full error details:', {
            name: err.name,
            message: err.message,
            stack: err.stack?.substring(0, 500)
          })
        }
        const friendlyMessage = classifyGeminiError(err)
        controller.enqueue(encoder.encode(friendlyMessage))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
