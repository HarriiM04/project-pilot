'use client'

import { useState } from 'react'
import { Loader2, Calendar } from 'lucide-react'
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

interface SendProposalConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: SendProposalData) => Promise<void>
  isLoading?: boolean
}

export interface SendProposalData {
  clientEmail: string
  clientName: string
  finalCost: string
  estimatedTimeline: string
  expiryDate?: string
  personalMessage?: string
}

const DEFAULT_MESSAGE =
  'Thank you for discussing your project with us. Please find the attached proposal for your review.'

/**
 * SendProposalConfirmation dialog
 * Collects client email, final cost, timeline, and optional expiry date before sending
 */
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
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!clientEmail.trim()) {
      newErrors.clientEmail = 'Client email is required'
    } else if (!emailRegex.test(clientEmail)) {
      newErrors.clientEmail = 'Invalid email format'
    }

    // Validate client name
    if (!clientName.trim()) {
      newErrors.clientName = 'Client name is required'
    }

    // Validate cost (must include $ and number)
    if (!finalCost.trim()) {
      newErrors.finalCost = 'Final cost is required'
    } else if (!/\d/.test(finalCost)) {
      newErrors.finalCost = 'Cost must include a numeric value (e.g., $25,000 or $15,000-$20,000)'
    }

    // Validate timeline (must include number and unit)
    if (!estimatedTimeline.trim()) {
      newErrors.estimatedTimeline = 'Estimated timeline is required'
    } else if (!/\d/.test(estimatedTimeline)) {
      newErrors.estimatedTimeline = 'Timeline must include a numeric value'
    } else if (!/weeks?|months?|days?/i.test(estimatedTimeline)) {
      newErrors.estimatedTimeline = 'Timeline must include a unit (e.g., "8-10 weeks", "3 months")'
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
      })

      // Reset form on success
      setClientEmail('')
      setClientName('')
      setFinalCost('')
      setEstimatedTimeline('')
      setExpiryDate('')
      setPersonalMessage(DEFAULT_MESSAGE)
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Finalize & Send Proposal</DialogTitle>
            <DialogDescription>
              Enter the final project details. These will replace the placeholders in the proposal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Client Email */}
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
                  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.clientEmail ? 'border-destructive' : 'border-input'
                )}
              />
              {errors.clientEmail && (
                <p className="text-xs text-destructive">{errors.clientEmail}</p>
              )}
            </div>

            {/* Client Name */}
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
                placeholder="John Doe"
                disabled={isLoading}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.clientName ? 'border-destructive' : 'border-input'
                )}
              />
              {errors.clientName && (
                <p className="text-xs text-destructive">{errors.clientName}</p>
              )}
            </div>

            {/* Final Cost */}
            <div className="space-y-2">
              <label htmlFor="cost" className="text-sm font-medium text-foreground">
                Final Project Cost <span className="text-destructive">*</span>
              </label>
              <input
                id="cost"
                type="text"
                value={finalCost}
                onChange={(e) => {
                  setFinalCost(e.target.value)
                  if (errors.finalCost) setErrors({ ...errors, finalCost: '' })
                }}
                placeholder="e.g. $15,000 or $10,000 - $15,000"
                disabled={isLoading}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.finalCost ? 'border-destructive' : 'border-input'
                )}
              />
              {errors.finalCost && (
                <p className="text-xs text-destructive">{errors.finalCost}</p>
              )}
            </div>

            {/* Estimated Timeline */}
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
                placeholder="e.g. 6-8 weeks or Q1 2024"
                disabled={isLoading}
                className={cn(
                  'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  errors.estimatedTimeline ? 'border-destructive' : 'border-input'
                )}
              />
              {errors.estimatedTimeline && (
                <p className="text-xs text-destructive">{errors.estimatedTimeline}</p>
              )}
            </div>

            {/* Expiry Date (Optional) */}
            <div className="space-y-2">
              <label htmlFor="expiry" className="text-sm font-medium text-foreground">
                Proposal Expiry Date <span className="text-muted-foreground">(Optional)</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  id="expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Personal Message (Optional) */}
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium text-foreground">
                Email Message <span className="text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                id="message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                disabled={isLoading}
                rows={4}
                placeholder="Custom message to include in the email (or leave default)"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the default message
              </p>
            </div>

            {/* Summary Box */}
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>The proposal will be finalized with:</strong>
                <br />• Cost: <span className="font-mono">{finalCost || '(pending)'}</span>
                <br />• Timeline: <span className="font-mono">{estimatedTimeline || '(pending)'}</span>
                {expiryDate && (
                  <>
                    <br />• Expires: <span className="font-mono">{expiryDate}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isLoading ? 'Sending...' : 'Send Proposal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
