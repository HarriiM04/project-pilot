'use client'

import { useState, useEffect } from 'react'
import { Sparkles, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseAgencyDetails } from '@/lib/utils'

interface AgencyBrandingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgencyBrandingModal({ open, onOpenChange }: AgencyBrandingModalProps) {
  const [agencyName, setAgencyName] = useState('')
  const [agencyEmail, setAgencyEmail] = useState('')
  const [agencyLogo, setAgencyLogo] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Fetch initial details when opened
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) {
              const details = parseAgencyDetails(data)
              if (details) {
                setAgencyName(details.name)
                setAgencyEmail(details.email || '')
                setAgencyLogo(details.logo)
              }
            }
          })
      }
    })
  }, [open])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file!')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAgencyLogo(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agencyName.trim() || !agencyLogo) {
      alert('Agency/Company Name and Logo are mandatory!')
      return
    }
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const updatedFullName = JSON.stringify({
        agencyName: agencyName.trim(),
        agencyEmail: agencyEmail.trim() || undefined
      })

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedFullName,
          avatar_url: agencyLogo
        })
        .eq('id', user.id)

      if (error) throw error
      alert('Agency branding saved successfully!')
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save branding')
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 text-white" style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5" />
              <h3 className="font-semibold text-lg">Agency Branding Settings</h3>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1 text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="text-xs text-white/70 mt-1.5">
            Set mandatory details for client trust on Requirement Summaries.
          </p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveBranding} className="p-5 space-y-4">
          {/* Agency Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Agency/Company Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Horizon Tech"
              required
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-ring/50 focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
            />
          </div>

          {/* Agency Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Agency Email <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={agencyEmail}
              onChange={(e) => setAgencyEmail(e.target.value)}
              placeholder="e.g. contact@horizontech.com"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-ring/50 focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Agency/Company Logo <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-4">
              {agencyLogo ? (
                <img
                  src={agencyLogo}
                  alt="Logo preview"
                  className="size-14 rounded-xl object-contain border border-border bg-muted p-1"
                />
              ) : (
                <div className="size-14 rounded-xl border border-dashed border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No Logo
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  id="agency-logo-upload"
                  className="hidden"
                />
                <label
                  htmlFor="agency-logo-upload"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-foreground px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
                >
                  {agencyLogo ? 'Change Logo' : 'Upload Logo'}
                </label>
              </div>
            </div>
          </div>

          {/* Save Footer Button */}
          <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
            >
              {isSaving && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save Branding</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
