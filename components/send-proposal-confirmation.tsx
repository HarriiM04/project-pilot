'use client'

import { useState } from 'react'
import { Loader2, Calendar, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/toast-container'
import { cn } from '@/lib/utils'

export interface BreakdownItem {
  id: string
  title: string
  description: string
  cost: string
  timeline: string
}

export interface SendProposalData {
  clientEmail: string
  clientName: string
  finalCost: string
  estimatedTimeline: string
  expiryDate?: string
  personalMessage?: string
  breakdown?: BreakdownItem[]
}

interface SendProposalConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: SendProposalData) => Promise<void>
  isLoading?: boolean
}

const DEFAULT_MESSAGE =
  'Thank you for discussing your project with us. Please find the attached proposal for your review.'

export function SendProposalConfirmation({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: SendProposalConfirmationProps) {
  const { showToast } = useToast()
  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [finalCost, setFinalCost] = useState('')
  const [estimatedTimeline, setEstimatedTimeline] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [personalMessage, setPersonalMessage] = useState(DEFAULT_MESSAGE)
  const [breakdown, setBreakdown] = useState<BreakdownItem[]>([])
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAddBreakdown = () => {
    setBreakdown([...breakdown, { id: Date.now().toString(), title: '', description: '', cost: '', timeline: '' }])
    setShowBreakdown(true)
  }

  const handleRemoveBreakdown = (id: string) => {
    const updated = breakdown.filter((item) => item.id !== id)
    setBreakdown(updated)
    if (updated.length === 0) setShowBreakdown(false)
  }

  const handleBreakdownChange = (id: string, field: keyof BreakdownItem, value: string) => {
    setBreakdown(breakdown.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!clientEmail.trim()) {
      newErrors.clientEmail = 'Client email is required'
    } else if (!emailRegex.test(clientEmail)) {
      newErrors.clientEmail = 'Invalid email format'
    }

    if (!clientName.trim()) {
      newErrors.clientName = 'Client name is required'
    }

    if (!finalCost.trim()) {
      newErrors.finalCost = 'Total cost is required'
    } else if (!/\d/.test(finalCost)) {
      newErrors.finalCost = 'Cost must include a numeric value'
    }

    if (!estimatedTimeline.trim()) {
      newErrors.estimatedTimeline = 'Estimated timeline is required'
    } else if (!/\d/.test(estimatedTimeline)) {
      newErrors.estimatedTimeline = 'Timeline must include a numeric value'
    } else if (!/weeks?|months?|days?/i.test(estimatedTimeline)) {
      newErrors.estimatedTimeline = 'Timeline must include a unit (e.g., "8-10 weeks")'
    }

    if (showBreakdown) {
      breakdown.forEach((item) => {
        if (!item.title.trim()) {
          newErrors[`breakdown-${item.id}-title`] = 'Title is required'
        }
        if (!item.cost.trim() || !/\d/.test(item.cost)) {
          newErrors[`breakdown-${item.id}-cost`] = 'Valid cost required'
        }
        if (!item.timeline.trim() || !/\d/.test(item.timeline)) {
          newErrors[`breakdown-${item.id}-timeline`] = 'Valid timeline required'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      showToast('Please fix the errors below', 'error')
      return
    }

    try {
      await onConfirm({
        clientEmail: clientEmail.trim(),
        clientName: clientName.trim(),
        finalCost: finalCost.trim(),
        estimatedTimeline: estimatedTimeline.trim(),
        expiryDate: expiryDate ? expiryDate : undefined,
        personalMessage: personalMessage || DEFAULT_MESSAGE,
        breakdown: showBreakdown && breakdown.length > 0 ? breakdown : undefined,
      })

      // Reset on success
      setClientEmail('')
      setClientName('')
      setFinalCost('')
      setEstimatedTimeline('')
      setExpiryDate('')
      setPersonalMessage(DEFAULT_MESSAGE)
      setBreakdown([])
      setShowBreakdown(false)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send proposal'
      showToast(message, 'error')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen)
      if (!newOpen) {
        setErrors({})
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden h-full">
          {/* Sticky Header */}
          <DialogHeader className="px-6 py-5 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
            <DialogTitle className="text-xl">Finalize & Send Proposal</DialogTitle>
            <DialogDescription>
              Confirm project details. These values will replace placeholders in your proposal document.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-muted/10">
            
            {/* Core Details */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase border-b pb-2">Client Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="clientName" className="text-sm font-medium text-foreground">
                    Client Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value)
                      if (errors.clientName) setErrors({ ...errors, clientName: '' })
                    }}
                    placeholder="e.g. Acme Corp"
                    disabled={isLoading}
                    className={cn(
                      'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-sm',
                      errors.clientName ? 'border-destructive focus-visible:ring-destructive' : 'border-input hover:border-ring/50'
                    )}
                  />
                  {errors.clientName && <p className="text-xs text-destructive">{errors.clientName}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Client Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value)
                      if (errors.clientEmail) setErrors({ ...errors, clientEmail: '' })
                    }}
                    placeholder="client@example.com"
                    disabled={isLoading}
                    className={cn(
                      'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-sm',
                      errors.clientEmail ? 'border-destructive focus-visible:ring-destructive' : 'border-input hover:border-ring/50'
                    )}
                  />
                  {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase border-b pb-2">Project Estimates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="cost" className="text-sm font-medium text-foreground">
                    Total Cost <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="cost"
                    type="text"
                    value={finalCost}
                    onChange={(e) => {
                      setFinalCost(e.target.value)
                      if (errors.finalCost) setErrors({ ...errors, finalCost: '' })
                    }}
                    placeholder="e.g. $15,000"
                    disabled={isLoading}
                    className={cn(
                      'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-sm',
                      errors.finalCost ? 'border-destructive focus-visible:ring-destructive' : 'border-input hover:border-ring/50'
                    )}
                  />
                  {errors.finalCost && <p className="text-xs text-destructive">{errors.finalCost}</p>}
                </div>
                <div className="space-y-2">
                  <label htmlFor="timeline" className="text-sm font-medium text-foreground">
                    Estimated Timeline <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="timeline"
                    type="text"
                    value={estimatedTimeline}
                    onChange={(e) => {
                      setEstimatedTimeline(e.target.value)
                      if (errors.estimatedTimeline) setErrors({ ...errors, estimatedTimeline: '' })
                    }}
                    placeholder="e.g. 6-8 weeks"
                    disabled={isLoading}
                    className={cn(
                      'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors shadow-sm',
                      errors.estimatedTimeline ? 'border-destructive focus-visible:ring-destructive' : 'border-input hover:border-ring/50'
                    )}
                  />
                  {errors.estimatedTimeline && <p className="text-xs text-destructive">{errors.estimatedTimeline}</p>}
                </div>
              </div>
            </div>

            {/* Breakdown Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase">Cost & Timeline Breakdown</h3>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleAddBreakdown}
                  className="h-8 text-xs px-3 text-primary hover:bg-primary/10 gap-1.5 rounded-full"
                >
                  <Plus className="size-3.5" /> Add Breakdown
                </Button>
              </div>

              {showBreakdown && breakdown.length > 0 && (
                <div className="space-y-4 pt-1">
                  {breakdown.map((item) => (
                    <div key={item.id} className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBreakdown(item.id)}
                        className="absolute right-2 top-2 size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6">
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Task / Phase</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              handleBreakdownChange(item.id, 'title', e.target.value)
                              if (errors[`breakdown-${item.id}-title`]) setErrors({ ...errors, [`breakdown-${item.id}-title`]: '' })
                            }}
                            placeholder="e.g. Discovery & Design"
                            className={cn(
                              'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              errors[`breakdown-${item.id}-title`] ? 'border-destructive' : 'border-input'
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Cost</label>
                          <input
                            type="text"
                            value={item.cost}
                            onChange={(e) => {
                              handleBreakdownChange(item.id, 'cost', e.target.value)
                              if (errors[`breakdown-${item.id}-cost`]) setErrors({ ...errors, [`breakdown-${item.id}-cost`]: '' })
                            }}
                            placeholder="$5,000"
                            className={cn(
                              'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              errors[`breakdown-${item.id}-cost`] ? 'border-destructive' : 'border-input'
                            )}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Timeline</label>
                          <input
                            type="text"
                            value={item.timeline}
                            onChange={(e) => {
                              handleBreakdownChange(item.id, 'timeline', e.target.value)
                              if (errors[`breakdown-${item.id}-timeline`]) setErrors({ ...errors, [`breakdown-${item.id}-timeline`]: '' })
                            }}
                            placeholder="2 weeks"
                            className={cn(
                              'flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              errors[`breakdown-${item.id}-timeline`] ? 'border-destructive' : 'border-input'
                            )}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleBreakdownChange(item.id, 'description', e.target.value)}
                            placeholder="Brief details about this phase..."
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground uppercase border-b pb-2">Additional Options</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="expiry" className="text-sm font-medium text-foreground">
                    Proposal Expiry Date <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      id="expiry"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      disabled={isLoading}
                      className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm transition-colors hover:border-ring/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-foreground">
                    Personalized Email Message <span className="text-muted-foreground font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="message"
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    placeholder="Custom message to include in the email body"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-sans placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none shadow-sm transition-colors hover:border-ring/50"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Sticky Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border bg-card/95 backdrop-blur-sm sticky bottom-0 z-10 flex-col sm:flex-row gap-3">
            <div className="mr-auto hidden sm:block">
              <p className="text-xs text-muted-foreground mt-2">
                Total:{' '}
                <strong className="text-foreground">{finalCost || '$0'}</strong> / <strong className="text-foreground">{estimatedTimeline || '0 weeks'}</strong>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="sm:w-auto w-full h-10"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="sm:w-auto w-full shadow-md bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 h-10 px-8 font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isLoading ? 'Sending Proposal...' : 'Send Proposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

