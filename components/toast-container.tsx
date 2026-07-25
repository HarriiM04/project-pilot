'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ToastNotification, ToastVariant } from './toast-notification'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 11)
    setToasts((prev) => [...prev, { id, message, variant, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[100]">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            style={{ top: `${24 + index * 80}px` }}
            className="pointer-events-auto absolute right-0"
          >
            <ToastNotification
              message={toast.message}
              variant={toast.variant}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
