import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** GET /api/projects — list current user's projects */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, title, client_name, domain, created_at, updated_at, discovery_state')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ projects: data })
}

/** POST /api/projects — create a new project */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const title = (body.title as string)?.trim() || 'Untitled Project'
  const clientName = (body.client_name as string)?.trim() || ''
  const domain = (body.domain as string)?.trim() || ''

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title,
      client_name: clientName,
      domain,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ project: data }, { status: 201 })
}
