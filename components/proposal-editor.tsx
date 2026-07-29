'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, Send, Edit2, Save, X, Check, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/toast-container'

interface ProposalEditorProps {
  projectId: string
  proposalId: string
  initialMarkdown: string
  onSend?: (markdown: string) => void
  isSending?: boolean
  onUpdate?: (markdown: string) => void
}

interface EditableSection {
  id: string
  heading: string
  content: string
}

/**
 * ProposalEditor component
 * Allows inline editing of proposal sections before finalization.
 * Sections are parsed from markdown and presented as editable cards.
 */
export function ProposalEditor({
  projectId,
  proposalId,
  initialMarkdown,
  onSend,
  isSending = false,
  onUpdate,
}: ProposalEditorProps) {
  const { showToast } = useToast()
  const [sections, setSections] = useState<EditableSection[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLocalUpdate = useRef(false) // Track if update is from our own save
  const hasInitialized = useRef(false) // Track if we've done initial parse

  // Parse markdown into editable sections
  useEffect(() => {
    // Always parse on first mount
    if (!hasInitialized.current) {
      hasInitialized.current = true
      const parsed = parseProposalMarkdown(initialMarkdown)
      setSections(parsed)
      return
    }
    
    // Don't re-parse if this is our own update
    if (isLocalUpdate.current) {
      isLocalUpdate.current = false
      return
    }
    
    // Re-parse if markdown actually changed (e.g., regeneration)
    const parsed = parseProposalMarkdown(initialMarkdown)
    setSections(parsed)
  }, [initialMarkdown])

  // Reset editing state when proposalId changes (e.g., after regeneration)
  useEffect(() => {
    // Reset initialization flag when proposal changes
    hasInitialized.current = false
    setEditingId(null)
    setEditValue('')
    setSaveStatus('idle')
    
    // Clear any pending auto-save timers
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
  }, [proposalId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && editingId) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`
    }
  }, [editValue, editingId])

  const handleEdit = (section: EditableSection) => {
    setEditingId(section.id)
    setEditValue(section.content)
  }

  const handleSaveEdit = (id: string) => {
    // Calculate updated sections first
    const updatedSections = sections.map((s) => 
      s.id === id ? { ...s, content: editValue } : s
    )
    
    // Update state
    setSections(updatedSections)
    setEditingId(null)
    showToast('Section updated', 'success')
    
    // Mark as local update BEFORE triggering auto-save
    isLocalUpdate.current = true
    
    // Trigger auto-save with the updated sections
    const updatedMarkdown = updatedSections
      .map((section) => `${section.heading}\n${section.content}`)
      .join('\n\n')
    scheduleAutoSave(updatedMarkdown)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const getUpdatedMarkdown = (): string => {
    return sections.map((section) => `${section.heading}\n${section.content}`).join('\n\n')
  }

  // Auto-save function with debouncing
  const scheduleAutoSave = useCallback((markdown: string) => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set status to saving after a brief delay to avoid flashing
    setSaveStatus('saving')

    // Schedule save after 2 seconds of inactivity
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/proposals/${proposalId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposal_markdown: markdown }),
        })

        if (!res.ok) {
          const text = await res.text()
          
          // Handle specific error cases
          if (res.status === 404) {
            throw new Error('Proposal not found')
          } else if (res.status === 401) {
            throw new Error('Unauthorized')
          } else if (res.status === 403) {
            throw new Error('Forbidden')
          } else if (res.status === 429) {
            throw new Error('Rate limit exceeded')
          } else {
            throw new Error(text || `Failed to save (${res.status})`)
          }
        }

        setSaveStatus('saved')
        
        // Notify parent component of the update
        if (onUpdate) {
          onUpdate(markdown)
        }

        // Reset to idle after showing "saved" for 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (err) {
        console.error('Auto-save error:', err)
        setSaveStatus('error')
        
        // Show user-friendly error message based on the error type
        if (err instanceof Error) {
          if (err.message.includes('Proposal not found')) {
            showToast('Auto-save failed: Proposal not found', 'error')
          } else if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
            showToast('Auto-save failed: Permission denied', 'error')
          } else if (err.message.includes('Rate limit exceeded')) {
            showToast('Auto-save failed: Too many requests', 'error')
          } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            showToast('Auto-save failed: Network error', 'error')
          } else {
            showToast(`Auto-save failed: ${err.message}`, 'error')
          }
        } else {
          showToast('Auto-save failed: Unknown error', 'error')
        }
        
        // Reset to idle after showing error for 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 2000)
  }, [proposalId, onUpdate, showToast])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  const handleSendProposal = () => {
    const updatedMarkdown = getUpdatedMarkdown()
    if (onSend) {
      onSend(updatedMarkdown)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Proposal Draft</h2>
          <p className="text-sm text-muted-foreground">Review and edit sections before sending</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === 'saving' && (
              <>
                <Cloud className="size-3.5 animate-pulse" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="text-emerald-600">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <X className="size-3.5 text-destructive" />
                <span className="text-destructive">Save failed</span>
              </>
            )}
          </div>
          <Button
            onClick={handleSendProposal}
            disabled={isSending || editingId !== null}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <Send className="size-4" />
                <span>Finalize & Send</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition-all hover:border-ring/40 hover:shadow-md"
          >
            {editingId === section.id ? (
              // Editing Mode
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{section.heading}</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      className="h-8"
                    >
                      <X className="size-3.5" />
                      <span className="ml-1">Cancel</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(section.id)}
                      className="h-8 gap-1"
                    >
                      <Save className="size-3.5" />
                      <span>Save</span>
                    </Button>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Edit section content..."
                  autoFocus
                />
              </div>
            ) : (
              // View Mode
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-foreground">{section.heading}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(section)}
                    className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="size-3.5" />
                    <span className="text-xs">Edit</span>
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground/90">
                  {/* Simple rendering of content */}
                  {section.content.split('\n').map((line, idx) => {
                    const trimmed = line.trim()
                    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      return (
                        <div key={idx} className="ml-4 flex gap-2">
                          <span className="text-ring">•</span>
                          <span>{trimmed.slice(2)}</span>
                        </div>
                      )
                    }
                    if (trimmed.startsWith('[PLACEHOLDER')) {
                      return (
                        <div
                          key={idx}
                          className="rounded bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-700"
                        >
                          {trimmed}
                        </div>
                      )
                    }
                    if (trimmed === '') return null
                    return (
                      <p key={idx} className="mb-2">
                        {trimmed}
                      </p>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="rounded-lg border border-border/40 bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          💡 Click <strong>Edit</strong> on any section to modify its content. Timeline and Pricing 
          are placeholders and will be replaced when you finalize and send the proposal.
        </p>
      </div>
    </div>
  )
}

/**
 * Parse markdown proposal into editable sections
 * Expects format: ## Section Heading\nContent...
 */
function parseProposalMarkdown(markdown: string): EditableSection[] {
  const sections: EditableSection[] = []
  const lines = markdown.split('\n')
  let currentSection: { heading: string; content: string[] } | null = null
  let sectionCounter = 0

  for (const line of lines) {
    if (line.startsWith('## ')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          id: `section-${sectionCounter}`,
          heading: currentSection.heading,
          content: currentSection.content.join('\n').trim(),
        })
        sectionCounter++
      }

      // Start new section
      currentSection = {
        heading: line.slice(3).trim(),
        content: [],
      }
    } else if (currentSection) {
      // Add line to current section
      if (line.trim() !== '' || currentSection.content.length > 0) {
        currentSection.content.push(line)
      }
    }
  }

  // Save last section
  if (currentSection) {
    sections.push({
      id: `section-${sectionCounter}`,
      heading: currentSection.heading,
      content: currentSection.content.join('\n').trim(),
    })
  }

  return sections
}
