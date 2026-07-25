'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight, FolderKanban, Search,
  Clock, X, ChevronUp, ChevronDown, Globe, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  title: string
  client_name: string
  domain: string
  updated_at: string
  completeness_score?: number
  user_id: string
}

interface ProfileInfo { name: string; email: string }

type SortKey = 'title' | 'updated_at' | 'completeness_score'
type SortDir = 'asc' | 'desc'

// ── Custom domain dropdown ─────────────────────────────────────────────────────
function DomainDropdown({
  domains,
  value,
  onChange,
}: {
  domains: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const label = value === 'all' ? 'All Domains' : value

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer',
          open
            ? 'border-ring/50 bg-background ring-2 ring-ring/20 text-foreground'
            : 'border-border bg-background/80 text-muted-foreground hover:border-ring/40 hover:text-foreground'
        )}
      >
        <Globe className="size-4 shrink-0" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-50 w-52 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1.5 max-h-60 overflow-y-auto chat-scroll">
            {['all', ...domains.filter(d => d !== 'all')].map(d => {
              const active = value === d
              return (
                <button
                  key={d}
                  onClick={() => { onChange(d); setOpen(false) }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-all cursor-pointer',
                    active
                      ? 'text-white font-semibold'
                      : 'text-foreground hover:bg-muted'
                  )}
                  style={active ? { background: 'linear-gradient(135deg,#1a2340,#2d6ef5)' } : {}}
                >
                  <span className="truncate">{d === 'all' ? 'All Domains' : d}</span>
                  {active && <Check className="size-3.5 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminProjectsClient({
  projects,
  profileMap,
}: {
  projects: Project[]
  profileMap: Record<string, ProfileInfo>
}) {
  const [search,    setSearch]    = useState('')
  const [domain,    setDomain]    = useState('all')
  const [progress,  setProgress]  = useState('all')  // all | low | mid | high
  const [sortKey,   setSortKey]   = useState<SortKey>('updated_at')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')

  // Unique domains for filter dropdown
  const domains = useMemo(() => {
    const s = new Set(projects.map(p => p.domain).filter(Boolean))
    return ['all', ...Array.from(s)]
  }, [projects])

  const filtered = useMemo(() => {
    let list = [...projects]

    // Search across title, client_name, domain, user name
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.domain?.toLowerCase().includes(q) ||
        profileMap[p.user_id]?.name?.toLowerCase().includes(q) ||
        profileMap[p.user_id]?.email?.toLowerCase().includes(q)
      )
    }

    // Domain filter
    if (domain !== 'all') {
      list = list.filter(p => p.domain === domain)
    }

    // Progress filter
    if (progress !== 'all') {
      list = list.filter(p => {
        const pct = p.completeness_score || 0
        if (progress === 'low')  return pct < 33
        if (progress === 'mid')  return pct >= 33 && pct < 85
        if (progress === 'high') return pct >= 85
        return true
      })
    }

    // Sort
    list.sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (sortKey === 'completeness_score') {
        av = a.completeness_score || 0
        bv = b.completeness_score || 0
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ?  1 : -1
      return 0
    })

    return list
  }, [projects, search, domain, progress, sortKey, sortDir, profileMap])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="size-3 opacity-20" />
    return sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
  }

  const clearFilters = () => { setSearch(''); setDomain('all'); setProgress('all') }
  const hasFilters = search || domain !== 'all' || progress !== 'all'

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

      {/* Page heading */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <FolderKanban className="size-4 text-ring" />
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">All Projects</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Client Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search + filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search project, client, domain…"
            className="w-full rounded-xl border border-border bg-background/80 pl-10 pr-4 py-2.5 text-sm outline-none transition-all focus:border-ring/50 focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Domain filter — custom dropdown */}
        <DomainDropdown domains={domains} value={domain} onChange={setDomain} />

        {/* Progress filter */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-background/80 p-1">
          {[
            { v: 'all',  label: 'All' },
            { v: 'low',  label: '< 33%' },
            { v: 'mid',  label: '33–85%' },
            { v: 'high', label: '≥ 85%' },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setProgress(v)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                progress === v ? 'text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
              style={progress === v ? { background: 'linear-gradient(135deg,#1a2340,#2d6ef5)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <X className="size-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
        {!filtered.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <FolderKanban className="size-10 text-muted-foreground" />
            <p className="font-semibold">No projects match your filters</p>
            <button onClick={clearFilters} className="text-sm text-ring hover:underline cursor-pointer">Clear filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {[
                    { key: 'title',              label: 'Project' },
                    { key: null,                 label: 'Client' },
                    { key: null,                 label: 'Domain' },
                    { key: 'completeness_score', label: 'Progress' },
                    { key: 'updated_at',         label: 'Updated' },
                    { key: null,                 label: 'Action', right: true },
                  ].map(({ key, label, right }) => (
                    <th
                      key={label}
                      className={cn('px-6 py-3', right && 'text-right', key && 'cursor-pointer select-none hover:text-foreground')}
                      onClick={key ? () => toggleSort(key as SortKey) : undefined}
                    >
                      <span className="flex items-center gap-1 w-fit">
                        {label}
                        {key && <SortIcon col={key as SortKey} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map(proj => {
                  const pct       = Math.min(100, proj.completeness_score || 0)
                  const updatedAt = new Date(proj.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const user      = profileMap[proj.user_id]

                  return (
                    <tr key={proj.id} className="group transition-colors hover:bg-muted/20">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{proj.title || 'Untitled'}</p>
                      </td>
                      <td className="px-6 py-4">
                        {proj.client_name ? (
                          <div>
                            <p className="font-medium">{proj.client_name}</p>
                            <p className="text-xs text-muted-foreground">{user?.name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{user?.name || '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {proj.domain ? (
                          <span className="rounded-full border whitespace-nowrap border-ring/20 bg-ring/8 px-2.5 py-1 font-mono text-[10px] tracking-wide text-ring">
                            {proj.domain.toUpperCase()}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct >= 85 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#2d6ef5,#6b5ce7)' }} />
                          </div>
                          <span className="font-mono text-xs text-muted-foreground w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />{updatedAt}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/workspace/${proj.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer"
                          style={{ background: 'linear-gradient(135deg,#1a2340,#2d6ef5)' }}
                        >
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
