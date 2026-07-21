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

// Inner shell that has access to the discovery context
function WorkspaceInner() {
  const { discovery, isLoading } = useDiscovery()
  const [mobileView, setMobileView] = useState<'chat' | 'docs'>('chat')

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <AppSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col print:h-auto print:overflow-visible">
        <div className="print:hidden">
          <AppHeader
            projectName={discovery.projectName || 'New Project'}
            domain={discovery.domain || 'Discovery in progress…'}
          />
        </div>

        {/* Mobile view switcher */}
        <div className="flex shrink-0 gap-1 border-b border-border bg-background p-2 lg:hidden print:hidden">
          <button
            onClick={() => setMobileView('chat')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
              mobileView === 'chat'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground',
            )}
          >
            <MessagesSquare className="size-4" />
            Chat
          </button>
          <button
            onClick={() => setMobileView('docs')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors',
              mobileView === 'docs'
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground',
            )}
          >
            <LayoutDashboard className="size-4" />
            Project Blueprint
          </button>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm print:hidden">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-chart-1" />
              <p className="font-mono text-xs tracking-wider text-muted-foreground">
                LOADING PROJECT…
              </p>
            </div>
          </div>
        )}

        {/* Split view */}
        <main className="flex min-h-0 flex-1 print:h-auto print:overflow-visible">
          <div
            className={cn(
              'min-w-0 flex-1 border-r border-border lg:block lg:max-w-[46%] print:hidden',
              mobileView === 'chat' ? 'block' : 'hidden',
            )}
          >
            <DiscoveryChat />
          </div>
          <div
            className={cn(
              'min-w-0 flex-1 lg:block print:w-full print:block print:overflow-visible print:h-auto',
              mobileView === 'docs' ? 'block' : 'hidden',
            )}
          >
            <KickoffReportViewer />
          </div>
        </main>
      </div>
    </div>
  )
}

// Outer shell that sets up the context
export function WorkspaceShell({ projectId }: { projectId: string }) {
  return (
    <DiscoveryProvider projectId={projectId}>
      <ErrorBoundary>
        <WorkspaceInner />
      </ErrorBoundary>
    </DiscoveryProvider>
  )
}

// Legacy export for backwards compatibility
export { WorkspaceShell as Workspace }
