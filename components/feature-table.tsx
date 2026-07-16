'use client'

import { Check, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useDiscovery } from '@/lib/discovery-store'
import type { FeaturePriority, FeatureStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const priorityStyles: Record<FeaturePriority, string> = {
  'must-have': 'bg-accent text-accent-foreground',
  'should-have': 'bg-secondary text-secondary-foreground',
  'nice-to-have': 'bg-muted text-muted-foreground',
}

const priorityLabel: Record<FeaturePriority, string> = {
  'must-have': 'Must',
  'should-have': 'Should',
  'nice-to-have': 'Nice',
}

const statusLabel: Record<FeatureStatus, string> = {
  captured: 'Captured',
  clarifying: 'Clarifying',
  proposed: 'Proposed',
}

const statusDot: Record<FeatureStatus, string> = {
  captured: 'bg-chart-1',
  clarifying: 'bg-chart-3',
  proposed: 'bg-muted-foreground',
}

export function FeatureTable() {
  const { discovery, updateFeatureName } = useDiscovery()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startEdit = (id: string, current: string) => {
    setEditingId(id)
    setDraft(current)
  }

  const commit = () => {
    if (editingId && draft.trim()) updateFeatureName(editingId, draft.trim())
    setEditingId(null)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left">
            <th className="px-3 py-2.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground">
              FEATURE
            </th>
            <th className="px-3 py-2.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground">
              PRIORITY
            </th>
            <th className="hidden px-3 py-2.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground sm:table-cell">
              EFFORT
            </th>
            <th className="px-3 py-2.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground">
              STATUS
            </th>
          </tr>
        </thead>
        <tbody>
          {discovery.features.map((f) => (
            <tr
              key={f.id}
              className="group border-b border-border last:border-0 align-top transition-colors hover:bg-muted/30"
            >
              <td className="px-3 py-3">
                {editingId === f.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commit()}
                      onBlur={commit}
                      className="w-full rounded-md border border-ring bg-background px-2 py-1 text-sm outline-none ring-2 ring-ring/20"
                    />
                    <button
                      onClick={commit}
                      className="text-chart-1"
                      aria-label="Save feature name"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5">
                    <div>
                      <p className="font-medium text-foreground">{f.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {f.description}
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(f.id, f.name)}
                      className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      aria-label={`Edit ${f.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                )}
              </td>
              <td className="px-3 py-3">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    priorityStyles[f.priority],
                  )}
                >
                  {priorityLabel[f.priority]}
                </span>
              </td>
              <td className="hidden px-3 py-3 sm:table-cell">
                <span className="font-mono text-xs text-muted-foreground">{f.effort}</span>
              </td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                  <span className={cn('size-1.5 rounded-full', statusDot[f.status])} />
                  {statusLabel[f.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
