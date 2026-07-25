'use client'
'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import {
  FileText, Sparkles, CheckCircle2, CircleDashed,
  Loader2, Download, Zap, FileCheck2,
} from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Button } from '@/components/ui/button'
import { useDiscovery } from '@/lib/discovery-store'
import { cn } from '@/lib/utils'
import { SendProposalDialog } from '@/components/send-proposal-dialog'
import { useToast } from '@/components/toast-container'
import { createClient } from '@/lib/supabase/client'

gsap.registerPlugin(useGSAP)

// ── Inline markdown bold renderer ─────────────────────────────────────────────
function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={idx} className="font-semibold text-foreground print:text-black">{part.slice(2, -2)}</strong>
      : <span key={idx}>{part}</span>
  )
}

// ── Markdown → structured UI ──────────────────────────────────────────────────
function ReportContentFormatter({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const elements: ReactNode[] = []
  let tableRows: string[][] = []
  let inTable = false

  const flushTable = (key: number) => {
    const validRows = tableRows.filter(r => !r.every(c => /^[\s:-]+$/.test(c)))
    if (!validRows.length) { tableRows = []; inTable = false; return null }
    const [headers, ...body] = validRows
    const el = (
      <div key={`tbl-${key}`} className="my-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm print:overflow-visible print:border print:border-gray-300 print:shadow-none">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground"
              style={{ background: 'linear-gradient(135deg, rgba(45,110,245,0.05), rgba(107,92,231,0.05))' }}>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-3 font-semibold text-xs tracking-wider uppercase border-r border-border/40 last:border-r-0">
                  {renderInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className={cn('transition-colors hover:bg-muted/30', rIdx % 2 === 1 && 'bg-muted/15')}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 text-foreground/90 border-r border-border/40 last:border-r-0 print:text-black">
                    {renderInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableRows = []; inTable = false
    return el
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true
      tableRows.push(line.slice(1, -1).split('|').map(c => c.trim()))
      continue
    } else if (inTable) {
      const tbl = flushTable(i)
      if (tbl) elements.push(tbl)
    }
    if (!line) { elements.push(<div key={`sp-${i}`} className="h-3" />); continue }
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-2xl font-bold tracking-tight text-foreground pb-4 border-b border-border mt-2 mb-6 print:text-black">
          {renderInline(line.slice(2))}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold pt-6 pb-2 border-b border-border/60 mt-6 mb-3 print:text-black"
          style={{ color: '#2d6ef5' }}>
          {renderInline(line.slice(3))}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-foreground mt-4 mb-2 print:text-black">
          {renderInline(line.slice(4))}
        </h3>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex items-start gap-2.5 my-1.5 pl-2 text-sm text-foreground/90">
          <span className="mt-2 size-1.5 rounded-full shrink-0" style={{ background: '#2d6ef5' }} />
          <p className="flex-1 leading-relaxed">{renderInline(line.slice(2))}</p>
        </div>
      )
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed text-foreground/90 my-1.5 print:text-black">
          {renderInline(line)}
        </p>
      )
    }
  }
  if (inTable) { const tbl = flushTable(lines.length); if (tbl) elements.push(tbl) }
  return <div className="space-y-1">{elements}</div>
}

