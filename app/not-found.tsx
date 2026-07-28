'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import Image from 'next/image'

gsap.registerPlugin(useGSAP)

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef     = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLDivElement>(null)
  const btnsRef      = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(imageRef.current,
      { opacity: 0, y: 30, scale: 0.94 },
      { opacity: 1, y: 0,  scale: 1,   duration: 0.8 }
    )
    .fromTo(textRef.current?.children ?? [],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
      '-=0.4'
    )
    .fromTo(btnsRef.current?.children ?? [],
      { opacity: 0, y: 12, scale: 0.96 },
      { opacity: 1, y: 0,  scale: 1,   duration: 0.35, stagger: 0.1 },
      '-=0.2'
    )

    // Gentle float on image
    gsap.to(imageRef.current, {
      y: -10,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 0.8,
    })
  }, { scope: containerRef })

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-6 bg-white"
    >
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 size-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(45,110,245,0.13) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 size-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(107,92,231,0.11) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(45,110,245,0.25) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      </div>

      {/* Centred layout */}
      <div className="flex w-full max-w-lg flex-col items-center gap-8 text-center">

        {/* Illustration */}
        <div ref={imageRef}>
          <Image
            src="/error.jpg"
            alt="404 — Page not found"
            width={460}
            height={360}
            priority
            className="w-full max-w-sm object-contain select-none pointer-events-none"
          />
        </div>

        {/* Text */}
        <div ref={textRef} className="flex flex-col gap-3 items-center">
          {/* 404 badge */}
          <span
            className="font-mono text-7xl font-black leading-none tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #2d6ef5 0%, #6b5ce7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            404
          </span>

          <h1 className="text-2xl font-bold text-foreground">
            Page not found
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        {/* Buttons */}
        <div ref={btnsRef} className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl active:scale-[0.97] cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
            style={{ background: 'linear-gradient(135deg,#1a2340 0%,#2d6ef5 55%,#6b5ce7 100%)' }}
          >
            <Home className="size-4" />
            Go Home
          </Link>

          <Link
            href="/projects"
            className="flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:border-ring/40 hover:bg-muted cursor-pointer dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
            My Projects
          </Link>
        </div>
      </div>
    </div>
  )
}
