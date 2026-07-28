'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function SendProposalDialog({
  projectId,
  reportMarkdown,
  projectName,
}: {
  projectId: string
  reportMarkdown: string
  projectName: string
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [cost, setCost] = useState('')
  const [timeline, setTimeline] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSending(true)
    setError(null)

    try {
      const res = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          clientEmail: email,
          clientName: clientName || 'Valued Client',
          costEstimate: cost,
          timelineEstimate: timeline,
          reportMarkdown,
          projectName,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to send email')
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setEmail('')
        setClientName('')
        setCost('')
        setTimeline('')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 px-3 text-xs font-medium print:hidden">
          <Send className="size-3.5" />
          <span>Send Proposal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSend}>
          <DialogHeader>
            <DialogTitle>Send Project Proposal</DialogTitle>
            <DialogDescription>
              Email the requirements document to your client along with a cost and timeline estimate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success ? (
              <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
                Email sent successfully!
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <label htmlFor="clientName" className="text-sm font-medium">
                    Client Name
                  </label>
                  <input
                    id="clientName"
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Doe"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Client Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="cost" className="text-sm font-medium">
                    Estimated Cost (Optional)
                  </label>
                  <input
                    id="cost"
                    type="text"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g. $5,000 - $8,000"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="timeline" className="text-sm font-medium">
                    Estimated Timeline (Optional)
                  </label>
                  <input
                    id="timeline"
                    type="text"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="e.g. 4-6 weeks"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </>
            )}
          </div>
          {!success && (
            <DialogFooter>
              <Button type="submit" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send to Client
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
