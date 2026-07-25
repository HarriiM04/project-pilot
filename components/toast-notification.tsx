'use client'

import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

gsap.registerPlugin(useGSAP)

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastNotificationProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onClose: () => void
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
}

export function ToastNotification({
  message,
  variant = 'info',
  duration = 3000,
  onClose,
}: ToastNotificationProps) {
  const toastRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const config = variantConfig[variant]
  const Icon = config.icon

  useGSAP(() => {
    if (!toastRef.current) return

    const tl = gsap.timeline()

    tl.fromTo(toastRef.current,
      { x: 400, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
    )

    if (progressRef.current) {
      tl.fromTo(progressRef.current,
        { scaleX: 1 },
        { scaleX: 0, duration: duration / 1000, ease: 'none' },
        '-=0.2'
      )
    }

    const timer = setTimeout(() => {
      if (toastRef.current) {
        gsap.to(toastRef.current, {
          x: 400,
          opacity: 0,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: onClose,
        })
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    if (toastRef.current) {
      gsap.to(toastRef.current, {
        x: 400,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      })
    }
  }

  return (
    <div
      ref={toastRef}
      className={`fixed top-6 right-6 z-[100] w-full max-w-sm rounded-xl border ${config.border} ${config.bg} shadow-2xl backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={`size-5 shrink-0 ${config.iconColor}`} />
        <p className={`flex-1 text-sm font-medium ${config.text}`}>
          {message}
        </p>
        <button
          onClick={handleClose}
          className={`shrink-0 rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer ${config.iconColor}`}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-b-xl bg-black/5 dark:bg-white/5">
        <div
          ref={progressRef}
          className={`h-full origin-left ${config.iconColor.replace('text-', 'bg-')}`}
        />
      </div>
    </div>
  )
}
