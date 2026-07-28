import type { NextRequest } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/lib/supabase/server'
import { buildProposalPrompt } from '@/lib/prompts/proposal'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/proposal/generate
 * Generate a proposal draft from BRD, PRD, and SOW (excludes SRS, technical details)
 * 
 * Returns: { proposalDraft: string, createdAt: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!checkRateLimit(user.id, 5, 60000)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const projectId = typeof body.projectId === 'string' ? body.projectId : ''
    if (!projectId) return new Response('Missing projectId', { status: 400 })

    // Verify project ownership or admin status
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (!project || dbError) {
      return new Response('Project not found', { status: 403 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    const isAdmin = !!profile?.is_admin

    if (!isAdmin && project.user_id !== user.id) {
      return new Response('Forbidden — you do not have access to this project', { status: 403 })
    }

    // Fetch the kickoff report containing BRD, PRD, SOW
    const { data: report } = await supabase
      .from('kickoff_reports')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (!report) {
      return new Response('No kickoff report found. Generate reports first.', { status: 400 })
    }

    const extractedJson = (report.extracted_json as any) || {}
    const docs = (extractedJson.docs as Record<string, string>) || {}

    // Check that BRD, PRD, and SOW exist
    const requirementSummary = report.report_markdown || ''
    const brd = docs.BRD || ''
    const prd = docs.PRD || ''
    const sow = docs.SOW || ''

    if (!brd || !prd || !sow) {
      return new Response(
        'BRD, PRD, and SOW are required to generate a proposal. Please generate them first.',
        { status: 400 }
      )
    }

    // Prepare Gemini API call
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[GEMINI] Missing API key for proposal generation')
      return new Response('API key not configured', { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })
    const dominantLang = (extractedJson.detected_dominant_language as string) || project.dominant_language || 'English'
    const projectTitle = (extractedJson.project_title as string) || project.title || 'Software Project'

    console.log('[PROPOSAL] Generating proposal for project:', projectTitle)

    // Generate proposal
    try {
      const proposalPrompt = buildProposalPrompt(
        requirementSummary,
        brd,
        prd,
        sow,
        projectTitle,
        dominantLang
      )

      const proposalResponse = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: [{ role: 'user', parts: [{ text: proposalPrompt }] }],
      })

      const proposalMarkdown = proposalResponse.text || ''

      if (!proposalMarkdown || proposalMarkdown.length < 100) {
        console.error('[PROPOSAL] Generated proposal too short:', proposalMarkdown.length)
        return new Response('Failed to generate proposal content', { status: 500 })
      }

      // Store proposal draft in database
      const { error: upsertError } = await supabase
        .from('proposals')
        .upsert(
          {
            project_id: projectId,
            proposal_markdown: proposalMarkdown,
            status: 'draft',
            draft_created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'project_id' }
        )

      if (upsertError) {
        console.error('[PROPOSAL] Database error:', upsertError)
        return new Response('Failed to save proposal draft', { status: 500 })
      }

      console.log('[PROPOSAL] Proposal generated successfully, length:', proposalMarkdown.length)

      return new Response(
        JSON.stringify({
          success: true,
          proposalDraft: proposalMarkdown,
          createdAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (aiError: unknown) {
      const errorMsg = aiError instanceof Error ? aiError.message : 'Unknown error'
      console.error('[PROPOSAL] AI generation error:', errorMsg)
      return new Response(`Proposal generation failed: ${errorMsg}`, { status: 500 })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PROPOSAL] Server error:', msg)
    return new Response(msg, { status: 500 })
  }
}
