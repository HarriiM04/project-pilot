'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { useToast } from '@/components/toast-container'

export function AdminSignOut() {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    showToast('You have been signed out successfully', 'success')
    router.push('/auth')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 cursor-pointer"
      >
        <LogOut className="size-3.5" />
        <span className="hidden sm:inline">Sign out</span>
      </button>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign Out"
        description="Are you sure you want to sign out of the admin panel?"
        confirmLabel="Sign Out"
        onConfirm={handleLogout}
        icon={<LogOut className="size-5 text-muted-foreground" />}
      />
    </>
  )
}
