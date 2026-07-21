'use client'

import {
  Compass,
  FileStack,
  FolderClock,
  LayoutTemplate,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface RecentProject {
  id: string
  title: string
  updated_at: string
}

export function AppSidebar() {
  const router = useRouter()
  const params = useParams()
  const currentProjectId = params?.projectId as string | undefined

  const [collapsed, setCollapsed] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    
    // Check if user is admin
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))
      }
    })
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        const projects = (data.projects ?? []) as RecentProject[]
        setRecentProjects(projects.slice(0, 5)) // show last 5
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false))
  }, [])

  const nav = [
    { label: 'Dashboard', icon: Compass, href: '/projects', disabled: false },
    { label: 'Recent Projects', icon: FolderClock, href: '/projects', disabled: false },
    { label: 'Templates', icon: LayoutTemplate, href: '#', disabled: true },
    { label: 'Settings', icon: Settings, href: '#', disabled: true },
  ]
  
  if (isAdmin) {
    nav.splice(1, 0, { label: 'Admin Panel', icon: Settings, href: '/admin', disabled: false })
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Brand */}
      <Link href="/projects" className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 transition-opacity hover:opacity-80">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileStack className="size-4" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-sidebar-accent-foreground">
              ProjectPilot
            </span>
            <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
              AI PRE-SALES
            </span>
          </div>
        )}
      </Link>

      {/* New project & Admin back button */}
      <div className="p-3 flex flex-col gap-2">
        {isAdmin && (
          <Link href="/admin">
            <Button
              className={cn('w-full bg-primary/20 text-primary hover:bg-primary/30', collapsed && 'px-0')}
              size="sm"
            >
              <Settings className="size-4 mr-2" />
              {!collapsed && 'Admin Dashboard'}
            </Button>
          </Link>
        )}
        <Button
          className={cn('w-full', collapsed && 'px-0')}
          size="sm"
          onClick={() => router.push('/projects')}
        >
          <Plus className={isAdmin && !collapsed ? "mr-2" : ""} />
          {!collapsed && 'New discovery'}
        </Button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={item.disabled ? (e) => e.preventDefault() : undefined}
            className={cn(
              'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              item.disabled
                ? 'opacity-50 pointer-events-none cursor-not-allowed text-muted-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </div>
            {!collapsed && item.disabled && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[8px] text-muted-foreground">
                SOON
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Recent projects */}
      {!collapsed && (
        <div className="mt-6 px-3">
          <p className="px-2.5 pb-2 font-mono text-[10px] tracking-wider text-muted-foreground">
            RECENT PROJECTS
          </p>
          <div className="flex flex-col gap-0.5">
            {loadingRecent ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : recentProjects.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">No projects yet</p>
            ) : (
              recentProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/workspace/${p.id}`}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                    p.id === currentProjectId && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  )}
                >
                  <span className="truncate">{p.title || 'Untitled'}</span>
                  <span className="ml-2 shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground">
                    {p.id === currentProjectId ? 'Active' : ''}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="mt-auto p-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full text-muted-foreground', collapsed ? 'px-0' : 'justify-start')}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed && 'Collapse'}
        </Button>
      </div>
    </aside>
  )
}
