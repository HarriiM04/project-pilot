'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  const handleToggle = () => {
    setSpinning(true)
    setTheme(isDark ? 'light' : 'dark')
    setTimeout(() => setSpinning(false), 400)
  }

  return (
    <button
      aria-label="Toggle color theme"
      onClick={handleToggle}
      className="
        relative flex size-9 items-center justify-center rounded-xl border cursor-pointer
        overflow-hidden transition-all duration-200
        hover:scale-105 active:scale-95
        border-border/60 bg-background/60 text-foreground
        hover:border-ring/50 hover:bg-muted
        dark:border-white/20 dark:bg-white/10 dark:text-white
        dark:hover:border-white/40 dark:hover:bg-white/20
      "
    >
      {/* Sun icon — visible in dark mode (switching to light) */}
      <Sun
        className="absolute size-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          opacity:   isDark ? 1 : 0,
          transform: isDark
            ? spinning ? 'rotate(180deg) scale(1.2)' : 'rotate(0deg) scale(1)'
            : 'rotate(-90deg) scale(0.5)',
        }}
      />

      {/* Moon icon — visible in light mode (switching to dark) */}
      <Moon
        className="absolute size-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          opacity:   isDark ? 0 : 1,
          transform: isDark
            ? 'rotate(90deg) scale(0.5)'
            : spinning ? 'rotate(-30deg) scale(1.2)' : 'rotate(0deg) scale(1)',
        }}
      />
    </button>
  )
}
