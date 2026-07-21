import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Settings, Users, FolderKanban } from 'lucide-react'

export const revalidate = 0

export default async function AdminPage() {
  const supabase = await createClient()
  
  // 1. Verify Authentication & Admin Status
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    redirect('/projects') // Redirect non-admins to their projects
  }

  // 2. Fetch all projects
  // We fetch all projects. Because the user is an admin, the RLS policies
  // allow them to SELECT all rows from the projects table.
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  // Also fetch all profiles to map user_ids to full_names
  const { data: profiles } = await supabase.from('profiles').select('id, full_name')
  const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Unknown User']))

  return (
    <div className="flex h-full w-full flex-col p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Oversee all client projects, review discovery chats, and manage deliverables.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-lg text-primary">
              <FolderKanban className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
              <h2 className="text-2xl font-bold">{projects?.length || 0}</h2>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-600">
              <Users className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
              <h2 className="text-2xl font-bold">{profileMap.size}</h2>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-lg text-blue-600">
              <Settings className="size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Admin Mode</p>
              <h2 className="text-2xl font-bold">Active</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-semibold">All Client Projects</h2>
        </div>
        
        {error ? (
          <div className="p-6 text-destructive text-sm">
            Failed to load projects: {error.message}
          </div>
        ) : !projects?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            No projects found on the platform yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Project Name</th>
                  <th className="px-6 py-3 font-medium">Client / User</th>
                  <th className="px-6 py-3 font-medium">Domain</th>
                  <th className="px-6 py-3 font-medium">Completeness</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {proj.title}
                    </td>
                    <td className="px-6 py-4">
                      {proj.client_name ? (
                        <span>{proj.client_name} <span className="text-muted-foreground text-xs">({profileMap.get(proj.user_id)})</span></span>
                      ) : (
                        <span className="text-muted-foreground italic">{profileMap.get(proj.user_id)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {proj.domain || 'General Software'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${Math.min(100, proj.completeness_score || 0)}%` }} 
                          />
                        </div>
                        <span className="text-xs font-mono">{proj.completeness_score || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/workspace/${proj.id}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium text-xs bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
                      >
                        Enter Workspace
                        <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
