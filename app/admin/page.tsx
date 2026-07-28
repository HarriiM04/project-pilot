import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FolderKanban, Users, ShieldCheck, TrendingUp, Clock, Sparkles } from 'lucide-react'

export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin, org_id').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/projects')

  const adminOrgId = profile.org_id

  let pq = supabase.from('projects').select('*').order('updated_at', { ascending: false })
  if (adminOrgId) pq = pq.eq('org_id', adminOrgId)
  const { data: projects } = await pq

  let prq = supabase.from('profiles').select('id, full_name, email')
  if (adminOrgId) prq = prq.eq('org_id', adminOrgId)
  const { data: profiles } = await prq
  const profileMap = new Map((profiles || []).map(p => [p.id, { name: p.full_name || 'Unknown', email: p.email || '' }]))

  let orgName = 'All Organizations'
  if (adminOrgId) {
    const { data: org } = await supabase.from('organizations').select('name').eq('id', adminOrgId).single()
    orgName = org?.name || 'Your Organization'
  }

  const total   = projects?.length || 0
  const avgComp = total
    ? Math.round((projects || []).reduce((s, p) => s + (p.completeness_score || 0), 0) / total)
    : 0
  const recent  = (projects || []).slice(0, 5)

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto w-full space-y-8">

      {/* Ambient gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 size-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(45,110,245,0.10) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 size-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(107,92,231,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Page heading */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck className="size-4 text-ring" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Admin Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Managing <span className="font-semibold text-foreground">{orgName}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: FolderKanban, label: 'Total Projects', value: total,        color: '#2d6ef5', bg: 'rgba(45,110,245,0.10)' },
          { icon: Users,        label: 'Total Clients',  value: profileMap.size, color: '#6b5ce7', bg: 'rgba(107,92,231,0.10)' },
          { icon: TrendingUp,   label: 'Avg Completion', value: `${avgComp}%`, color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
          { icon: ShieldCheck,  label: 'Admin Mode',     value: 'Active',       color: '#f59e0b', bg: 'rgba(245,158,11,0.10)' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: s.bg }}>
                <s.icon className="size-5" style={{ color: s.color }} />
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent projects */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60"
          style={{ background: 'linear-gradient(135deg, rgba(45,110,245,0.04), rgba(107,92,231,0.04))' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-ring" />
            <h2 className="font-semibold">Recent Projects</h2>
          </div>
          <Link href="/admin/projects"
            className="flex items-center gap-1 text-xs font-medium text-ring hover:underline cursor-pointer">
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {!recent.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FolderKanban className="size-10 text-muted-foreground" />
            <p className="font-semibold">No projects yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">Project</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Progress</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recent.map(proj => {
                  const pct = Math.min(100, proj.completeness_score || 0)
                  const updatedAt = new Date(proj.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  return (
                    <tr key={proj.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4 font-semibold">{proj.title || 'Untitled'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{profileMap.get(proj.user_id)?.email || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct >= 85 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#2d6ef5,#6b5ce7)' }} />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{updatedAt}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/workspace/${proj.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:scale-[1.02] cursor-pointer"
                          style={{ background: 'linear-gradient(135deg,#1a2340,#2d6ef5)' }}>
                          Open <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
