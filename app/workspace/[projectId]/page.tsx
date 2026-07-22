import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkspaceShell } from '@/components/workspace'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function WorkspacePage({ params }: Props) {
  const { projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = !!profile?.is_admin

  // Verify the project exists
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, user_id')
    .eq('id', projectId)
    .single()

  if (!project) redirect('/projects')
  
  // If not admin and not the owner, deny access
  if (!isAdmin && project.user_id !== user.id) {
    redirect('/projects')
  }

  return <WorkspaceShell projectId={projectId} />
}
