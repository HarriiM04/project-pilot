import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 10

/**
 * PATCH /api/proposals/[id]
 * Update proposal draft markdown (for auto-save)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!checkRateLimit(user.id, 30, 60000)) {
      return new Response('Rate limit exceeded', { status: 429 })
    }

    const { id: proposalId } = await params

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response('Invalid JSON', { status: 400 })
    }

    const { proposal_markdown } = body

    if (typeof proposal_markdown !== 'string' || proposal_markdown.length < 10) {
      return new Response('Invalid proposal_markdown: must be a non-empty string', { status: 400 })
    }

    // Fetch proposal to verify ownership
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('project_id')
      .eq('id', proposalId)
      .single()

    if (fetchError || !proposal) {
      return new Response('Proposal not found', { status: 404 })
    }

    // Verify user owns the project (or is admin)
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', proposal.project_id)
      .single()

    if (!project) {
      return new Response('Project not found', { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    const isAdmin = !!profile?.is_admin

    if (!isAdmin && project.user_id !== user.id) {
      return new Response('Forbidden', { status: 403 })
    }

    // Update the proposal
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        proposal_markdown,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId)

    if (updateError) {
      console.error('[PROPOSAL] Update error:', updateError)
      
      // Provide specific error messages
      if (updateError.code === '23503') {
        return new Response('Proposal not found or has been deleted.', { status: 404 })
      } else if (updateError.message?.includes('permission')) {
        return new Response('Insufficient permissions to update this proposal.', { status: 403 })
      } else if (updateError.message?.includes('connection')) {
        return new Response('Database connection error. Please try again in a moment.', { status: 503 })
      } else {
        return new Response(`Failed to update proposal: ${updateError.message}`, { status: 500 })
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated_at: new Date().toISOString() }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PROPOSAL] PATCH error:', msg)
    return new Response(msg, { status: 500 })
  }
}

/**
 * GET /api/proposals/[id]
 * Fetch a single proposal by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id: proposalId } = await params

    // Fetch proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single()

    if (fetchError || !proposal) {
      return new Response('Proposal not found', { status: 404 })
    }

    // Verify user owns the project (or is admin)
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', proposal.project_id)
      .single()

    if (!project) {
      return new Response('Project not found', { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    const isAdmin = !!profile?.is_admin

    if (!isAdmin && project.user_id !== user.id) {
      return new Response('Forbidden', { status: 403 })
    }

    return new Response(JSON.stringify({ proposal }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PROPOSAL] GET error:', msg)
    return new Response(msg, { status: 500 })
  }
}
