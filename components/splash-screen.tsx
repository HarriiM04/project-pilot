'use client'

import { useRef, useState, useMemo } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { BrandMark } from './brand-logo'

gsap.registerPlugin(useGSAP)

// Pre-generate stable star data so SSR and client always produce identical HTML.
// All values are rounded to 2 decimal places so React's SSR string and the
// client JS number both serialise to the exact same string — no hydration mismatch.
const r2 = (n: number) => Math.round(n * 100) / 100

function generateStars(count: number) {
  const stars = []
  for (let i = 0; i < count; i++) {
    const s  = Math.sin(i * 9301 + 49297) * 0.5 + 0.5
    const s2 = Math.sin(i * 7919 + 13337) * 0.5 + 0.5
    const s3 = Math.sin(i * 6271 + 28657) * 0.5 + 0.5
    const s4 = Math.sin(i * 5381 + 86243) * 0.5 + 0.5
    const s5 = Math.sin(i * 4973 + 37831) * 0.5 + 0.5
    const s6 = Math.sin(i * 3571 + 19661) * 0.5 + 0.5
    stars.push({
      w:     r2(s  * 2.2 + 0.6),
      h:     r2(s2 * 2.2 + 0.6),
      left:  r2(s3 * 100),
      top:   r2(s4 * 100),
      op:    r2(s5 * 0.45 + 0.15),
      delay: r2(s6 * 4),
      dur:   r2(s  * 5 + 2),
    })
  }
  return stars
}

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const logoRef      = useRef<HTMLDivElement>(null)
  const loaderBarRef = useRef<HTMLDivElement>(null)
  const loaderRef    = useRef<HTMLDivElement>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [pct, setPct] = useState(0)

  // Stable star data — same on server and client (no Math.random)
  const stars = useMemo(() => generateStars(60), [])

  useGSAP(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setIsComplete(true)
        setTimeout(onComplete, 300)
      },
    })

    // Phase 1 — Logo pops in
    tl.fromTo(logoRef.current,
      { scale: 0.6, opacity: 0, y: 16 },
      { scale: 1,   opacity: 1, y: 0,  duration: 0.7, ease: 'back.out(1.9)' }
    )

    // Phase 2 — Loader fades in then bar fills
    tl.fromTo(loaderRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
    )
    tl.to(loaderBarRef.current, {
      width: '100%',
      duration: 1.8,
      ease: 'power1.inOut',
      onUpdate() { setPct(Math.round(this.progress() * 100)) },
    })

    // Phase 3 — Brief hold at 100%
    tl.to({}, { duration: 0.3 })

    // Phase 4 — Everything fades out together
    tl.to([logoRef.current, loaderRef.current], {
      opacity: 0,
      scale: 0.95,
      duration: 0.45,
      ease: 'power2.in',
    })

    // Phase 5 — Black curtain lifts away
    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut',
    }, '-=0.1')

  }, { dependencies: [onComplete] })

  if (isComplete) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] overflow-hidden flex flex-col items-center justify-center gap-10"
      style={{ background: 'linear-gradient(135deg, #06091a 0%, #0e1530 50%, #1a2340 100%)' }}
    >
      {/* ── Stars ── */}
      <div className="pointer-events-none absolute inset-0">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width:             `${s.w}px`,
              height:            `${s.h}px`,
              left:              `${s.left}%`,
              top:               `${s.top}%`,
              opacity:           s.op,
              animationDelay:    `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>

      {/* ── Ambient glow behind logo ── */}
      <div
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: '480px',
          height: '480px',
          background: 'radial-gradient(circle, rgba(45,110,245,0.12) 0%, rgba(107,92,231,0.08) 60%, transparent 100%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* ── Logo ── */}
      <div ref={logoRef} className="relative z-10 flex flex-col items-center gap-3" style={{ opacity: 0 }}>
        <BrandMark className="size-24" pColor="white" />
        <p
          className="font-mono text-xs tracking-[0.35em] uppercase text-white/40"
        >
          Project Pilot
        </p>
      </div>

      {/* ── Loader bar + counter ── */}
      <div ref={loaderRef} className="relative z-10 flex flex-col items-center gap-3" style={{ opacity: 0 }}>
        {/* Track */}
        <div className="relative h-[3px] w-56 rounded-full overflow-hidden bg-white/10">
          {/* Fill */}
          <div
            ref={loaderBarRef}
            className="absolute inset-y-0 left-0 w-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #2d6ef5, #6b5ce7, #2d6ef5)',
              boxShadow: '0 0 12px rgba(45,110,245,0.8)',
            }}
          />
        </div>
        {/* Percentage */}
        <span className="font-mono text-xs tabular-nums text-white/50 tracking-widest">
          {String(pct).padStart(3, '0')}%
        </span>
      </div>
    </div>
  )
}
