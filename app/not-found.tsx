'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import Link from 'next/link'
import { ArrowLeft, Home, MessageSquare } from 'lucide-react'
import { BrandLockup } from '@/components/brand-logo'

gsap.registerPlugin(useGSAP)

export default function NotFound() {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef     = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLDivElement>(null)
  const btnsRef      = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    tl.fromTo(imageRef.current,
      { opacity: 0, y: 40, scale: 0.92 },
      { opacity: 1, y: 0,  scale: 1,    duration: 0.8 }
    )
    .fromTo(textRef.current?.children ?? [],
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.55, stagger: 0.1 },
      '-=0.4'
    )
    .fromTo(btnsRef.current?.children ?? [],
      { opacity: 0, y: 16, scale: 0.95 },
      { opacity: 1, y: 0,  scale: 1,    duration: 0.4, stagger: 0.1 },
      '-=0.2'
    )

    // Subtle floating animation on image
    gsap.to(imageRef.current, {
      y: -12,
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
          style={{ background: 'radial-gradient(circle, rgba(45,110,245,0.14) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 size-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(107,92,231,0.12) 0%, transparent 70%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-20 dark:opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(45,110,245,0.2) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      </div>


      {/* Main content */}
      <div className="flex w-full max-w-4xl flex-col items-center gap-2">

        {/* Illustration */}
        <div ref={imageRef} className="size-70 md:size-120 flex-1 flex items-center justify-center">
          <img src="/error.jpg" alt="404"/>
        </div>

        {/* Text content */}
        <div ref={textRef} className="flex flex-1 flex-col gap-5 text-center">
          {/* 404 large number */}
          <div className="font-mono text-8xl font-black leading-none tracking-tight lg:text-9xl"
            style={{
              background: 'linear-gradient(135deg, #2d6ef5 0%, #6b5ce7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
            404
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
              Page not found
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed max-w-sm mx-auto lg:mx-0">
              Looks like this page took a nap. The URL you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Buttons */}
          <div ref={btnsRef} className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] cursor-pointer before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
              style={{ background: 'linear-gradient(135deg,#1a2340 0%,#2d6ef5 55%,#6b5ce7 100%)' }}
            >
              <Home className="size-4" />
              Go Home
            </Link>

            <Link
              href="/projects"
              className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-ring/40 hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              My Projects
            </Link>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            Need help?{' '}
            <Link href="/projects" className="text-ring hover:underline cursor-pointer inline-flex items-center gap-1">
              <MessageSquare className="size-3" />
              Start a discovery session
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
