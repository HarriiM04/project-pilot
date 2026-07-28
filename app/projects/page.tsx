'use client'

import {
  FolderOpen,
  Loader2,
  LogOut,
  Plus,
  Sparkles,
  Trash2,
  X,
  Rocket,
  User,
  ChevronDown,
  Mail,
  Menu,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'
import { BrandLockup } from '@/components/brand-logo'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { useToast } from '@/components/toast-container'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

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

// ── User Profile Dropdown ──────────────────────────────────────────────────────
function UserProfileDropdown({
  userName,
  userEmail,
  initials,
  onLogout,
}: {
  userName: string
  userEmail: string
  initials: string
  onLogout: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 transition-all hover:bg-muted hover:border-ring/50 cursor-pointer"
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring font-mono text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        <span className="hidden sm:inline text-sm font-medium">{userName || 'User'}</span>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-border bg-background shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-ring font-mono text-sm font-bold text-white">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{userName || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Mail className="size-3" />
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
          <div className="p-1.5">
            <button
              onClick={() => {
                setIsOpen(false)
                onLogout()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Floating-Label Animated Input ─────────────────────────────────────────────
function AnimatedInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        required={required}
        className={[
          'peer w-full rounded-xl border bg-background/60 px-4 pt-5 pb-2 text-sm outline-none',
          'transition-all duration-300 placeholder-shown:pt-3.5 placeholder-shown:pb-3.5',
          focused
            ? 'border-ring ring-4 ring-ring/20'
            : 'border-border hover:border-ring/50',
        ].join(' ')}
      />
      <label
        className={[
          'pointer-events-none absolute left-4 transition-all duration-200 select-none',
          focused || hasValue
            ? 'top-1.5 text-[10px] font-semibold tracking-wide text-ring'
            : 'top-3.5 text-sm text-muted-foreground',
        ].join(' ')}
      >
        {label}
      </label>
    </div>
  )
}

// ── Animated New Project Modal ────────────────────────────────────────────────
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
  const modalRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (open && modalRef.current) {
      gsap.fromTo(modalRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.4)' }
      )
    }
  }, [open])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Rocket className="size-4 text-primary" />
            </div>
            <h2 className="font-semibold">New Discovery Project</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-muted cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive animate-in slide-in-from-top-2 fade-in duration-200">
            {error}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <AnimatedInput
            label="Project Title *"
            value={title}
            onChange={setTitle}
            placeholder="e.g. QuickBite Delivery App"
            required
          />
          <AnimatedInput
            label="Client / Company Name"
            value={clientName}
            onChange={setClientName}
            placeholder="e.g. Northwind Foods"
          />
          <AnimatedInput
            label="Domain / Industry"
            value={domain}
            onChange={setDomain}
            placeholder="e.g. Food Delivery Marketplace"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium transition-all hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full disabled:hover:scale-100 disabled:before:translate-x-0"
              style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 55%, #6b5ce7 100%)' }}
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

