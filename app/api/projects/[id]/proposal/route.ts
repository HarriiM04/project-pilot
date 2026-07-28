import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/projects/[id]/proposal
 * Fetch the latest proposal for a project (if any)
 * 
 * Returns: { proposal: { id, project_id, proposal_markdown, status, ... } | null }
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

    const { id: projectId } = await params

    // Verify project ownership or admin status
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
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

    // Fetch the latest proposal for this project
    const { data: proposal, error: dbError } = await supabase
      .from('proposals')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .maybeSingle()

    if (dbError) {
      console.error('[PROPOSAL FETCH] Database error:', dbError)
      return new Response('Database error', { status: 500 })
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal: proposal || null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[PROPOSAL FETCH] Server error:', msg)
    return new Response(msg, { status: 500 })
  }
}
