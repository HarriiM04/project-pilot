'use client'

import { useState, useEffect } from 'react'
import { SplashScreen } from './splash-screen'

export function SplashWrapper({ children }: { children: React.ReactNode }) {
  // null = not yet checked (SSR / first paint), true = show splash, false = skip
  const [showSplash, setShowSplash] = useState<boolean | null>(null)

  useEffect(() => {
    // Runs only on the client, after first paint
    const seen = sessionStorage.getItem('splashScreenSeen') === 'true'
    setShowSplash(!seen)
  }, [])

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashScreenSeen', 'true')
    setShowSplash(false)
  }

  // Still checking — render children immediately at full opacity so there's
  // zero flicker on subsequent navigations
  if (showSplash === null) {
    return <>{children}</>
  }

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      <div className={showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'}>
        {children}
      </div>
    </>
  )
}
