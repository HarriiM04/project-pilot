'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-background p-6 text-center text-foreground">
          <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="size-8" />
          </div>
          <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            {this.state.error?.message || 'An unexpected error occurred while rendering the workspace.'}
          </p>
          <Button onClick={() => window.location.reload()} variant="default">
            Reload Page
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
