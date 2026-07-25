import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminProjectsClient } from './projects-client'

export const revalidate = 0

export default async function AdminProjectsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin, org_id').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/projects')

  const adminOrgId = profile.org_id

  let pq = supabase.from('projects').select('*').order('updated_at', { ascending: false })
  if (adminOrgId) pq = pq.eq('org_id', adminOrgId)
  const { data: projects } = await pq

  let prq = supabase.from('profiles').select('id, full_name, email')
  if (adminOrgId) prq = prq.eq('org_id', adminOrgId)
  const { data: profilesData } = await prq

  const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, { name: p.full_name || 'Unknown', email: p.email || '' }]))

  return <AdminProjectsClient projects={projects || []} profileMap={profileMap} />
}
