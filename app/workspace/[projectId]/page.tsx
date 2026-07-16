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

  // Verify the project belongs to this user
  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/projects')

  return <WorkspaceShell projectId={projectId} />
}