// ── Main component ─────────────────────────────────────────────────────────────
export function KickoffReportViewer() {
  const { discovery, projectId, isStreaming } = useDiscovery()
  const { showToast } = useToast()
  const [docType, setDocType] = useState<'KICKOFF' | 'BRD' | 'PRD' | 'SRS' | 'SOW'>('KICKOFF')
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const checklistRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const downloadBtnRef = useRef<HTMLButtonElement>(null)
  const downloadIconRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        .then(({ data }) => setIsAdmin(!!data?.is_admin))
    })
  }, [])

  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch(`/api/report?projectId=${projectId}&docType=${docType}`)
        if (res.ok) {
          const d = await res.json()
          setReportMarkdown(d.exists && d.report?.report_markdown ? d.report.report_markdown : null)
        }
      } catch { setReportMarkdown(null) }
    }
    void checkExisting()
  }, [projectId, docType])

  // Entrance animation on checklist
  useGSAP(() => {
    if (checklistRef.current) {
      const items = checklistRef.current.querySelectorAll('.checklist-item')
      gsap.fromTo(items,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.07, ease: 'power2.out', delay: 0.1 }
      )
    }
  }, [reportMarkdown])

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
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`)
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        setReportMarkdown(buf)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Report generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!reportMarkdown || isDownloading) return
    setIsDownloading(true)

    // Animate icon
    if (downloadIconRef.current) {
      gsap.timeline()
        .to(downloadIconRef.current, { y: 5, duration: 0.18, ease: 'power2.in' })
        .to(downloadIconRef.current, { y: -3, duration: 0.12, ease: 'power2.out' })
        .to(downloadIconRef.current, { y: 0, duration: 0.1 })
    }

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      const pageW    = doc.internal.pageSize.getWidth()
      const pageH    = doc.internal.pageSize.getHeight()
      const marginL  = 18
      const marginR  = 18
      const marginT  = 20
      const marginB  = 20
      const maxW     = pageW - marginL - marginR
      let   y        = marginT

      const addPage = () => {
        doc.addPage()
        y = marginT
      }
      const checkY = (needed: number) => {
        if (y + needed > pageH - marginB) addPage()
      }

      // Header line
      doc.setDrawColor(45, 110, 245)
      doc.setLineWidth(0.6)

      const lines = reportMarkdown.split('\n')

      for (const raw of lines) {
        const line = raw.trim()

        if (!line) { y += 4; continue }

        if (line.startsWith('# ')) {
          checkY(16)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(18)
          doc.setTextColor(26, 35, 64)
          const txt = line.slice(2)
          const split = doc.splitTextToSize(txt, maxW)
          doc.text(split, marginL, y)
          y += split.length * 9 + 2
          // Blue underline
          doc.setDrawColor(45, 110, 245)
          doc.line(marginL, y, pageW - marginR, y)
          y += 6

        } else if (line.startsWith('## ')) {
          checkY(12)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(13)
          doc.setTextColor(45, 110, 245)
          const txt = line.slice(3)
          const split = doc.splitTextToSize(txt, maxW)
          y += 4
          doc.text(split, marginL, y)
          y += split.length * 7 + 1
          doc.setDrawColor(200, 210, 240)
          doc.setLineWidth(0.3)
          doc.line(marginL, y, pageW - marginR, y)
          y += 4

        } else if (line.startsWith('### ')) {
          checkY(8)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(11)
          doc.setTextColor(26, 35, 64)
          const split = doc.splitTextToSize(line.slice(4), maxW)
          y += 2
          doc.text(split, marginL, y)
          y += split.length * 6 + 2

        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          checkY(6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(55, 65, 81)
          // Bullet dot
          doc.setFillColor(45, 110, 245)
          doc.circle(marginL + 1.5, y - 1.2, 0.9, 'F')
          const split = doc.splitTextToSize(line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1'), maxW - 6)
          doc.text(split, marginL + 5, y)
          y += split.length * 5.5 + 1

        } else {
          checkY(6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          doc.setTextColor(55, 65, 81)
          const clean = line.replace(/\*\*(.*?)\*\*/g, '$1')
          const split = doc.splitTextToSize(clean, maxW)
          doc.text(split, marginL, y)
          y += split.length * 5.5 + 1
        }
      }

      // Page numbers
      const totalPages = doc.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(150, 160, 180)
        doc.text(
          `ProjectPilot — ${discovery.projectName || ''} · ${docType}`,
          marginL, pageH - 8
        )
        doc.text(`${p} / ${totalPages}`, pageW - marginR, pageH - 8, { align: 'right' })
      }

      const filename = `${(discovery.projectName || 'ProjectPilot').replace(/[^a-zA-Z0-9-_]/g, '_')}-${docType}.pdf`
      doc.save(filename)

      showToast(`${docType} report downloaded successfully`, 'success')
    } catch (err) {
      console.error('PDF error:', err)
      showToast('Failed to generate PDF. Please try again.', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  const overallProgress = discovery.overallCompletion || 0
  const isReady = overallProgress >= 85 || (discovery.sections?.some(s => s.completion > 50) ?? false)

  const allTabs = [
    { id: 'KICKOFF', label: '15-Section Kickoff' },
    { id: 'BRD',     label: 'BRD' },
    { id: 'PRD',     label: 'PRD' },
    { id: 'SRS',     label: 'SRS' },
    { id: 'SOW',     label: 'SOW' },
  ] as const

  const docTabs = isAdmin ? allTabs : [allTabs[0]]

  return (
    <div className="relative flex h-full flex-col print:bg-white print:h-auto print:overflow-visible">

      {/* ── Download overlay ── */}
      {isDownloading && (
        <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center gap-5"
          style={{ background: 'linear-gradient(135deg, rgba(10,14,26,0.88) 0%, rgba(26,35,64,0.92) 100%)', backdropFilter: 'blur(8px)' }}>
          {/* Animated download ring */}
          <div className="relative size-20">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
              style={{ borderTopColor: '#2d6ef5', borderRightColor: '#6b5ce7', animationDuration: '0.8s' }} />
            <div className="absolute inset-4 flex items-center justify-center">
              <Download className="size-6 text-white animate-bounce" style={{ animationDuration: '1s' }} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-semibold text-white">Generating PDF…</p>
            <p className="font-mono text-[10px] tracking-widest text-white/40">PREPARING {docType} DOCUMENT</p>
          </div>
        </div>
      )}      <style>{`
        @media print {
          body, html, #__next, main, section, article {
            height: auto !important; max-height: none !important;
            overflow: visible !important; position: static !important;
            background: #fff !important; color: #000 !important;
          }
          aside, header, nav, .print-hidden, button { display: none !important; }
          #printable-report-container {
            display: block !important; width: 100% !important;
            margin: 0 !important; padding: 0 !important; overflow: visible !important;
          }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div
        ref={toolbarRef}
        className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-4 py-2.5 backdrop-blur-xl print:hidden"
      >
        {/* Tab pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {docTabs.map((tab) => {
            const active = docType === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { if (!isGenerating) setDocType(tab.id) }}
                className={cn(
                  'relative rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer',
                  active
                    ? 'text-white shadow-md shadow-ring/25 hover:shadow-lg'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                style={active ? {
                  background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)',
                } : {}}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Actions */}
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
              {/* Download icon button with animation */}
              <button
                ref={downloadBtnRef}
                onClick={handleDownload}
                disabled={isDownloading}
                title="Download as PDF"
                className={cn(
                  'relative flex size-9 items-center justify-center rounded-xl border border-border',
                  'text-muted-foreground transition-all duration-200 cursor-pointer overflow-hidden',
                  'hover:border-ring/40 hover:text-ring hover:bg-ring/5',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-ring/15 before:to-transparent before:transition-transform before:duration-500',
                  isDownloading && 'before:translate-x-full'
                )}
              >
                {isDownloading ? (
                  <Loader2 className="size-4 animate-spin text-ring" />
                ) : (
                  <Download
                    ref={downloadIconRef as React.RefObject<SVGSVGElement>}
                    className="size-4"
                  />
                )}
              </button>
            </>
          )}

          <button
            onClick={generateReport}
            disabled={isGenerating || isStreaming}
            className={cn(
              'relative flex items-center gap-1.5 overflow-hidden rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
              'before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full'
            )}
            style={{
              background: isReady && !reportMarkdown
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)',
              boxShadow: isReady && !reportMarkdown
                ? '0 4px 12px rgba(16,185,129,0.35)'
                : '0 4px 12px rgba(45,110,245,0.35)',
            }}
          >
            {isGenerating
              ? <><Loader2 className="size-3.5 animate-spin" /><span>Synthesizing…</span></>
              : reportMarkdown
              ? <><Sparkles className="size-3.5" /><span>Regenerate</span></>
              : <><Zap className="size-3.5" /><span>Generate {docType}</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div id="printable-report-container"
        className="chat-scroll flex-1 overflow-y-auto print:overflow-visible print:p-0 print:h-auto">

        {/* Error */}
        {errorMsg && (
          <div className="m-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/8 p-4 text-sm text-destructive print:hidden">
            <FileText className="size-4 shrink-0 mt-0.5" />
            <div><strong className="font-semibold">Error:</strong> {errorMsg}</div>
          </div>
        )}

        {/* Report content or synthesizing loader */}
        {reportMarkdown !== null ? (
          <div className="max-md:px-4 p-6 print:p-0">
            {isGenerating && reportMarkdown.length === 0 ? (
              /* Branded generating loader */
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="relative mb-6">
                  {/* Outer ring */}
                  <div className="size-16 rounded-full border-2 border-border" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: '#2d6ef5', borderRightColor: '#6b5ce7', animationDuration: '0.9s' }} />
                  {/* Centre glow */}
                  <div className="absolute inset-3 rounded-full animate-pulse"
                    style={{ background: 'radial-gradient(circle, rgba(45,110,245,0.25) 0%, transparent 70%)' }} />
                  <Sparkles className="absolute inset-0 m-auto size-5 text-ring" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Extracting facts &amp; structuring your {docType}…
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-xs">
                  Splicing requirements from conversation turns and attached documents.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-8 shadow-sm print:border-0 print:shadow-none print:p-0 print:bg-white">
                <ReportContentFormatter markdown={reportMarkdown} />
              </div>
            )}
          </div>
        ) : (
          /* ── Live Discovery Checklist ── */
          <div ref={checklistRef} className="mx-auto max-w-lg space-y-5 p-6 print:hidden">

            {/* Header card */}
            <div className="rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="size-5" />
                  <h4 className="font-semibold">Live Discovery Checklist</h4>
                </div>
                <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                  {docType}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-1">
                Pilot evaluates your conversation across 5 core engineering dimensions in real-time.
              </p>
              {/* Progress bar */}
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-white/60">
                <span>Discovery progress</span>
                <span>{overallProgress}%</span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5">
              {(discovery.sections || [
                { key: 'business_goals',    label: 'Business Goals & Objectives',    completion: 0 },
                { key: 'target_users',      label: 'Target Users & Persona Mapping',  completion: 0 },
                { key: 'functional_scope',  label: 'Core Functional Scope',           completion: 0 },
                { key: 'non_functional_reqs', label: 'Non-Functional Reqs & Compliance', completion: 0 },
                { key: 'constraints',       label: 'Constraints & Tech Stack Fit',    completion: 0 },
              ]).map((sec) => {
                const done    = sec.completion >= 80
                const partial = sec.completion > 0 && sec.completion < 80
                return (
                  <div
                    key={sec.key}
                    className="checklist-item flex items-center gap-3 rounded-2xl border p-4 transition-all duration-300"
                    style={done ? {
                      borderColor: 'rgba(45,110,245,0.3)',
                      background: 'linear-gradient(135deg, rgba(45,110,245,0.05), rgba(107,92,231,0.05))',
                    } : {
                      borderColor: 'var(--border)',
                      background: 'var(--card)',
                    }}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-xl',
                    )}
                      style={done
                        ? { background: 'linear-gradient(135deg, #2d6ef5, #6b5ce7)' }
                        : { background: 'var(--muted)' }
                      }
                    >
                      {done
                        ? <CheckCircle2 className="size-4 text-white" />
                        : <CircleDashed className={cn('size-4', partial ? 'text-amber-500 animate-spin' : 'text-muted-foreground')} />
                      }
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', done && 'text-foreground')}>{sec.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {done ? 'Scope clearly identified' : partial ? 'Partially discussed' : 'Not discussed yet'}
                      </p>
                    </div>

                    {/* Progress pill */}
                    <span className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-bold',
                    )}
                      style={done
                        ? { background: 'rgba(45,110,245,0.12)', color: '#2d6ef5' }
                        : partial
                        ? { background: 'rgba(245,158,11,0.12)', color: '#d97706' }
                        : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                      }
                    >
                      {sec.completion || 0}%
                    </span>
                  </div>
                )
              })}
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <p className="text-xs text-muted-foreground mb-3">
                {overallProgress >= 85
                  ? `Discovery complete — synthesize your ${docType} deliverable now.`
                  : `Chat with Pilot or attach a PDF to advance discovery for ${docType}.`
                }
              </p>
              <button
                onClick={generateReport}
                disabled={isGenerating || isStreaming}
                className="relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
                style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}
              >
                {isGenerating
                  ? <><Loader2 className="size-4 animate-spin" /><span>Generating…</span></>
                  : <><Sparkles className="size-4" /><span>Generate {docType} Now</span></>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
