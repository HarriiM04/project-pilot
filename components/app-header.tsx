'use client'

import { ChevronRight, LogOut, Share2, Sparkles, Check, Mail, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { getInitials } from '@/lib/utils'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { useToast } from '@/components/toast-container'

interface AppHeaderProps {
  projectName: string
  domain: string
  collapsed: boolean
  onCollapse: (v: boolean) => void
}

export function AppHeader({ projectName, domain, collapsed, onCollapse }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [userInitials, setUserInitials] = useState('ME')
  const [userEmail, setUserEmail]       = useState('')
  const [userName, setUserName]         = useState('')
  const [isOpen, setIsOpen]             = useState(false)
  const [copied, setCopied]             = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      const name  = (data.user?.user_metadata?.full_name as string) ?? email
      setUserEmail(email)
      setUserName(name.split('@')[0] || 'User')
      setUserInitials(getInitials(name, email))
    })
  }, [supabase.auth])

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowLogoutConfirm(false)
    showToast('You have been signed out successfully', 'success')
    router.push('/auth')
    router.refresh()
  }

  return (
    <>
      <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-6">

        {/* Collapse toggle + Breadcrumb */}
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => onCollapse(!collapsed)}
            className="hidden md:flex items-center justify-center size-8 rounded-xl border border-border text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground hover:bg-muted cursor-pointer"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>

          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            <button
              onClick={() => router.push('/projects')}
              className="hidden cursor-pointer text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Projects
            </button>
            <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/50 sm:inline" />
            <span className="truncate font-semibold text-foreground">{projectName}</span>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
            <span className="hidden font-mono text-[10px] tracking-widest text-muted-foreground sm:inline">
              DISCOVERY
            </span>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {domain && (
            <span className="hidden items-center gap-1.5 rounded-full border border-ring/30 bg-ring/10 px-2.5 py-1 font-mono text-[10px] tracking-wide text-ring lg:inline-flex">
              <Sparkles className="size-3" />
              {domain.toUpperCase()}
            </span>
          )}

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground cursor-pointer"
          >
            {copied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>

          <ThemeToggle />

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex size-8 items-center justify-center rounded-full font-mono text-xs font-bold text-white cursor-pointer shadow-md transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}
              aria-label="Account menu"
            >
              {userInitials}
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-[199]" onClick={() => setIsOpen(false)} />
                <div className="absolute right-0 top-11 z-[200] w-60 rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="border-b border-border p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 60%, #6b5ce7 100%)' }}
                      >
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{userName}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Mail className="size-3 shrink-0" />{userEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setIsOpen(false); setShowLogoutConfirm(true) }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Logout confirmation */}
      <ConfirmationDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out? You'll need to sign in again to access your projects."
        confirmLabel="Sign Out"
        onConfirm={handleLogout}
        icon={<LogOut className="size-5 text-muted-foreground" />}
      />
    </>
  )
}
