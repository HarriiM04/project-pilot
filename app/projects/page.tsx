'use client'

import {
  FileStack,
  FolderOpen,
  Loader2,
  LogOut,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'

interface Project {
  id: string
  title: string
  client_name: string
  domain: string
  created_at: string
  updated_at: string
  discovery_state: {
    overallCompletion?: number
    features?: unknown[]
  } | null
}

function NewProjectModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (p: Project) => void
}) {
  const [title, setTitle] = useState('')
  const [clientName, setClientName] = useState('')
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Project title is required.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, client_name: clientName, domain }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      onCreate(json.project)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">New Discovery Project</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        {error && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. QuickBite Delivery App"
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Client / Company Name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Northwind Foods"
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Domain / Industry</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. Food Delivery Marketplace"
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/20"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProgressRing({ value }: { value: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" className="shrink-0">
      <circle cx={24} cy={24} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/60" />
      <circle
        cx={24} cy={24} r={r} fill="none" stroke="currentColor" strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 24 24)"
        className="text-chart-1 transition-all duration-500"
      />
      <text x={24} y={28} textAnchor="middle" fontSize={10} className="fill-foreground font-mono font-medium">
        {value}%
      </text>
    </svg>
  )
}

export default function ProjectsDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/projects')
    const json = await res.json()
    setProjects(json.projects ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '')
    })
  }, [fetchProjects, supabase.auth])

  const handleCreate = (project: Project) => {
    setShowModal(false)
    router.push(`/workspace/${project.id}`)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project and all its data? This cannot be undone.')) return
    setDeletingId(id)
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setDeletingId(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const initials = userEmail.slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileStack className="size-4" />
          </div>
          <span className="font-semibold">ProjectPilot</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
          <div className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {/* Page title */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Each project is a living discovery session that evolves as you chat.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> New Project
          </button>
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20">
            <FolderOpen className="size-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first discovery project to get started.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" /> Create First Project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const completion = project.discovery_state?.overallCompletion ?? 0
              const featureCount = project.discovery_state?.features?.length ?? 0
              const updatedAt = new Date(project.updated_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/workspace/${project.id}`)}
                  className="group relative flex cursor-pointer flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-ring/50 hover:shadow-md"
                >
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    disabled={deletingId === project.id}
                    className="absolute right-4 top-4 hidden rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 group-hover:flex"
                    title="Delete project"
                  >
                    {deletingId === project.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />
                    }
                  </button>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{project.title}</h3>
                      {project.client_name && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.client_name}</p>
                      )}
                    </div>
                    <ProgressRing value={completion} />
                  </div>

                  {project.domain && (
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3 text-accent-foreground" />
                      <span className="truncate rounded-full border border-accent bg-accent/30 px-2 py-0.5 font-mono text-[10px] tracking-wide text-accent-foreground">
                        {project.domain.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{featureCount} features</span>
                    <span>Updated {updatedAt}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <NewProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
