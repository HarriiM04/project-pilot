'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, FolderKanban,
  PanelLeftClose, PanelLeftOpen,
  LayoutGrid, LogOut, Mail,
  ChevronDown, ShieldCheck, Menu, X, Sparkles,
} from 'lucide-react'
import { BrandLockup, BrandMark } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { AgencyBrandingModal } from '@/components/agency-branding-modal'
import { useToast } from '@/components/toast-container'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/utils'

const navItems = [
  { href: '/admin',          label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/admin/projects', label: 'All Projects', icon: FolderKanban,    exact: false },
]

interface AdminShellProps {
  children: React.ReactNode
  userEmail: string
  userName: string
}

export function AdminShell({ children, userEmail, userName }: AdminShellProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()
  const supabase = createClient()

  const [collapsed,      setCollapsed]      = useState(false)
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [logoutOpen,     setLogoutOpen]     = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [brandingOpen,   setBrandingOpen]   = useState(false)

  const initials = getInitials(userName || userEmail, userEmail)
  const displayName = userName || userEmail.split('@')[0] || 'Admin'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setLogoutOpen(false)
    showToast('You have been signed out successfully', 'success')
    router.push('/auth')
    router.refresh()
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">

      {/* ── Sidebar (desktop only) ── */}
      <aside className={cn(
        'hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <Link href="/admin"
          className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 hover:opacity-80 transition-opacity">
          {collapsed
            ? <BrandMark className="size-8 shrink-0" />
            : <BrandLockup textSize="text-sm" variant="auto" />
          }
        </Link>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  collapsed && 'justify-center px-0',
                  active
                    ? 'text-white shadow-md'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
                style={active ? { background: 'linear-gradient(135deg,#1a2340 0%,#2d6ef5 60%,#6b5ce7 100%)' } : {}}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* ── Mobile menu drawer ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-[200] w-72 bg-sidebar border-r border-border shadow-2xl md:hidden animate-in slide-in-from-left duration-300">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <BrandLockup textSize="text-sm" variant="auto" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground hover:bg-sidebar-accent cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      active
                        ? 'text-white shadow-md'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                    )}
                    style={active ? { background: 'linear-gradient(135deg,#1a2340 0%,#2d6ef5 60%,#6b5ce7 100%)' } : {}}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}

      {/* ── Main column ── */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

        <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl">

          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden items-center justify-center size-8 rounded-xl border border-border text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground hover:bg-muted cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>

            {/* Desktop collapse */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden md:flex items-center justify-center size-8 rounded-xl border border-border text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground hover:bg-muted cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>

            <span className="text-sm font-semibold text-foreground hidden sm:inline">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? 'Admin'}
            </span>

            <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-ring/30 bg-ring/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-ring">
              <ShieldCheck className="size-3" />
              ADMIN
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <LayoutGrid className="size-3.5" />
              Client View
            </Link>

            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 transition-all hover:bg-muted hover:border-ring/50 cursor-pointer"
              >
                <div className="flex size-7 items-center justify-center rounded-full font-mono text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#1a2340 0%,#2d6ef5 60%,#6b5ce7 100%)' }}>
                  {initials}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
                <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform duration-200', dropdownOpen && 'rotate-180')} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[199]" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-11 z-[200] w-64 rounded-2xl border border-border bg-background shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="border-b border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg,#1a2340 0%,#2d6ef5 60%,#6b5ce7 100%)' }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{displayName}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Mail className="size-3 shrink-0" />{userEmail}
                          </p>
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-ring/30 bg-ring/10 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-widest text-ring">
                            <ShieldCheck className="size-2.5" /> ADMIN
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={() => { setDropdownOpen(false); setBrandingOpen(true) }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer mb-1"
                      >
                        <Sparkles className="size-4" />
                        Agency Branding
                      </button>
                      <button
                        onClick={() => { setDropdownOpen(false); setLogoutOpen(true) }}
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

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <ConfirmationDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign Out"
        description="Are you sure you want to sign out of the admin panel?"
        confirmLabel="Sign Out"
        onConfirm={handleLogout}
        icon={<LogOut className="size-5 text-muted-foreground" />}
      />

      <AgencyBrandingModal 
        open={brandingOpen} 
        onOpenChange={setBrandingOpen} 
      />
    </div>
  )
}
