'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage, DiscoveryState } from './types'

// ── Default blank state (new project) ─────────────────────────────────────

export const BLANK_DISCOVERY: DiscoveryState = {
  projectName: '',
  clientName: '',
  domain: '',
  overallCompletion: 0,
  sections: [
    { key: 'goals', label: 'Business Goals', completion: 0 },
    { key: 'requirements', label: 'Requirement Gap Analysis', completion: 0 },
    { key: 'users', label: 'User & Persona Mapping', completion: 0 },
    { key: 'scope', label: 'Scope Definition', completion: 0 },
    { key: 'nfr', label: 'Non-Functional Reqs', completion: 0 },
    { key: 'arch', label: 'Architecture Fit', completion: 0 },
  ],
  features: [],
  brd: { objectives: [], scope: [], stakeholders: [] },
  prd: { personas: [], goals: [], metrics: [] },
  srs: { functional: [], nonFunctional: [] },
  userStories: [],
  architecture: { layers: [], integrations: [] },
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi, I'm Pilot — your AI pre-sales engineer. Tell me about the software you have in mind and I'll turn our conversation into structured requirements, user stories, and an architecture plan. What are we building?",
  createdAt: Date.now(),
}

// ── Context ────────────────────────────────────────────────────────────────

interface DiscoveryContextValue {
  messages: ChatMessage[]
  discovery: DiscoveryState
  isStreaming: boolean
  isLoading: boolean
  projectId: string
  // Proposal state management
  proposalId: string | null
  proposalDraft: string | null
  proposalStatus: 'none' | 'draft' | 'sent' // none = not generated, draft = editing, sent = finalized
  isGeneratingProposal: boolean
  isSendingProposal: boolean
  sendMessage: (content: string) => Promise<void>
  updateFeatureName: (id: string, name: string) => void
  generateProposal: () => Promise<void>
  updateProposalDraft: (markdown: string) => void
  sendProposal: (data: SendProposalData) => Promise<void>
  resetProposal: () => void
}

