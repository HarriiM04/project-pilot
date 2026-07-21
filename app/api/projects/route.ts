import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

/** GET /api/projects — list current user's projects */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(user.id, 60, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
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

  if (!checkRateLimit(user.id, 20, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = (typeof body.title === 'string' ? body.title.replace(/\u0000/g, '').trim().substring(0, 100) : '') || 'Untitled Project'
  const clientName = (typeof body.client_name === 'string' ? body.client_name.replace(/\u0000/g, '').trim().substring(0, 100) : '')
  const domain = (typeof body.domain === 'string' ? body.domain.replace(/\u0000/g, '').trim().substring(0, 100) : '')

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
