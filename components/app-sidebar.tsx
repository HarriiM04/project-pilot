'use client'

import {
  FolderClock,
  Loader2,
  Plus,
  ShieldCheck,
  ArrowLeft,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, BrandLockup } from '@/components/brand-logo'

interface RecentProject {
  id: string
  title: string
  updated_at: string
}

interface SidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export function AppSidebar({ collapsed, onCollapse }: SidebarProps) {
  const router = useRouter()
  const params = useParams()
  const currentProjectId = params?.projectId as string | undefined

  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('is_admin').eq('id', user.id).single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))
      }
    })
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setRecentProjects((data.projects ?? []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
  }, [])

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col h-full border-r border-border bg-sidebar transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* ── Brand ── */}
      <Link
        href={isAdmin ? '/admin' : '/projects'}
        className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 transition-opacity hover:opacity-80"
      >
        {collapsed
          ? <BrandMark className="size-8 shrink-0" />
          : <BrandLockup textSize="text-sm" variant="auto" />
        }
      </Link>

      {/* ── New / Back ── */}
      <div className="p-3">
        {isAdmin ? (
          <Link href="/admin">
            <button className={cn(
              'flex w-full items-center gap-2 rounded-xl border border-border py-2 px-3 text-sm font-medium text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground cursor-pointer',
              collapsed && 'justify-center px-0'
            )}>
              <ArrowLeft className="size-4 shrink-0" />
              {!collapsed && 'Back to Dashboard'}
            </button>
          </Link>
        ) : (
          <button
            onClick={() => router.push('/projects')}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl py-2.5 px-3 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] cursor-pointer',
              collapsed && 'justify-center px-0'
            )}
            style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}
          >
            <Plus className="size-4 shrink-0" />
            {!collapsed && 'New Discovery'}
          </button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col gap-1 px-3">
        {isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <ShieldCheck className="size-4 shrink-0" />
            {!collapsed && 'All Projects'}
          </Link>
        ) : (
          <Link
            href="/projects"
            className={cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <FolderClock className="size-4 shrink-0" />
            {!collapsed && 'My Projects'}
          </Link>
        )}
      </nav>

      {/* ── Recent Projects ── */}
      {!collapsed && (
        <div className="mt-4 px-3">
          <div className="flex items-center gap-1.5 px-2.5 pb-2">
            <Zap className="size-3 text-muted-foreground" />
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Recent
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            {loadingRecent ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">No projects yet</p>
            ) : (
              recentProjects.map((p) => {
                const isActive = p.id === currentProjectId
                return (
                  <Link
                    key={p.id}
                    href={`/workspace/${p.id}`}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-all',
                      isActive
                        ? 'font-medium text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(26,35,64,0.15) 0%, rgba(45,110,245,0.15) 100%)',
                      borderLeft: '2px solid #2d6ef5',
                    } : {}}
                  >
                    <span className="truncate">{p.title || 'Untitled'}</span>
                    {isActive && (
                      <span
                        className="ml-2 shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9px] text-white"
                        style={{ background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)' }}
                      >
                        LIVE
                      </span>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>
      )}

    </aside>
  )
}
