'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import {
  FileText, Sparkles, CheckCircle2, CircleDashed,
  Loader2, Download, Zap, FileCheck2, Edit3, Send,
} from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Button } from '@/components/ui/button'
import { useDiscovery } from '@/lib/discovery-store'
import { cn, parseAgencyDetails, type AgencyDetails } from '@/lib/utils'
import { SendProposalDialog } from '@/components/send-proposal-dialog'
import { ProposalEditor } from '@/components/proposal-editor'
import { SendProposalConfirmation } from '@/components/send-proposal-confirmation'
import { useToast } from '@/components/toast-container'
import { createClient } from '@/lib/supabase/client'
import type { SendProposalData } from '@/lib/discovery-store'

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
  const rawLines = markdown.split('\n')
  const lines: string[] = []
  let prevEmpty = false
  for (let raw of rawLines) {
    // Decode HTML entities first
    const decodedRaw = decodeHtmlEntities(raw)
    let cleanRaw = decodedRaw.replace(/<br\s*\/?>/gi, '')
    let trimmed = cleanRaw.trim()
    if (trimmed === '') {
      if (!prevEmpty) {
        lines.push('')
        prevEmpty = true
      }
    } else {
      lines.push(cleanRaw)
      prevEmpty = false
    }
  }

  const elements: ReactNode[] = []
  let tableRows: string[][] = []
  let inTable = false

  const flushTable = (key: number) => {
    const validRows = tableRows.filter(r => !r.every(c => /^[\s:-]+$/.test(c)))
    if (!validRows.length) { tableRows = []; inTable = false; return null }
    const [headers, ...body] = validRows

    // Render single-row tables as clean bold labels + vertical lists in the preview UI
    if (body.length <= 1) {
      const row = body[0] || []
      const el = (
        <div key={`tbl-${key}`} className="my-4 space-y-2.5 pl-3 border-l-2 border-primary/25 bg-muted/5 py-1">
          {headers.map((h, i) => {
            const cellVal = row[i] || ''
            if (!cellVal) return null

            if (cellVal.includes('•')) {
              const parts = cellVal.split('•').map(p => p.trim()).filter(Boolean)
              return (
                <div key={i} className="text-sm">
                  <strong className="font-semibold text-foreground block mb-1">{h}:</strong>
                  <div className="space-y-1 pl-2">
                    {parts.map((p, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/80">
                        <span className="mt-1.5 size-1 rounded-full shrink-0" style={{ background: '#2d6ef5' }} />
                        <p className="flex-1 leading-relaxed">{renderInline(p)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">
                <strong className="font-semibold text-foreground mr-1.5">{h}:</strong>
                {renderInline(cellVal)}
              </p>
            )
          })}
        </div>
      )
      tableRows = []; inTable = false
      return el
    }

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

    // Support horizontal dividers ---
    if (/^[-*_]{3,}$/.test(line)) {
      elements.push(<hr key={i} className="my-6 border-border print:border-gray-300" />)
      continue
    }

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

// ── Document Control Constants & Helpers ─────────────────────────────────────
interface DocMetadata {
  version: string
  status: 'Draft' | 'Approved' | 'Submitted'
  date: string
  previously_submitted?: boolean
  version_history: Array<{
    version: string
    date: string
    changeSummary: string
    status: string
  }>
}

const toCamelCase = (str: string): string => {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
}

// Decode HTML entities to plain text - works in both browser and server contexts
function decodeHtmlEntities(text: string): string {
  if (typeof window !== 'undefined') {
    // Browser: use textarea trick
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  } else {
    // Server/SSR: use basic string replacement
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }
}

// Convert special characters to PDF-friendly ASCII equivalents
// This runs ONLY on PDF output - the HTML preview keeps original characters
function sanitizeForPDF(text: string): string {
  return text
    // Replace arrows with ASCII equivalents (critical for jsPDF compatibility)
    .replace(/\s*→\s*/g, ' -> ')        // Right arrow: → becomes ->
    .replace(/\s*←\s*/g, ' <- ')        // Left arrow: ← becomes <-
    .replace(/\s*↓\s*/g, ' [down] ')    // Down arrow
    .replace(/\s*↑\s*/g, ' [up] ')      // Up arrow
    .replace(/\s*↔\s*/g, ' <-> ')       // Bidirectional arrow
    // Replace other problematic Unicode with ASCII safe equivalents
    .replace(/\s*–\s*/g, '-')           // En dash: – becomes -
    .replace(/\s*—\s*/g, '-')           // Em dash: — becomes -
    .replace(/\s*•\s*/g, '* ')          // Bullet: • becomes *
    .replace(/\s*°\s*/g, ' deg ')       // Degree symbol
    .replace(/\s*±\s*/g, ' +/- ')       // Plus/minus
    .replace(/\s*×\s*/g, ' x ')         // Multiplication sign
    .replace(/\s*÷\s*/g, ' / ')         // Division sign
    .replace(/\s*≈\s*/g, ' approx ')    // Approximately
    .replace(/\s*≠\s*/g, ' != ')        // Not equal
    .replace(/\s*≤\s*/g, ' <= ')        // Less than or equal
    .replace(/\s*≥\s*/g, ' >= ')        // Greater than or equal
    .replace(/'/g, "'")                 // Curly left single quote to straight
    .replace(/'/g, "'")                 // Curly right single quote to straight
    .replace(/"/g, '"')                 // Curly left double quote to straight
    .replace(/"/g, '"')                 // Curly right double quote to straight
    .replace(/…/g, '...')               // Ellipsis: … becomes ...
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

const docTypeMap: Record<string, string> = {
  KICKOFF: 'Requirement Summary',
  BRD: 'Business Requirements Document',
  PRD: 'Product Requirements Document',
  SRS: 'Software Requirements Specification',
  SOW: 'Proposed Scope of Work',
  PROPOSAL: 'Proposal Draft',
}

const LOGO_SVG = `
<svg width="220" height="60" viewBox="0 0 220 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="plane-top" x1="5" y1="95" x2="65" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1d4ed8" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>
    <linearGradient id="plane-bot" x1="5" y1="65" x2="45" y2="55" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#312e81" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>
  </defs>
  <g transform="scale(0.48)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M 8 5 L 8 108 L 26 108 L 26 72 L 36 72 C 62 72 76 58 76 40 C 76 22 62 5 36 5 Z M 26 20 L 36 20 C 52 20 60 28 60 40 C 60 52 52 60 36 60 L 26 60 Z" fill="#1a2340"/>
    <path d="M 68 28 L 6 105 L 32 72 Z" fill="url(#plane-top)"/>
    <path d="M 68 28 L 6 62 L 32 72 Z" fill="url(#plane-bot)"/>
    <path d="M 6 105 L 32 72 L 6 62 Z" fill="#1e1b4b" opacity="0.9"/>
  </g>
  <text x="52" y="32" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20" fill="#1a2340">Project</text>
  <text x="122" y="32" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="20" fill="#2d6ef5">Pilot</text>
  <text x="52" y="45" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="6" fill="#9ca3af" letter-spacing="1.5">AI PRE-SALES ENGINEER</text>
</svg>
`

function getLogoBase64(): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG)
    img.src = svgUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 440 // crisp double size
      canvas.height = 120
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(2, 2)
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } else {
        resolve('')
      }
    }
    img.onerror = () => resolve('')
  })
}

function formatDate(date: Date): string {
  const day = date.getDate()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

function HTMLMetadataTable({
  projectName,
  version,
  date,
  status,
  clientName,
}: {
  projectName: string
  version: string
  date: string
  status: string
  clientName: string
}) {
  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-border bg-muted/15 shadow-sm max-w-2xl print:max-w-full">
      <div className="bg-muted/40 px-4 py-2 border-b border-border">
        <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">Document Control</h3>
      </div>
      <table className="w-full text-left text-sm border-collapse">
        <tbody className="divide-y divide-border">
          <tr>
            <td className="px-4 py-2 font-semibold text-xs text-muted-foreground w-1/3 bg-muted/5 print:bg-gray-50">Project Name</td>
            <td className="px-4 py-2 font-medium text-foreground print:text-black">{projectName}</td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-semibold text-xs text-muted-foreground bg-muted/5 print:bg-gray-50">Document Version</td>
            <td className="px-4 py-2 font-medium text-foreground print:text-black">v{version}</td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-semibold text-xs text-muted-foreground bg-muted/5 print:bg-gray-50">Date</td>
            <td className="px-4 py-2 font-medium text-foreground print:text-black">{date}</td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-semibold text-xs text-muted-foreground bg-muted/5 print:bg-gray-50">Status</td>
            <td className="px-4 py-2 font-medium">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold print:px-0 print:bg-transparent print:text-black",
                status === 'Approved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                {status}
              </span>
            </td>
          </tr>
          <tr>
            <td className="px-4 py-2 font-semibold text-xs text-muted-foreground bg-muted/5 print:bg-gray-50">Client</td>
            <td className="px-4 py-2 font-medium text-foreground print:text-black">{clientName}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function HTMLVersionHistoryTable({ history }: { history: any[] }) {
  if (!history || history.length === 0) return null
  return (
    <div className="mt-12 pt-8 border-t border-border print:border-gray-300">
      <h3 className="text-sm font-bold tracking-tight text-foreground mb-4 print:text-black">Document Version History</h3>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm print:shadow-none print:border-gray-300">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-semibold print:bg-gray-100 print:text-black print:border-gray-300">
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Change Summary</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground/90 print:divide-gray-300">
            {history.map((h, i) => (
              <tr key={i} className="hover:bg-muted/30 print:hover:bg-transparent">
                <td className="px-4 py-2.5 font-semibold text-xs print:text-black">v{h.version}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground print:text-black">{h.date}</td>
                <td className="px-4 py-2.5 text-xs print:text-black">{h.changeSummary}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold print:px-0 print:bg-transparent print:text-black",
                    h.status === 'Approved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {h.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function KickoffReportViewer() {
  const { discovery, projectId, isStreaming, messages, proposalId, proposalDraft, proposalStatus, isGeneratingProposal, isSendingProposal, generateProposal, updateProposalDraft, sendProposal } = useDiscovery()
  const { showToast } = useToast()
  const [docType, setDocType] = useState<'KICKOFF' | 'BRD' | 'PRD' | 'SRS' | 'SOW' | 'PROPOSAL'>('KICKOFF')
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null)
  const [docMetadata, setDocMetadata] = useState<DocMetadata | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [agencyBranding, setAgencyBranding] = useState<AgencyDetails | null>(null)
  const [showSendProposalConfirmation, setShowSendProposalConfirmation] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function loadBranding() {
      try {
        const { data: proj } = await supabase.from('projects').select('org_id').eq('id', projectId).single()
        let adminData = null
        if (proj?.org_id) {
          const { data } = await supabase.from('profiles').select('*').eq('org_id', proj.org_id).eq('is_admin', true).limit(1).maybeSingle()
          adminData = data
        } else {
          const { data } = await supabase.from('profiles').select('*').eq('is_admin', true).limit(1).maybeSingle()
          adminData = data
        }
        setAgencyBranding(parseAgencyDetails(adminData))
      } catch (err) {
        console.error(err)
      }
    }
    void loadBranding()
  }, [projectId])
  const checklistRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const downloadBtnRef = useRef<HTMLButtonElement>(null)
  const downloadIconRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '')
        supabase.from('profiles').select('is_admin').eq('id', user.id).single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function checkExisting() {
      // Skip API call for PROPOSAL tab - it has its own data source
      if (docType === 'PROPOSAL') {
        setReportMarkdown(null)
        setDocMetadata(null)
        return
      }

      try {
        const res = await fetch(`/api/report?projectId=${projectId}&docType=${docType}`)
        if (res.ok && !cancelled) {
          const d = await res.json()
          if (d.exists && d.report?.report_markdown) {
            setReportMarkdown(d.report.report_markdown)
            setDocMetadata(d.report.metadata || null)
          } else {
            setReportMarkdown(null)
            setDocMetadata(null)
          }
        }
      } catch {
        if (!cancelled) {
          setReportMarkdown(null)
          setDocMetadata(null)
        }
      }
    }
    void checkExisting()
    return () => { cancelled = true }
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

  const generateReport = async (changeSummary?: string) => {
    setIsGenerating(true)
    setErrorMsg(null)
    setReportMarkdown('')
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, docType, changeSummary }),
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

      const checkRes = await fetch(`/api/report?projectId=${projectId}&docType=${docType}`)
      if (checkRes.ok) {
        const d = await checkRes.json()
        if (d.exists && d.report) {
          setDocMetadata(d.report.metadata || null)
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Report generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  // Detect confirmation of requirements
  const hasClientConfirmed = messages.some((msg) => {
    if (msg.role !== 'user') return false
    const text = msg.content.toLowerCase()
    return (
      text.includes('yes this is correct') ||
      text.includes('yes, this is correct') ||
      text.includes('looks good') ||
      text.includes('confirmed') ||
      text.includes('looks correct') ||
      text.includes('is correct')
    )
  })

  // Listen to trigger-summary-regen event to update summary on-demand
  useEffect(() => {
    const handleTriggerRegen = () => {
      void generateReport()
    }
    window.addEventListener('trigger-summary-regen', handleTriggerRegen)
    return () => {
      window.removeEventListener('trigger-summary-regen', handleTriggerRegen)
    }
  }, [projectId, docType])

  // Synchronize report metadata (e.g. status) when chat finishes streaming
  const prevStreamingRef = useRef(isStreaming)
  useEffect(() => {
    if (!isStreaming && prevStreamingRef.current) {
      async function reloadMeta() {
        try {
          const res = await fetch(`/api/report?projectId=${projectId}&docType=${docType}`)
          if (res.ok) {
            const d = await res.json()
            if (d.exists && d.report) {
              setDocMetadata(d.report.metadata || null)
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
      void reloadMeta()
    }
    prevStreamingRef.current = isStreaming
  }, [isStreaming, projectId, docType])

  const handleRegenerateClick = async () => {
    // For PROPOSAL tab, generate proposal instead of report
    if (docType === 'PROPOSAL') {
      await handleGenerateProposal()
      return
    }

    if (docMetadata?.status === 'Approved') {
      const parts = (docMetadata.version || '1.0').split('.')
      let nextVer = '1.1'
      if (parts.length === 2) {
        nextVer = `${parts[0]}.${parseInt(parts[1], 10) + 1}`
      }
      const summary = window.prompt(
        `This document is currently Approved. Regenerating will create a new Draft version (v${nextVer}). Please enter a summary of the changes you are requesting:`
      )
      if (summary === null) return // user clicked cancel
      await generateReport(summary || 'Refinement based on feedback')
    } else {
      await generateReport()
    }
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const res = await fetch('/api/report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, docType })
      })
      if (!res.ok) throw new Error(await res.text() || 'Failed to approve report')

      const d = await res.json()
      if (d.success) {
        setDocMetadata(d.report.metadata || null)
        showToast(`${docTypeMap[docType] || 'Report'} approved successfully!`, 'success')
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to approve report. Please try again.', 'error')
    } finally {
      setIsApproving(false)
    }
  }

  const handleEditRequirements = () => {
    setReportMarkdown(null)
  }

  const handleSubmitToAgency = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/report', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, docType: 'KICKOFF', status: 'Submitted' })
      })
      if (!res.ok) throw new Error(await res.text() || 'Failed to submit requirements')

      const d = await res.json()
      if (d.success) {
        setDocMetadata(d.report.metadata || null)
        showToast('Requirements summary submitted to agency!', 'success')
      }
    } catch (err) {
      console.error(err)
      showToast('Failed to submit requirements. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateProposal = async () => {
    try {
      // Check all three required docs exist before attempting generation
      // The generate route requires BRD, PRD, and SOW from extracted_json.docs
      const missing: string[] = []
      for (const doc of ['BRD', 'PRD', 'SOW'] as const) {
        const res = await fetch(`/api/report?projectId=${projectId}&docType=${doc}`)
        const data = await res.json()
        if (!data.exists) missing.push(doc)
      }

      if (missing.length > 0) {
        showToast(
          `Missing requirements: Please generate ${missing.join(', ')} first before creating a proposal draft.`,
          'error'
        )
        return
      }

      await generateProposal()
      showToast('Proposal draft generated and ready for editing', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate proposal'
      console.error('Proposal generation error:', err)

      // Show user-friendly error message
      showToast(msg, 'error')
    }
  }


  const handleUpdateProposal = (markdown: string) => {
    updateProposalDraft(markdown)
  }

  const handleSendProposal = async (data: SendProposalData) => {
    try {
      await sendProposal(data)
      showToast('Proposal sent successfully!', 'success')
      setShowSendProposalConfirmation(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send proposal'
      showToast(msg, 'error')
    }
  }

  const handleDownload = async () => {
    // For proposal draft, use proposalDraft; otherwise use reportMarkdown
    const contentToDownload = (docType === 'KICKOFF' && proposalStatus === 'draft' && proposalDraft)
      ? proposalDraft
      : reportMarkdown

    if (!contentToDownload || isDownloading) return
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

      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const marginL = 18
      const marginR = 18
      const marginT = 32
      const marginB = 21
      const maxW = pageW - marginL - marginR
      let y = marginT

      const checkY = (needed: number) => {
        if (y + needed > pageH - marginB) {
          doc.addPage()
          y = marginT
        }
      }

      // Render crisp base64 logo via offscreen canvas
      const logoPng = await getLogoBase64()
      const clientVal = discovery.clientName || userEmail || 'Client'

      // ─── COVER PAGE (Page 1) ───
      if (docType !== 'KICKOFF') {
        if (logoPng) {
          doc.addImage(logoPng, 'PNG', (pageW - 60) / 2, 40, 60, 16.36)
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(24)
        doc.setTextColor(26, 35, 64)
        const coverTitle = docTypeMap[docType] || 'Project Kickoff Report'
        const titleLines = doc.splitTextToSize(coverTitle, maxW)
        let titleY = 80
        doc.text(titleLines, pageW / 2, titleY, { align: 'center' })
        titleY += titleLines.length * 8 + 4

        doc.setDrawColor(45, 110, 245)
        doc.setLineWidth(0.8)
        doc.line(pageW / 2 - 25, titleY, pageW / 2 + 25, titleY)
        titleY += 12

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(11)
        doc.setTextColor(100, 110, 130)
        doc.text('PREPARED BY PROJECTPILOT AI', pageW / 2, titleY, { align: 'center' })

        // Cover Page Metadata Table
        const metadataStartY = 135
        const tableW = 140
        const startX = (pageW - tableW) / 2
        const rowHeight = 8
        const col1W = 45

        const versionVal = `v${docMetadata?.version || '1.0'}`
        const statusVal = docMetadata?.status || 'Draft'
        const dateVal = docMetadata?.date || formatDate(new Date())

        const metadataFields = [
          { label: 'Project Name', value: discovery.projectName || 'Untitled Project' },
          { label: 'Document Version', value: versionVal },
          { label: 'Date', value: dateVal },
          { label: 'Status', value: statusVal },
          { label: 'Client', value: clientVal }
        ]

        doc.setLineWidth(0.2)
        doc.setDrawColor(226, 232, 240)

        metadataFields.forEach((f, idx) => {
          const rowY = metadataStartY + idx * rowHeight
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252)
            doc.rect(startX, rowY, tableW, rowHeight, 'F')
          } else {
            doc.setFillColor(255, 255, 255)
            doc.rect(startX, rowY, tableW, rowHeight, 'F')
          }

          doc.line(startX, rowY + rowHeight, startX + tableW, rowY + rowHeight)

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9.5)
          doc.setTextColor(30, 41, 59)
          doc.text(f.label, startX + 4, rowY + 5.5)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9.5)
          doc.setTextColor(71, 85, 105)
          if (f.label === 'Status') {
            doc.setFont('helvetica', 'bold')
            if (f.value === 'Approved') {
              doc.setTextColor(16, 185, 129)
            } else {
              doc.setTextColor(245, 158, 11)
            }
          }
          doc.text(f.value, startX + col1W + 4, rowY + 5.5)
        })

        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(0.4)
        doc.rect(startX, metadataStartY, tableW, rowHeight * metadataFields.length)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text('This document contains proprietary information and is intended solely for the recipient.', pageW / 2, 275, { align: 'center' })

        // ─── CONTENT PAGES (Page 2+) ───
        doc.addPage()
      }
      y = marginT

      if (docType === 'KICKOFF' && agencyBranding) {
        if (agencyBranding.logo) {
          try {
            doc.addImage(agencyBranding.logo, 'PNG', marginL, y - 8, 26, 7.09)
          } catch (e) {
            console.error('Failed to render PDF agency logo:', e)
          }
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(26, 35, 64)
        doc.text(agencyBranding.name, marginL + 30, y - 5)

        if (agencyBranding.email) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(100, 110, 130)
          doc.text(agencyBranding.email, marginL + 30, y - 1)
        }

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(148, 163, 184)
        doc.text('Powered by ProjectPilot', pageW - marginR, y - 4, { align: 'right' })

        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(marginL, y + 4, pageW - marginR, y + 4)
        y += 12
      }

      // Helper to calculate column widths dynamically
      const calculateColWidths = (headers: string[], rows: string[][], tableWidth: number): number[] => {
        const colCount = headers.length
        if (colCount === 0) return []

        // 1. Analyze text length for each column
        const colMaxLens = headers.map((h, cIdx) => {
          let maxLen = decodeHtmlEntities(h.trim()).length
          rows.forEach(row => {
            if (row[cIdx]) {
              const val = decodeHtmlEntities(row[cIdx].trim()).replace(/\*\*(.*?)\*\*/g, '$1')
              maxLen = Math.max(maxLen, val.length)
            }
          })
          return maxLen
        })

        // 2. Assign weight category based on max character length
        const colWeights = colMaxLens.map((maxLen) => {
          if (maxLen <= 12) return 1.5     // Narrow
          if (maxLen <= 30) return 2.5     // Medium
          if (maxLen <= 55) return 4.0     // Wide
          return 6.0                       // Extra Wide
        })

        // 3. Normalize weights to distribute tableWidth
        const totalWeight = colWeights.reduce((sum, w) => sum + w, 0)
        return colWeights.map(w => (w / totalWeight) * tableWidth)
      }

      const drawPDFTable = (headers: string[], rows: string[][], tableStartX: number, tableWidth: number): number => {
        const colCount = headers.length
        if (colCount === 0) return y

        const colWidths = calculateColWidths(headers, rows, tableWidth)
        const isMultiCol = colCount >= 5
        const fontSize = isMultiCol ? 7.5 : 8.5
        const lineSpacing = isMultiCol ? 3.8 : 4.5
        const vertPadding = isMultiCol ? 3.0 : 4.0
        const hHeight = isMultiCol ? 7 : 8
        const textStartY = isMultiCol ? 4.0 : 5.0
        const headerTextY = isMultiCol ? 4.8 : 5.5

        // Calculate first row height (if rows exist) to prevent drawing header alone on current page
        let firstRowH = 8
        if (rows.length > 0) {
          const firstRow = rows[0]
          const firstRowLines = firstRow.map((cell, cIdx) => {
            const txt = decodeHtmlEntities((cell || '').trim()).replace(/\*\*(.*?)\*\*/g, '$1')
            let cellLines: string[] = []
            if (txt.includes('•')) {
              const parts = txt.split('•').map(p => p.trim()).filter(Boolean)
              parts.forEach(p => {
                const wrapped = doc.splitTextToSize(`• ${p}`, colWidths[cIdx] - 5)
                cellLines.push(...wrapped)
              })
            } else {
              cellLines = doc.splitTextToSize(txt, colWidths[cIdx] - 5)
            }
            return cellLines
          })
          const maxLines = Math.max(...firstRowLines.map(lines => lines.length), 1)
          firstRowH = maxLines * lineSpacing + vertPadding
        }

        // Push header + first row to next page if it doesn't fit on the current page
        if (y + hHeight + firstRowH > pageH - marginB) {
          doc.addPage()
          y = marginT
        }

        // Draw header row
        doc.setFillColor(26, 35, 64)
        doc.rect(tableStartX, y, tableWidth, hHeight, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(fontSize)
        doc.setTextColor(255, 255, 255)

        headers.forEach((h, i) => {
          let colStartX = tableStartX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0)
          doc.text(sanitizeForPDF(decodeHtmlEntities(h.trim())), colStartX + 2.5, y + headerTextY)
        })

        // Draw vertical borders for headers
        let hColStartX = tableStartX
        colWidths.forEach((colW, cIdx) => {
          if (cIdx < colWidths.length - 1) {
            doc.setDrawColor(50, 60, 90)
            doc.setLineWidth(0.2)
            doc.line(hColStartX + colW, y, hColStartX + colW, y + hHeight)
          }
          hColStartX += colW
        })

        let rowY = y + hHeight
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fontSize)

        rows.forEach((row, rIdx) => {
          // Analyze cell lines and determine max row height (splitting inline bullets)
          const cellLinesList = row.map((cell, cIdx) => {
            const txt = decodeHtmlEntities((cell || '').trim()).replace(/\*\*(.*?)\*\*/g, '$1')
            let cellLines: string[] = []
            if (txt.includes('•')) {
              const parts = txt.split('•').map(p => p.trim()).filter(Boolean)
              parts.forEach(p => {
                const wrapped = doc.splitTextToSize(`• ${p}`, colWidths[cIdx] - 5)
                cellLines.push(...wrapped)
              })
            } else {
              cellLines = doc.splitTextToSize(txt, colWidths[cIdx] - 5)
            }
            return cellLines
          })

          const maxLines = Math.max(...cellLinesList.map(lines => lines.length), 1)
          const rHeight = maxLines * lineSpacing + vertPadding

          // Page break check inside table rows
          if (rowY + rHeight > pageH - marginB) {
            // Box the table segment on the current page
            doc.setDrawColor(203, 213, 225)
            doc.setLineWidth(0.3)
            doc.rect(tableStartX, y, tableWidth, rowY - y)

            // Add new page
            doc.addPage()
            y = marginT
            rowY = y + hHeight

            // Redraw table header on the new page
            doc.setFillColor(26, 35, 64)
            doc.rect(tableStartX, y, tableWidth, hHeight, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(fontSize)
            doc.setTextColor(255, 255, 255)
            headers.forEach((h, i) => {
              let colStartX = tableStartX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0)
              doc.text(sanitizeForPDF(decodeHtmlEntities(h.trim())), colStartX + 2.5, y + headerTextY)
            })

            // Redraw header vertical dividers
            let hColStartX2 = tableStartX
            colWidths.forEach((colW, cIdx) => {
              if (cIdx < colWidths.length - 1) {
                doc.setDrawColor(50, 60, 90)
                doc.setLineWidth(0.2)
                doc.line(hColStartX2 + colW, y, hColStartX2 + colW, y + hHeight)
              }
              hColStartX2 += colW
            })

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(fontSize)
          }

          // Alternating row background
          if (rIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252)
            doc.rect(tableStartX, rowY, tableWidth, rHeight, 'F')
          } else {
            doc.setFillColor(255, 255, 255)
            doc.rect(tableStartX, rowY, tableWidth, rHeight, 'F')
          }

          // Render cells text
          let colStartX = tableStartX
          row.forEach((cell, cIdx) => {
            doc.setTextColor(55, 65, 81)
            const lines = cellLinesList[cIdx]
            lines.forEach((line, lineIdx) => {
              doc.text(sanitizeForPDF(line), colStartX + 2.5, rowY + textStartY + lineIdx * lineSpacing)
            })
            colStartX += colWidths[cIdx]
          })

          // Draw vertical cell dividers
          let cellColStartX = tableStartX
          colWidths.forEach((colW, cIdx) => {
            if (cIdx < colWidths.length - 1) {
              doc.setDrawColor(226, 232, 240)
              doc.setLineWidth(0.2)
              doc.line(cellColStartX + colW, rowY, cellColStartX + colW, rowY + rHeight)
            }
            cellColStartX += colW
          })

          // Draw bottom horizontal cell divider line
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.2)
          doc.line(tableStartX, rowY + rHeight, tableStartX + tableWidth, rowY + rHeight)

          rowY += rHeight
        })

        // Draw final outer borders
        doc.setDrawColor(203, 213, 225)
        doc.setLineWidth(0.3)
        doc.rect(tableStartX, y, tableWidth, rowY - y)

        return rowY
      }

      const rawLines = contentToDownload.split('\n')
      const lines: string[] = []
      let prevEmpty = false
      for (let raw of rawLines) {
        // Decode HTML entities first
        const decodedRaw = decodeHtmlEntities(raw)
        let cleanRaw = decodedRaw.replace(/<br\s*\/?>/gi, '')
        let trimmed = cleanRaw.trim()
        if (trimmed === '') {
          if (!prevEmpty) {
            lines.push('')
            prevEmpty = true
          }
        } else {
          lines.push(cleanRaw)
          prevEmpty = false
        }
      }

      let idx = 0

      while (idx < lines.length) {
        const raw = lines[idx]
        const line = raw.trim()

        if (line.startsWith('|') && line.endsWith('|')) {
          const tableLines: string[] = []
          while (idx < lines.length && lines[idx].trim().startsWith('|') && lines[idx].trim().endsWith('|')) {
            tableLines.push(lines[idx].trim())
            idx++
          }

          const parsedRows = tableLines
            .map(l => l.slice(1, -1).split('|').map(c => c.trim()))
            .filter(row => !row.every(cell => /^[\s:-]+$/.test(cell)))

          if (parsedRows.length > 0) {
            const tblHeaders = parsedRows[0]
            const tblBody = parsedRows.slice(1)

            // Render single-row tables as key-value text lines instead of full grids
            if (tblBody.length <= 1) {
              const row = tblBody[0] || []
              tblHeaders.forEach((header, colIdx) => {
                const cellVal = row[colIdx] || ''
                if (cellVal) {
                  checkY(6)
                  doc.setFont('helvetica', 'bold')
                  doc.setFontSize(9.5)
                  doc.setTextColor(26, 35, 64)
                  doc.text(`${header}:`, marginL, y)

                  doc.setFont('helvetica', 'normal')
                  doc.setTextColor(55, 65, 81)
                  const cleanVal = sanitizeForPDF(decodeHtmlEntities(cellVal)).replace(/\*\*(.*?)\*\*/g, '$1')

                  if (cleanVal.includes('•')) {
                    const parts = cleanVal.split('•').map(p => p.trim()).filter(Boolean)
                    y += 4
                    parts.forEach(p => {
                      checkY(6)
                      doc.setFillColor(45, 110, 245)
                      doc.circle(marginL + 5, y - 1.2, 0.8, 'F')
                      const split = doc.splitTextToSize(p, maxW - 9)
                      doc.text(split, marginL + 9, y)
                      y += split.length * 5.5 + 1.5
                    })
                  } else {
                    const labelW = doc.getTextWidth(`${header}: `)
                    const splitVal = doc.splitTextToSize(cleanVal, maxW - labelW)
                    doc.text(splitVal, marginL + labelW, y)
                    y += splitVal.length * 5.5 + 1.5
                  }
                }
              })
            } else {
              const isMultiCol = tblHeaders.length >= 5
              const headerH = isMultiCol ? 7 : 8
              const minRowH = 12
              checkY(headerH + minRowH)

              const endTableY = drawPDFTable(tblHeaders, tblBody, marginL, maxW)
              y = endTableY + 6
            }
          }
          continue
        }

        if (!line) {
          y += 4
          idx++
          continue
        }

        // Support markdown horizontal rules (e.g. ---)
        if (/^[-*_]{3,}$/.test(line)) {
          checkY(8)
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.3)
          doc.line(marginL, y, pageW - marginR, y)
          y += 6
          idx++
          continue
        }

        if (line.startsWith('# ')) {
          checkY(16)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(15)
          doc.setTextColor(26, 35, 64)
          const txt = sanitizeForPDF(line.slice(2))
          const split = doc.splitTextToSize(txt, maxW)
          doc.text(split, marginL, y)
          y += split.length * 7 + 2

          doc.setDrawColor(45, 110, 245)
          doc.setLineWidth(0.5)
          doc.line(marginL, y, pageW - marginR, y)
          y += 6

          if (idx + 1 < lines.length && lines[idx + 1].trim() === '') {
            idx++
          }

        } else if (line.startsWith('## ')) {
          if (y > marginT + 5) {
            checkY(16)
            doc.setDrawColor(226, 232, 240)
            doc.setLineWidth(0.3)
            doc.line(marginL, y, pageW - marginR, y)
            y += 6
          }
          checkY(12)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(11.5)
          doc.setTextColor(45, 110, 245)
          const txt = sanitizeForPDF(line.slice(3))
          const split = doc.splitTextToSize(txt, maxW)
          doc.text(split, marginL, y)
          y += split.length * 6 + 3

          if (idx + 1 < lines.length && lines[idx + 1].trim() === '') {
            idx++
          }

        } else if (line.startsWith('### ')) {
          checkY(10)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(10.5)
          doc.setTextColor(26, 35, 64)
          const txt = sanitizeForPDF(line.slice(4))
          const split = doc.splitTextToSize(txt, maxW)
          doc.text(split, marginL, y)
          y += split.length * 5.5 + 2

          if (idx + 1 < lines.length && lines[idx + 1].trim() === '') {
            idx++
          }

        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          checkY(6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9.5)
          doc.setTextColor(55, 65, 81)
          const clean = sanitizeForPDF(decodeHtmlEntities(line.slice(2))).replace(/\*\*(.*?)\*\*/g, '$1')

          if (clean.includes('•')) {
            const parts = clean.split('•').map(p => p.trim()).filter(Boolean)
            parts.forEach(p => {
              checkY(6)
              doc.setFillColor(45, 110, 245)
              doc.circle(marginL + 2, y - 1.2, 0.8, 'F')
              const split = doc.splitTextToSize(p, maxW - 6)
              doc.text(split, marginL + 6, y)
              y += split.length * 5.5 + 1.5
            })
          } else {
            doc.setFillColor(45, 110, 245)
            doc.circle(marginL + 2, y - 1.2, 0.8, 'F')
            const split = doc.splitTextToSize(clean, maxW - 6)
            doc.text(split, marginL + 6, y)
            y += split.length * 5.5 + 1.5
          }

        } else {
          checkY(6)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9.5)
          doc.setTextColor(55, 65, 81)
          const clean = sanitizeForPDF(decodeHtmlEntities(line)).replace(/\*\*(.*?)\*\*/g, '$1')

          if (clean.includes('•')) {
            const parts = clean.split('•').map(p => p.trim()).filter(Boolean)
            parts.forEach(p => {
              checkY(6)
              doc.setFillColor(45, 110, 245)
              doc.circle(marginL + 2, y - 1.2, 0.8, 'F')
              const split = doc.splitTextToSize(p, maxW - 6)
              doc.text(split, marginL + 6, y)
              y += split.length * 5.5 + 1.5
            })
          } else {
            const split = doc.splitTextToSize(clean, maxW)
            doc.text(split, marginL, y)
            y += split.length * 5.5 + 1.5
          }
        }

        idx++
      }

      // Draw Version History at the very bottom
      const versionHistory = docMetadata?.version_history || []
      if (versionHistory.length > 0) {
        checkY(25)
        if (y > marginT + 5) {
          doc.setDrawColor(226, 232, 240)
          doc.setLineWidth(0.3)
          doc.line(marginL, y, pageW - marginR, y)
          y += 6
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11.5)
        doc.setTextColor(45, 110, 245)
        doc.text('Document Version History', marginL, y)
        y += 6

        const vHeaders = ['Version', 'Date', 'Change Summary', 'Status']
        const vRows = versionHistory.map((h: any) => [
          `v${h.version}`,
          h.date,
          h.changeSummary,
          h.status
        ])
        const isMultiCol = vHeaders.length >= 5
        const headerH = isMultiCol ? 7 : 8
        const minRowH = 12
        checkY(headerH + minRowH)
        y = drawPDFTable(vHeaders, vRows, marginL, maxW)
      }

      // ─── PAGE HEADERS & FOOTERS (Pages 2+) ───
      const totalPages = doc.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        if (p === 1) continue

        if (logoPng) {
          doc.addImage(logoPng, 'PNG', marginL, 11, 26, 7.09)
        }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.setTextColor(71, 85, 105)
        const headerTitle = docTypeMap[docType] || 'Project Kickoff Report'
        doc.text(headerTitle, pageW - marginR, 16, { align: 'right' })

        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(marginL, 21, pageW - marginR, 21)

        doc.setDrawColor(241, 245, 249)
        doc.line(marginL, 280, pageW - marginR, 280)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`Confidential — Prepared for ${clientVal}`, marginL, 285)
        doc.text(`Page ${p} of ${totalPages}`, pageW - marginR, 285, { align: 'right' })
      }

      const camelProjectName = toCamelCase(discovery.projectName || 'ProjectPilot')

      // Use "Proposal" filename when downloading edited proposal draft
      const isProposal = (docType === 'KICKOFF' && proposalStatus === 'draft' && proposalDraft)
      const filename = isProposal
        ? `Proposal_${camelProjectName}.pdf`
        : docType === 'KICKOFF'
          ? `RequirementSummary_${camelProjectName}.pdf`
          : `${docType}_${camelProjectName}.pdf`

      let saved = false
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          })
          const blob = doc.output('blob')
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          saved = true
          showToast(`${isProposal ? 'Proposal' : docType + ' report'} saved successfully`, 'success')
        } catch (err: any) {
          if (err instanceof Error && err.name === 'AbortError') {
            showToast('Download cancelled', 'info')
            setIsDownloading(false)
            return
          }
          console.error('File picker save error, using default download:', err)
        }
      }

      if (!saved) {
        doc.save(filename)
        showToast(`${isProposal ? 'Proposal' : docType + ' report'} downloaded successfully`, 'success')
      }
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
    { id: 'KICKOFF', label: 'Requirement Summary' },
    { id: 'BRD', label: 'BRD' },
    { id: 'PRD', label: 'PRD' },
    { id: 'SRS', label: 'SRS' },
    { id: 'SOW', label: 'SOW' },
    { id: 'PROPOSAL', label: 'Proposal' },
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
      )}

      {/* ── Send Proposal Confirmation Dialog ── */}
      <SendProposalConfirmation
        open={showSendProposalConfirmation}
        onOpenChange={setShowSendProposalConfirmation}
        onConfirm={handleSendProposal}
        isLoading={isSendingProposal}
      />      <style>{`
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
        {!isAdmin ? (
          // CLIENT ACTION BAR
          <div className="flex w-full items-center justify-between">
            {/* Left side indicator */}
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Requirement Summary</span>
              {docMetadata && docMetadata.status === 'Submitted' && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/25">
                  Submitted
                </span>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {reportMarkdown && (
                <>
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

                  {docMetadata && docMetadata.status === 'Submitted' ? (
                    <button
                      disabled
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 px-3.5 py-1.5 text-xs font-semibold cursor-not-allowed"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Submitted to Agency</span>
                    </button>
                  ) : hasClientConfirmed ? (
                    <button
                      onClick={handleSubmitToAgency}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      <span>{docMetadata?.previously_submitted ? 'Resubmit to Agency' : 'Submit to Agency'}</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Confirm requirements in chat first (e.g. say 'yes this is correct' or 'confirmed')"
                      className="flex items-center gap-1.5 rounded-xl bg-muted text-muted-foreground border border-border px-3.5 py-1.5 text-xs font-semibold cursor-not-allowed opacity-60"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>{docMetadata?.previously_submitted ? 'Resubmit to Agency' : 'Submit to Agency'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          // ADMIN ACTION BAR
          <>
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
                  {docMetadata && docMetadata.status === 'Draft' && (
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {isApproving ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3" />
                      )}
                      <span>Approve Report</span>
                    </button>
                  )}
                  {/* Generate Proposal Button - Show when BRD, PRD, SOW exist */}
                  {docType === 'KICKOFF' && !proposalDraft && (
                    <button
                      onClick={handleGenerateProposal}
                      disabled={isGeneratingProposal}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {isGeneratingProposal ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Send className="size-3" />
                      )}
                      <span>{isGeneratingProposal ? 'Generating...' : 'Generate Proposal'}</span>
                    </button>
                  )}
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
                onClick={handleRegenerateClick}
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
                    : <><Zap className="size-3.5" /><span>Generate {docTypeMap[docType]}</span></>
                }
              </button>
            </div>
          </>
        )}
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
        {docType === 'PROPOSAL' ? (
          /* ── PROPOSAL TAB ── */
          <div className="relative max-md:px-4 p-6 print:hidden">
            {proposalStatus === 'draft' && proposalDraft && proposalId ? (
              <div className="rounded-2xl border-2 border-ring/30 bg-gradient-to-br from-primary/5 to-ring/5 p-1 shadow-lg">
                <div className="rounded-xl bg-background">
                  <ProposalEditor
                    projectId={projectId}
                    proposalId={proposalId}
                    initialMarkdown={proposalDraft}
                    onSend={() => setShowSendProposalConfirmation(true)}
                    isSending={isSendingProposal}
                    onUpdate={handleUpdateProposal}
                  />
                </div>
              </div>
            ) : isGeneratingProposal ? (
              /* Proposal generating loader */
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
                  Generating proposal draft...
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-xs">
                  Synthesizing BRD, PRD, and SOW into a comprehensive proposal.
                </p>
              </div>
            ) : (
              /* No proposal yet - show call to action */
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <div className="mb-6 flex size-16 items-center justify-center rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, rgba(45,110,245,0.1), rgba(107,92,231,0.1))' }}>
                  <FileText className="size-8 text-ring" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No Proposal Draft Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Generate a proposal draft from the requirement summary. Make sure BRD, PRD, and SOW are ready first.
                </p>
                <button
                  onClick={handleGenerateProposal}
                  disabled={isGeneratingProposal}
                  className="relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
                  style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}
                >
                  {isGeneratingProposal ? (
                    <><Loader2 className="size-4 animate-spin" /><span>Generating...</span></>
                  ) : (
                    <><Sparkles className="size-4" /><span>Generate Proposal Draft</span></>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : reportMarkdown !== null ? (
          <div className="relative max-md:px-4 p-6 print:p-0">
            {/* Auto-updating loader overlay */}
            {isGenerating && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/75 backdrop-blur-[2px] rounded-2xl transition-all duration-300">
                <div className="relative mb-4">
                  <div className="size-12 rounded-full border-2 border-border" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: '#2d6ef5', borderRightColor: '#6b5ce7', animationDuration: '0.8s' }} />
                  <Sparkles className="absolute inset-0 m-auto size-4 text-ring animate-pulse" />
                </div>
                <p className="text-xs font-semibold text-foreground">Generating Requirement Summary...</p>
                <p className="text-[10px] text-muted-foreground mt-1">Splicing requirements from conversation turns</p>
              </div>
            )}

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
                {docMetadata && docType !== 'KICKOFF' && (
                  <HTMLMetadataTable
                    projectName={discovery.projectName || 'Untitled Project'}
                    version={docMetadata.version}
                    date={docMetadata.date}
                    status={docMetadata.status}
                    clientName={discovery.clientName || userEmail || 'Client'}
                  />
                )}

                {(docType === 'KICKOFF') && agencyBranding && (
                  <div className="mb-6 pb-6 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:border-b print:pb-4 print:mb-4">
                    <div className="flex items-center gap-3">
                      {agencyBranding.logo && (
                        <img
                          src={agencyBranding.logo}
                          alt={`${agencyBranding.name} logo`}
                          className="h-10 object-contain max-w-[120px] print:h-8"
                        />
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-foreground print:text-black">{agencyBranding.name}</h4>
                        {agencyBranding.email && (
                          <p className="text-xs text-muted-foreground print:text-neutral-500">{agencyBranding.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right font-mono text-[9px] text-muted-foreground uppercase tracking-widest print:text-neutral-400">
                      Powered by ProjectPilot
                    </div>
                  </div>
                )}

                <ReportContentFormatter markdown={reportMarkdown} />

                {docMetadata && docType !== 'KICKOFF' && docMetadata.version_history && docMetadata.version_history.length > 0 && (
                  <HTMLVersionHistoryTable history={docMetadata.version_history} />
                )}
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
                { key: 'business_goals', label: 'Business Goals & Objectives', completion: 0 },
                { key: 'target_users', label: 'Target Users & Persona Mapping', completion: 0 },
                { key: 'functional_scope', label: 'Core Functional Scope', completion: 0 },
                { key: 'non_functional_reqs', label: 'Non-Functional Reqs & Compliance', completion: 0 },
                { key: 'constraints', label: 'Constraints & Tech Stack Fit', completion: 0 },
              ]).map((sec) => {
                const done = sec.completion >= 80
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
                {(docType as string) === 'PROPOSAL'
                  ? 'Generate a comprehensive proposal from your requirement documents.'
                  : overallProgress >= 85
                    ? `Discovery complete — synthesize your ${docTypeMap[docType]} deliverable now.`
                    : `Chat with Pilot or attach a PDF to advance discovery for ${docTypeMap[docType]}.`
                }
              </p>
              <button
                onClick={handleRegenerateClick}
                disabled={((docType as string) === 'PROPOSAL' ? isGeneratingProposal : isGenerating) || isStreaming}
                className="relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
                style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}
              >
                {((docType as string) === 'PROPOSAL' ? isGeneratingProposal : isGenerating)
                  ? <><Loader2 className="size-4 animate-spin" /><span>Generating…</span></>
                  : docType === 'KICKOFF'
                    ? <><Sparkles className="size-4" /><span>Get Summary</span></>
                    : (docType as string) === 'PROPOSAL'
                      ? <><Sparkles className="size-4" /><span>Generate Proposal Draft</span></>
                      : <><Sparkles className="size-4" /><span>Generate {docTypeMap[docType]} Now</span></>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
