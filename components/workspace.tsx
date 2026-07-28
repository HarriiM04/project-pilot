'use client'

import { LayoutDashboard, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { AppSidebar } from '@/components/app-sidebar'
import { DiscoveryChat } from '@/components/discovery-chat'
import { KickoffReportViewer } from '@/components/kickoff-report-viewer'
import { ErrorBoundary } from '@/components/error-boundary'
import { DiscoveryProvider, useDiscovery } from '@/lib/discovery-store'
import { cn } from '@/lib/utils'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

gsap.registerPlugin(useGSAP)

function WorkspaceInner({ isAdmin }: { isAdmin: boolean }) {
  const { discovery, isLoading } = useDiscovery()
  const [mobileView, setMobileView] = useState<'chat' | 'docs'>('chat')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!isLoading && mainRef.current) {
      gsap.fromTo(mainRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [isLoading])

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background text-foreground print:h-auto print:overflow-visible">

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center print:hidden"
          style={{ background: 'linear-gradient(135deg, rgba(10,14,26,0.92) 0%, rgba(26,35,64,0.92) 100%)' }}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="relative size-16">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: '#2d6ef5', borderRightColor: '#6b5ce7', animationDuration: '0.9s' }}
              />
              <div className="absolute inset-3 rounded-full animate-pulse"
                style={{ background: 'radial-gradient(circle, rgba(45,110,245,0.3) 0%, transparent 70%)' }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="font-semibold text-white text-sm tracking-wide">Loading Project</p>
              <p className="font-mono text-[10px] tracking-widest text-white/40">INITIALISING WORKSPACE…</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar — hidden for admin, mobile drawer for regular users ── */}
      {!isAdmin && (
        <>
          {/* Desktop sidebar */}
          <div className="hidden md:block print:hidden">
            <AppSidebar collapsed={collapsed} onCollapse={setCollapsed} />
          </div>

          {/* Mobile drawer */}
          {mobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-[199] bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                onClick={() => setMobileMenuOpen(false)}
              />
              <div className="fixed left-0 top-0 bottom-0 z-[200] w-72 md:hidden animate-in slide-in-from-left duration-300">
                <AppSidebar collapsed={false} onCollapse={() => setMobileMenuOpen(false)} />
              </div>
            </>
          )}
        </>
      )}

      {/* ── Main ── */}
      <div className="relative flex min-w-0 flex-1 flex-col print:h-auto print:overflow-visible">

        {/* Header */}
        <div className="print:hidden">
          <AppHeader
            projectName={discovery.projectName || 'New Project'}
            domain={discovery.domain || 'Discovery in progress…'}
            collapsed={collapsed}
            onCollapse={setCollapsed}
            isAdmin={isAdmin}
            onMobileMenuOpen={() => setMobileMenuOpen(true)}
          />
        </div>

        {/* Mobile tab switcher */}
        <div className="flex shrink-0 gap-1 border-b border-border bg-background/80 p-2 backdrop-blur-sm lg:hidden print:hidden">
          <button
            onClick={() => setMobileView('chat')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all duration-200',
              mobileView === 'chat' ? 'text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            style={mobileView === 'chat' ? { background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 100%)' } : {}}
          >
            <MessagesSquare className="size-4" />
            Chat
          </button>
          <button
            onClick={() => setMobileView('docs')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all duration-200',
              mobileView === 'docs' ? 'text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            style={mobileView === 'docs' ? { background: 'linear-gradient(135deg, #2d6ef5 0%, #6b5ce7 100%)' } : {}}
          >
            <LayoutDashboard className="size-4" />
            Blueprint
          </button>
        </div>

        {/* Split view */}
        <main ref={mainRef} className="flex min-h-0 flex-1 print:h-auto print:overflow-visible">
          <div className={cn(
            'min-w-0 flex-1 border-r border-border lg:block lg:max-w-[46%] print:hidden bg-background',
            mobileView === 'chat' ? 'block' : 'hidden'
          )}>
            <DiscoveryChat />
          </div>
          <div className={cn(
            'min-w-0 flex-1 lg:block print:w-full print:block print:overflow-visible print:h-auto bg-card',
            mobileView === 'docs' ? 'block' : 'hidden'
          )}>
            <KickoffReportViewer />
          </div>
        </main>
      </div>
    </div>
  )
}

export function WorkspaceShell({ projectId, isAdmin = false }: { projectId: string; isAdmin?: boolean }) {
  return (
    <DiscoveryProvider projectId={projectId}>
      <ErrorBoundary>
        <WorkspaceInner isAdmin={isAdmin} />
      </ErrorBoundary>
    </DiscoveryProvider>
  )
}

export { WorkspaceShell as Workspace }
