'use client'

import { useState, useEffect, ReactNode } from 'react'
import { FileText, Sparkles, CheckCircle2, CircleDashed, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDiscovery } from '@/lib/discovery-store'
import { cn } from '@/lib/utils'
import { SendProposalDialog } from '@/components/send-proposal-dialog'
import { createClient } from '@/lib/supabase/client'

// Helper to format inline markdown like **bold** text
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-semibold text-foreground print:text-black">{part.slice(2, -2)}</strong>
    }
    return <span key={idx}>{part}</span>
  })
}

// Custom Markdown Renderer that converts raw markdown into executive structured UI
function ReportContentFormatter({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const elements: ReactNode[] = []
  let tableRows: string[][] = []
  let inTable = false

  const flushTable = (keyPrefix: number) => {
    if (tableRows.length === 0) return null
    // Filter out separator lines like |---|---|
    const validRows = tableRows.filter(row => !row.every(cell => /^[\s:-]+$/.test(cell)))
    if (validRows.length === 0) return null

    const headers = validRows[0] || []
    const bodyRows = validRows.slice(1)

    const tableEl = (
      <div key={`tbl-${keyPrefix}`} className="my-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm print:overflow-visible print:border print:border-gray-300 print:shadow-none">
        <table className="w-full border-collapse text-left text-sm print:text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-muted-foreground print:bg-gray-100 print:text-black">
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 font-semibold tracking-wider text-xs uppercase border-r border-border/40 last:border-r-0 print:border-gray-300">
                  {renderInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 print:divide-gray-200">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className={cn("transition-colors hover:bg-muted/30", rIdx % 2 === 1 && "bg-muted/15 print:bg-gray-50")}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 text-foreground/90 border-r border-border/40 last:border-r-0 print:border-gray-300 print:text-black">
                    {renderInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []
    inTable = false
    return tableEl
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.trim()

    // Table row check
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true
      const cells = line
        .slice(1, -1)
        .split('|')
        .map(c => c.trim())
      tableRows.push(cells)
      continue
    } else if (inTable) {
      const tbl = flushTable(i)
      if (tbl) elements.push(tbl)
    }

    if (!line) {
      elements.push(<div key={`spacer-${i}`} className="h-3 print:h-2" />)
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold tracking-tight text-foreground pb-4 border-b border-border mt-2 mb-6 print:text-2xl print:pb-3 print:text-black">
          {renderInline(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-primary pt-6 pb-2 border-b border-border/60 mt-6 mb-3 print:text-lg print:pt-4 print:text-black print:break-inside-avoid">
          {renderInline(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-foreground mt-4 mb-2 print:text-base print:text-black">
          {renderInline(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-sm text-foreground/90 print:text-black">
          <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0 print:bg-black" />
          <p className="flex-1 leading-relaxed">{renderInline(line.slice(2))}</p>
        </div>
      )
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed text-foreground/90 my-1.5 print:text-black">
          {renderInline(line)}
        </p>
      )
    }
  }

  if (inTable) {
    const tbl = flushTable(lines.length)
    if (tbl) elements.push(tbl)
  }

  return <div className="space-y-1">{elements}</div>
}

export function KickoffReportViewer() {
  const { discovery, projectId, isStreaming } = useDiscovery()
  const [docType, setDocType] = useState<'KICKOFF' | 'BRD' | 'PRD' | 'SRS' | 'SOW'>('KICKOFF')
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin status
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('is_admin').eq('id', user.id).single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))
      }
    })
  }, [])

  // Check if a report was already generated for this project and docType
  useEffect(() => {
    async function checkExistingReport() {
      try {
        const res = await fetch(`/api/report?projectId=${projectId}&docType=${docType}`)
        if (res.ok) {
          const data = await res.json()
          if (data.exists && data.report?.report_markdown) {
            setReportMarkdown(data.report.report_markdown)
          } else {
            setReportMarkdown(null)
          }
        }
      } catch {
        setReportMarkdown(null)
      }
    }
    void checkExistingReport()
  }, [projectId, docType])

  const generateReport = async () => {
    setIsGenerating(true)
    setErrorMsg(null)
    setReportMarkdown('')

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, docType }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      if (!res.body) throw new Error('No response stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        setReportMarkdown(buffer)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Report generation failed'
      setErrorMsg(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const overallProgress = discovery.overallCompletion || 0
  const isReadyForReport = overallProgress >= 85 || (discovery.sections && discovery.sections.some(s => s.completion > 50))

  const allTabs = [
    { id: 'KICKOFF', label: '15-Section Kickoff' },
    { id: 'BRD', label: 'BRD (Business)' },
    { id: 'PRD', label: 'PRD (Product)' },
    { id: 'SRS', label: 'SRS (Technical)' },
    { id: 'SOW', label: 'SOW (Scope)' },
  ] as const

  const docTabs = isAdmin ? allTabs : [allTabs[0]]

  return (
    <div className="flex h-full flex-col bg-card/40 print:bg-white print:h-auto print:overflow-visible">
      {/* Global print stylesheet to force full multi-page document expansion without clipping */}
      <style jsx global>{`
        @media print {
          body, html, #__next, main, section, article {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            background: #fff !important;
            color: #000 !important;
          }
          aside, header, nav, .print\\:hidden, [data-sidebar], button {
            display: none !important;
          }
          #printable-report-container {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>

      {/* Top action & doc switcher bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {docTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (docType !== tab.id && !isGenerating) {
                  setDocType(tab.id)
                }
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0',
                docType === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {reportMarkdown && (
            <>
              {isAdmin && (
                <SendProposalDialog 
                  projectId={projectId} 
                  reportMarkdown={reportMarkdown} 
                  projectName={discovery.clientName || 'ProjectPilot Client'}
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 px-2.5 text-xs font-medium print:hidden"
                title="Print or Save to PDF"
              >
                <Printer className="size-3.5" />
                <span>Export {docType} PDF</span>
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={generateReport}
            disabled={isGenerating || isStreaming}
            className={cn(
              "h-8 gap-1.5 px-3 text-xs font-medium print:hidden",
              isReadyForReport && !reportMarkdown
                ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                : ""
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Synthesizing {docType}...</span>
              </>
            ) : reportMarkdown ? (
              <>
                <Sparkles className="size-3.5" />
                <span>Regenerate {docType}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>Generate {docType}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div id="printable-report-container" className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0 print:h-auto">
        {errorMsg && (
          <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive print:hidden">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}

        {/* If synthesizing or report exists, show formatted JSX report */}
        {reportMarkdown !== null ? (
          <div className="prose prose-sm max-w-none dark:prose-invert print:text-black">
            {isGenerating && reportMarkdown.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center print:hidden">
                <Loader2 className="size-8 animate-spin text-primary mb-3" />
                <p className="text-sm font-medium">Extracting facts & structuring your {docType} specification...</p>
                <p className="text-xs text-muted-foreground mt-1">Splicing requirements from conversation turns and attached documents.</p>
              </div>
            )}
            <div className="rounded-xl border border-border bg-card p-8 shadow-sm print:border-0 print:shadow-none print:p-0 print:bg-white">
              <ReportContentFormatter markdown={reportMarkdown} />
            </div>
          </div>
        ) : (
          /* Live 5-Pillar Checklist while discovery is active (<85%) */
          <div className="mx-auto max-w-xl space-y-6 py-6 print:hidden">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-base font-semibold">Live Discovery Checklist</h4>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                  Target: {docType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Pilot is actively evaluating your conversation and uploaded documents across 5 core engineering dimensions.
              </p>

              <div className="space-y-4">
                {(discovery.sections || [
                  { key: 'business_goals', label: 'Business Goals & Objectives', completion: 0 },
                  { key: 'target_users', label: 'Target Users & Persona Mapping', completion: 0 },
                  { key: 'functional_scope', label: 'Core Functional Scope', completion: 0 },
                  { key: 'non_functional_reqs', label: 'Non-Functional Reqs & Compliance', completion: 0 },
                  { key: 'constraints', label: 'Constraints & Tech Stack Fit', completion: 0 },
                ]).map((sec) => {
                  const isClear = sec.completion >= 80
                  const isPartial = sec.completion > 0 && sec.completion < 80
                  return (
                    <div key={sec.key} className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 p-3.5">
                      <div className="flex items-center gap-3">
                        {isClear ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : (
                          <CircleDashed className={cn(
                            "size-4 shrink-0",
                            isPartial ? "text-amber-500 animate-spin" : "text-muted-foreground"
                          )} />
                        )}
                        <div>
                          <p className="text-sm font-medium">{sec.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {isClear ? 'Scope clearly identified' : isPartial ? 'Partially discussed' : 'Not discussed yet'}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "font-mono text-xs font-semibold px-2 py-0.5 rounded-full",
                        isClear ? "bg-emerald-500/10 text-emerald-500" : isPartial ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                      )}>
                        {sec.completion || 0}%
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                <p className="text-xs font-medium text-primary mb-2">
                  {overallProgress >= 85
                    ? `Discovery is complete! You can synthesize your comprehensive ${docType} deliverable now.`
                    : `Continue chatting with Pilot or attach a specification PDF to advance the progress bar for ${docType}.`}
                </p>
                <Button
                  size="sm"
                  onClick={generateReport}
                  className="w-full gap-1.5 text-xs font-semibold mt-2"
                >
                  <Sparkles className="size-3.5" />
                  <span>Generate {docType} Now</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
