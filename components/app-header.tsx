'use client'

import { ChevronRight, LogOut, Share2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { getInitials } from '@/lib/utils'

interface AppHeaderProps {
  projectName: string
  domain: string
}

export function AppHeader({ projectName, domain }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [userInitials, setUserInitials] = useState('ME')
  const [userEmail, setUserEmail] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      const name = (data.user?.user_metadata?.full_name as string) ?? email
      setUserEmail(email)
      setUserInitials(getInitials(name, email))
    })
  }, [supabase.auth])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <button
            onClick={() => router.push('/projects')}
            className="hidden cursor-pointer transition-colors hover:text-foreground sm:inline"
          >
            Projects
          </button>
          <ChevronRight className="hidden size-3.5 sm:inline" />
          <span className="truncate font-medium text-foreground">{projectName}</span>
          <ChevronRight className="size-3.5" />
          <span className="hidden font-mono text-xs tracking-wide text-muted-foreground sm:inline">
            DISCOVERY
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {domain && (
          <span className="hidden items-center gap-1.5 rounded-full border border-accent bg-accent/40 px-2.5 py-1 font-mono text-[10px] tracking-wide text-accent-foreground lg:inline-flex">
            <Sparkles className="size-3" />
            {domain.toUpperCase()}
          </span>
        )}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            alert('Link copied to clipboard!')
          }}
        >
          <Share2 />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-medium text-primary-foreground"
            aria-label="Account menu"
            title={userEmail}
          >
            {userInitials}
          </button>
          {/* Dropdown */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)} 
              />
              <div className="absolute right-0 top-10 z-50 flex min-w-[160px] flex-col rounded-xl border border-border bg-background shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="max-w-[140px] truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogOut className="size-3.5" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