export interface SendProposalData {
  clientEmail: string
  clientName: string
  finalCost: string
  estimatedTimeline: string
  expiryDate?: string
  personalMessage?: string
}

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function DiscoveryProvider({
  children,
  projectId,
}: {
  children: ReactNode
  projectId: string
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [discovery, setDiscovery] = useState<DiscoveryState>(BLANK_DISCOVERY)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  // Proposal state
  const [proposalId, setProposalId] = useState<string | null>(null)
  const [proposalDraft, setProposalDraft] = useState<string | null>(null)
  const [proposalStatus, setProposalStatus] = useState<'none' | 'draft' | 'sent'>('none')
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)
  const [isSendingProposal, setIsSendingProposal] = useState(false)
  const idRef = useRef(0)

  const nextId = useCallback((prefix: string) => {
    idRef.current += 1
    return `${prefix}-${Date.now()}-${idRef.current}`
  }, [])

  // ── Load project + messages from Supabase on mount ──────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        if (!res.ok) throw new Error('Failed to load project')
        const { project, messages: dbMessages } = await res.json()

        if (cancelled) return

        // Restore discovery state if present
        if (project.discovery_state) {
          setDiscovery(project.discovery_state as DiscoveryState)
        }

        // Restore chat history
        if (Array.isArray(dbMessages) && dbMessages.length > 0) {
          const chatMessages: ChatMessage[] = dbMessages.map(
            (m: { id: string; role: string; content: string; created_at: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: new Date(m.created_at).getTime(),
            }),
          )
          setMessages([WELCOME_MESSAGE, ...chatMessages])
        }

        // Load existing proposal if present
        const proposalRes = await fetch(`/api/projects/${projectId}/proposal`)
        if (proposalRes.ok) {
          const proposalData = await proposalRes.json()
          if (proposalData.proposal) {
            setProposalId(proposalData.proposal.id)
            setProposalDraft(proposalData.proposal.proposal_markdown)
            setProposalStatus(proposalData.proposal.status)
          }
        }
      } catch {
        // Keep blank defaults — user will start fresh
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [projectId])

  // ── Send message → stream AI → parse state → persist ───────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming) return

      const userMessage: ChatMessage = {
        id: nextId('u'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      }
      const assistantId = nextId('a')
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      }

      // Build the history to send (exclude welcome message — it's local only)
      const historyToSend = messages
        .filter((m) => m.id !== 'welcome')
        .concat(userMessage)

      const previousMessages = [...messages]
      setMessages((prev) => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            messages: historyToSend.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `HTTP ${res.status}`)
        }
        if (!res.body) throw new Error('No response stream')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const SENTINEL = '\n__DISCOVERY_STATE__:'

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (buffer.indexOf(SENTINEL) === -1 && buffer.length > 0) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: buffer } : m,
                ),
              )
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })

          const sentinelIdx = buffer.indexOf(SENTINEL)

          if (sentinelIdx === -1) {
            // No sentinel yet — display everything except the last partial line
            // (it might be the start of the sentinel)
            const safeEnd = Math.max(0, buffer.length - SENTINEL.length)
            const displayable = buffer.slice(0, safeEnd)
            if (displayable) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: displayable }
                    : m,
                ),
              )
            }
          } else {
            // Sentinel found — split here
            const conversationalText = buffer.slice(0, sentinelIdx)
            const jsonStr = buffer.slice(sentinelIdx + SENTINEL.length).trim()
            let parsedOptions: string[] = []

            if (jsonStr) {
              try {
                const newState = JSON.parse(jsonStr) as DiscoveryState
                setDiscovery(newState)
                parsedOptions = newState.suggestedOptions || []

                // Also update project metadata in the sidebar (non-blocking)
                supabase
                  .from('projects')
                  .update({
                    title: newState.projectName || undefined,
                    client_name: newState.clientName || undefined,
                    domain: newState.domain || undefined,
                    discovery_state: newState,
                  })
                  .eq('id', projectId)
                  .then(() => { /* fire-and-forget */ })
              } catch {
                // Malformed JSON — skip state update
              }
            }

            // Finalize chat message with options
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: conversationalText, options: parsedOptions }
                  : m,
              ),
            )
            break
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        // Rollback optimistic messages and show an error toast or message
        setMessages([...previousMessages, {
          id: nextId('e'),
          role: 'assistant',
          content: `⚠️ Could not reach the AI engine: ${msg}. Please try again.`,
          createdAt: Date.now()
        }])
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, messages, nextId, projectId, supabase],
  )

  // ── Feature rename (local + persist) ────────────────────────────────────
  const updateFeatureName = useCallback(
    (id: string, name: string) => {
      setDiscovery((prev) => {
        const updated = {
          ...prev,
          features: prev.features.map((f) => (f.id === id ? { ...f, name } : f)),
        }
        // Persist in background
        supabase
          .from('projects')
          .update({ discovery_state: updated })
          .eq('id', projectId)
          .then(() => { /* fire-and-forget */ })
        return updated
      })
    },
    [projectId, supabase],
  )

  // ── Proposal generation ────────────────────────────────────────────────
  const generateProposal = useCallback(async () => {
    setIsGeneratingProposal(true)
    try {
      const res = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setProposalId(data.proposalId)
      setProposalDraft(data.proposalDraft)
      setProposalStatus('draft')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      
      // Provide more specific error messages based on the error content
      if (msg.includes('BRD, PRD, and SOW are required')) {
        throw new Error('Missing required documents: Please generate BRD, PRD, and SOW first before creating a proposal.')
      } else if (msg.includes('No kickoff report found')) {
        throw new Error('No project requirements found: Please complete the discovery conversation first.')
      } else if (msg.includes('Unauthorized') || msg.includes('Forbidden')) {
        throw new Error('Access denied: You do not have permission to generate proposals for this project.')
      } else if (msg.includes('Rate limit exceeded')) {
        throw new Error('Too many requests: Please wait a moment before generating another proposal.')
      } else if (msg.includes('API key not configured')) {
        throw new Error('System configuration error: AI service is not properly configured. Please contact support.')
      } else if (msg.includes('Failed to save proposal draft')) {
        throw new Error('Database error: Could not save proposal draft. Please try again or contact support if the issue persists.')
      } else if (msg.includes('Proposal generation failed')) {
        throw new Error('AI generation error: Failed to generate proposal content. Please try again with more detailed requirements.')
      } else {
        throw new Error(`Failed to generate proposal: ${msg}`)
      }
    } finally {
      setIsGeneratingProposal(false)
    }
  }, [projectId])

  // ── Update proposal draft locally ────────────────────────────────────────
  const updateProposalDraft = useCallback((markdown: string) => {
    setProposalDraft(markdown)
  }, [])

  // ── Send proposal ────────────────────────────────────────────────────────
  const sendProposal = useCallback(
    async (data: SendProposalData) => {
      if (!proposalDraft) throw new Error('No proposal draft to send')

      setIsSendingProposal(true)
      try {
        const res = await fetch('/api/proposal/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            clientEmail: data.clientEmail,
            clientName: data.clientName,
            finalCost: data.finalCost,
            estimatedTimeline: data.estimatedTimeline,
            expiryDate: data.expiryDate,
            personalMessage: data.personalMessage,
            proposalMarkdown: proposalDraft,
          }),
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `HTTP ${res.status}`)
        }

        setProposalStatus('sent')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        throw new Error(`Failed to send proposal: ${msg}`)
      } finally {
        setIsSendingProposal(false)
      }
    },
    [projectId, proposalDraft]
  )

  // ── Reset proposal ────────────────────────────────────────────────────────
  const resetProposal = useCallback(() => {
    setProposalDraft(null)
    setProposalStatus('none')
  }, [])

  const value = useMemo(
    () => ({
      messages,
      discovery,
      isStreaming,
      isLoading,
      projectId,
      sendMessage,
      updateFeatureName,
      // Proposal state
      proposalId,
      proposalDraft,
      proposalStatus,
      isGeneratingProposal,
      isSendingProposal,
      generateProposal,
      updateProposalDraft,
      sendProposal,
      resetProposal,
    }),
    [
      messages,
      discovery,
      isStreaming,
      isLoading,
      projectId,
      sendMessage,
      updateFeatureName,
      proposalId,
      proposalDraft,
      proposalStatus,
      isGeneratingProposal,
      isSendingProposal,
      generateProposal,
      updateProposalDraft,
      sendProposal,
      resetProposal,
    ],
  )

  return (
    <DiscoveryContext.Provider value={value}>
      {children}
    </DiscoveryContext.Provider>
  )
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext)
  if (!ctx) throw new Error('useDiscovery must be used within a DiscoveryProvider')
  return ctx
}