// ── Animated Progress Ring ────────────────────────────────────────────────────
function ProgressRing({ value }: { value: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  const ringRef = useRef<SVGCircleElement>(null)

  useGSAP(() => {
    if (ringRef.current) {
      gsap.fromTo(ringRef.current,
        { strokeDashoffset: circ },
        { strokeDashoffset: offset, duration: 1.2, ease: 'power2.out', delay: 0.2 }
      )
    }
  }, [value])

  return (
    <svg width={48} height={48} viewBox="0 0 48 48" className="shrink-0">
      <defs>
        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2d6ef5" />
          <stop offset="100%" stopColor="#6b5ce7" />
        </linearGradient>
      </defs>
      <circle cx={24} cy={24} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-muted/20" />
      <circle
        ref={ringRef}
        cx={24} cy={24} r={r} fill="none" stroke="url(#ring-grad)" strokeWidth={4}
        strokeDasharray={circ}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x={24} y={28} textAnchor="middle" fontSize={10} className="fill-foreground font-mono font-semibold">
        {value}%
      </text>
    </svg>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function ProjectsDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const headerRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/projects')
    const json = await res.json()
    setProjects(json.projects ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProjects()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? '')
      setUserName((user?.user_metadata?.full_name as string) ?? '')
    })
  }, [fetchProjects, supabase])

  // Page entrance animations
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (headerRef.current) {
      tl.fromTo(headerRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5 }
      )
    }

    if (titleRef.current) {
      tl.fromTo(titleRef.current.children,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
        '-=0.3'
      )
    }

    if (gridRef.current && !loading && projects.length > 0) {
      const cards = gridRef.current.querySelectorAll('.project-card')
      tl.fromTo(cards,
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08 },
        '-=0.2'
      )
    }
  }, [loading, projects])

  const handleCreate = (project: Project) => {
    setShowModal(false)
    router.push(`/workspace/${project.id}`)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!confirmDeleteId) return
    setDeletingId(confirmDeleteId)
    await fetch(`/api/projects/${confirmDeleteId}`, { method: 'DELETE' })
    setProjects((prev) => prev.filter((p) => p.id !== confirmDeleteId))
    setDeletingId(null)
    setConfirmDeleteId(null)
    showToast('Project deleted successfully', 'success')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowLogoutConfirm(false)
    showToast('You have been signed out successfully', 'success')
    router.push('/auth')
    router.refresh()
  }

  const initials = getInitials(userName, userEmail)

  return (
    <div className="relative flex min-h-dvh flex-col text-foreground" style={{ background: 'transparent' }}>
      {/* ── PAGE BACKGROUND – hard-coded so it always shows ── */}
      <div
        className="pointer-events-none fixed inset-0 -z-20"
        style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f5f0ff 35%, #fdf4ff 60%, #eff6ff 100%)' }}
      />
      {/* dark-mode override */}
      <div
        className="pointer-events-none fixed inset-0 -z-20 hidden dark:block"
        style={{ background: 'linear-gradient(135deg, #0d1025 0%, #100d20 35%, #130820 60%, #0a1020 100%)' }}
      />

      {/* ── GRADIENT ORBS ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        {/* top-right — electric blue */}
        <div
          className="absolute -top-32 -right-32 size-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 60% 40%, rgba(45,110,245,0.28) 0%, rgba(107,92,231,0.18) 45%, transparent 70%)',
            filter: 'blur(72px)',
            animation: 'pulse 8s ease-in-out infinite',
          }}
        />

        {/* left-center — violet */}
        <div
          className="absolute top-1/4 -left-48 size-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 40% 50%, rgba(139,92,246,0.24) 0%, rgba(45,110,245,0.16) 50%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'pulse 11s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />

        {/* bottom-center — indigo-pink */}
        <div
          className="absolute -bottom-40 left-1/3 size-[650px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 60%, rgba(236,72,153,0.14) 0%, rgba(99,102,241,0.2) 45%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'pulse 13s ease-in-out infinite',
            animationDelay: '4s',
          }}
        />

        {/* bottom-right — teal accent */}
        <div
          className="absolute bottom-0 -right-24 size-[450px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(20,184,166,0.16) 0%, rgba(45,110,245,0.12) 50%, transparent 70%)',
            filter: 'blur(64px)',
            animation: 'pulse 9s ease-in-out infinite',
            animationDelay: '6s',
          }}
        />

        {/* subtle dot-grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
      </div>
      <header
        ref={headerRef}
        className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b-2 border-border/60 px-6 backdrop-blur-xl
          bg-white/90 shadow-[0_2px_16px_rgba(0,0,0,0.06)]
          dark:bg-[rgba(15,20,45,0.92)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center gap-2.5">
          <BrandLockup textSize="text-base" variant="auto" />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserProfileDropdown
            userName={userName}
            userEmail={userEmail}
            initials={initials}
            onLogout={() => setShowLogoutConfirm(true)}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 md:px-6 py-5 md:py-12">
        <div ref={titleRef} className="mb-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              My Projects
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Each project is a living discovery session that evolves as you chat.
              Start a new project to generate BRDs, PRDs, and architecture docs with AI.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
            style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 55%, #6b5ce7 100%)' }}
          >
            <Plus className="size-4 transition-transform group-hover:rotate-90 duration-300" />
            New Project
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-ring" />
              <p className="text-sm text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-border bg-muted/20 py-24 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
              <FolderOpen className="size-10 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">No projects yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
                Create your first discovery project to start turning conversations into requirements.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="group relative mt-2 flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 55%, #6b5ce7 100%)' }}
            >
              <Plus className="size-4 transition-transform group-hover:rotate-90 duration-300" />
              Create First Project
            </button>
          </div>
        ) : (
          <div ref={gridRef} className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="project-card group relative flex cursor-pointer flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-ring/50 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-ring/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    disabled={deletingId === project.id}
                    className="absolute right-2 top-2  z-10 hidden rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 group-hover:flex cursor-pointer disabled:cursor-not-allowed"
                    title="Delete project"
                  >
                    {deletingId === project.id
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Trash2 className="size-3.5" />
                    }
                  </button>

                  <div className="relative flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-base group-hover:text-ring transition-colors">
                        {project.title}
                      </h3>
                      {project.client_name && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{project.client_name}</p>
                      )}
                    </div>
                    <ProgressRing value={completion} />
                  </div>

                  {project.domain && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-accent-foreground" />
                      <span className="truncate rounded-full border border-accent bg-accent/20 px-2.5 py-1 font-mono text-[10px] font-medium tracking-wider text-accent-foreground">
                        {project.domain.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <div className="size-1.5 rounded-full bg-chart-1" />
                      {featureCount} feature{featureCount !== 1 ? 's' : ''}
                    </span>
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

      <ConfirmationDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out? You'll need to sign in again to access your projects."
        confirmLabel="Sign Out"
        onConfirm={handleLogout}
        icon={<LogOut className="size-5 text-muted-foreground" />}
      />

      <ConfirmationDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        loading={!!deletingId}
        variant="destructive"
      />
    </div>
  )
}
