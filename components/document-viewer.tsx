'use client'

import {
  Boxes,
  Download,
  FileText,
  ListChecks,
  Network,
  ScrollText,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FeatureTable } from '@/components/feature-table'
import { useDiscovery } from '@/lib/discovery-store'
import type { RequirementRow } from '@/lib/types'
import { cn } from '@/lib/utils'

type TabKey = 'features' | 'brd' | 'prd' | 'srs' | 'stories' | 'arch'

const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'features', label: 'Feature List', icon: ListChecks },
  { key: 'brd', label: 'BRD', icon: FileText },
  { key: 'prd', label: 'PRD', icon: ScrollText },
  { key: 'srs', label: 'SRS', icon: Boxes },
  { key: 'stories', label: 'User Stories', icon: Users },
  { key: 'arch', label: 'Architecture', icon: Network },
]

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-chart-1 transition-[width] duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="mb-3 font-mono text-[10px] font-medium tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  const safeItems = Array.isArray(items) ? items : []
  return (
    <ul className="space-y-2 text-sm leading-relaxed">
      {safeItems.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-chart-1" />
          <span className="text-pretty text-card-foreground">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function RequirementList({ rows }: { rows: RequirementRow[] }) {
  const safeRows = Array.isArray(rows) ? rows : []
  return (
    <div className="space-y-2">
      {safeRows.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
        >
          <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-medium text-secondary-foreground">
            {r.code}
          </span>
          <p className="flex-1 text-sm leading-relaxed text-card-foreground">{r.requirement}</p>
          <span className="hidden shrink-0 font-mono text-[10px] tracking-wide text-muted-foreground sm:inline">
            {r.category?.toUpperCase() || ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DocumentViewer() {
  const { discovery } = useDiscovery()
  const [tab, setTab] = useState<TabKey>('features')

  return (
    <section className="flex h-full flex-col bg-muted/30">
      {/* Progress header */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-3.5 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{discovery.projectName}</h2>
              <span className="rounded-full border border-accent bg-accent/40 px-2 py-0.5 font-mono text-[10px] tracking-wide text-accent-foreground">
                {discovery.clientName}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
              DISCOVERY PROGRESS · {discovery.overallCompletion}% COMPLETE
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        <div className="mt-3">
          <ProgressBar value={discovery.overallCompletion} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {(discovery.sections || []).map((s) => (
            <div key={s.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="truncate text-[11px] text-muted-foreground">{s.label}</span>
                <span className="ml-2 font-mono text-[10px] text-foreground">{s.completion}%</span>
              </div>
              <ProgressBar value={s.completion} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 overflow-x-auto border-b border-border bg-background px-2">
        <div className="flex min-w-max gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'border-chart-1 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {tab === 'features' && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Editable feature summary captured from the discovery conversation. Hover a row and
              click the pencil to rename a feature.
            </p>
            <FeatureTable />
          </div>
        )}

        {tab === 'brd' && discovery.brd && (
          <div className="space-y-4">
            <Section title="BUSINESS OBJECTIVES">
              <BulletList items={discovery.brd.objectives} />
            </Section>
            <Section title="PROJECT SCOPE">
              <BulletList items={discovery.brd.scope} />
            </Section>
            <Section title="KEY STAKEHOLDERS">
              <BulletList items={discovery.brd.stakeholders} />
            </Section>
          </div>
        )}

        {tab === 'prd' && discovery.prd && (
          <div className="space-y-4">
            <Section title="TARGET PERSONAS">
              <BulletList items={discovery.prd.personas} />
            </Section>
            <Section title="PRODUCT GOALS">
              <BulletList items={discovery.prd.goals} />
            </Section>
            <Section title="SUCCESS METRICS">
              <div className="flex flex-wrap gap-2">
                {(discovery.prd.metrics || []).map((m, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-card-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </Section>
          </div>
        )}

        {tab === 'srs' && discovery.srs && (
          <div className="space-y-4">
            <Section title="FUNCTIONAL REQUIREMENTS">
              <RequirementList rows={discovery.srs.functional} />
            </Section>
            <Section title="NON-FUNCTIONAL REQUIREMENTS">
              <RequirementList rows={discovery.srs.nonFunctional} />
            </Section>
          </div>
        )}

        {tab === 'stories' && (
          <div className="space-y-3">
            {(discovery.userStories || []).map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tracking-wide text-secondary-foreground">
                    {s.persona?.toUpperCase() || 'USER'}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {s.points} PTS
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-card-foreground">
                  <span className="text-muted-foreground">As a </span>
                  {s.persona}
                  <span className="text-muted-foreground">, I want </span>
                  {s.want}
                  <span className="text-muted-foreground"> so that </span>
                  {s.soThat}.
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'arch' && discovery.architecture && (
          <div className="space-y-4">
            <Section title="SYSTEM LAYERS">
              <div className="space-y-2">
                {(discovery.architecture.layers || []).map((l) => (
                  <div
                    key={l.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-medium text-foreground">{l.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{l.tech}</p>
                    </div>
                    <span className="text-sm leading-relaxed text-muted-foreground">{l.note}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="THIRD-PARTY INTEGRATIONS">
              <div className="flex flex-wrap gap-2">
                {(discovery.architecture.integrations || []).map((i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-card-foreground"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </section>
  )
}
