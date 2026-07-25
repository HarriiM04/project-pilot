'use client'

import { Loader2, Mail, RefreshCw, Sparkles } from 'lucide-react'
import { BrandMark, BrandLockup } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { createClient } from '@/lib/supabase/client'

gsap.registerPlugin(SplitText, useGSAP)

// ── Error classifier ─────────────────────────────────────────────────────────

type AuthErrorKind =
  | 'email_rate_limit'
  | 'email_not_confirmed'
  | 'invalid_credentials'
  | 'user_already_exists'
  | 'weak_password'
  | 'generic'

function classifyError(message: string): AuthErrorKind {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many') || m.includes('email rate limit exceeded'))
    return 'email_rate_limit'
  if (m.includes('email not confirmed') || m.includes('not confirmed'))
    return 'email_not_confirmed'
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password'))
    return 'invalid_credentials'
  if (m.includes('already registered') || m.includes('user already exists') || m.includes('already been registered'))
    return 'user_already_exists'
  if (m.includes('password should') || m.includes('at least'))
    return 'weak_password'
  return 'generic'
}

const ERROR_MESSAGES: Record<AuthErrorKind, { title: string; body: string }> = {
  email_rate_limit: {
    title: 'Email limit reached',
    body: "Supabase's free tier allows 4 confirmation emails per hour. Please wait ~60 minutes or use a different email address.",
  },
  email_not_confirmed: {
    title: 'Email not confirmed',
    body: 'Check your inbox (and spam folder) for a confirmation link. Once confirmed, sign in here.',
  },
  invalid_credentials: {
    title: 'Incorrect email or password',
    body: 'Double-check your credentials and try again. Passwords are case-sensitive.',
  },
  user_already_exists: {
    title: 'Account already exists',
    body: 'An account with this email already exists. Switch to Sign In to access your workspace.',
  },
  weak_password: {
    title: 'Password too weak',
    body: 'Please choose a password with at least 6 characters.',
  },
  generic: {
    title: 'Something went wrong',
    body: '',
  },
}

// ── Resend confirmation email ─────────────────────────────────────────────────

const RESEND_COOLDOWN_S = 60

function ResendConfirmation({ email, siteUrl }: { email: string; siteUrl: string }) {
  const supabase = createClient()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_S)
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const resend = async () => {
    if (!email || cooldown > 0) return
    setStatus('sending')
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${siteUrl}/auth/callback` },
      })
      if (error) throw error
      setStatus('sent')
      startCooldown()
    } catch {
      setStatus('error')
    }
  }

  if (!email) return null

  return (
    <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="size-3.5 shrink-0" />
        {status === 'sent'
          ? 'Confirmation email resent — check your inbox.'
          : status === 'error'
          ? 'Could not resend. Try again later.'
          : `Didn't get the email? Resend to ${email}`}
      </div>
      <button
        onClick={resend}
        disabled={status === 'sending' || cooldown > 0}
        className="ml-3 flex shrink-0 items-center gap-1 text-xs font-medium text-primary disabled:opacity-50 transition-opacity hover:opacity-70 cursor-pointer disabled:cursor-not-allowed"
      >
        {status === 'sending' ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        {cooldown > 0 ? `${cooldown}s` : 'Resend'}
      </button>
    </div>
  )
}

// ── Animated floating-label input (UIverse-style) ────────────────────────────

function AnimatedInput({
  id, type, value, onChange, placeholder, required, autoComplete, minLength,
}: {
  id: string; type: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string; required?: boolean; autoComplete?: string; minLength?: number
}) {
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0

  return (
    <div className="relative group">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className={[
          'peer w-full rounded-xl border px-4 pt-5 pb-2 text-sm outline-none',
          'bg-muted/30 dark:bg-white/[0.05]',
          'text-foreground',
          'transition-all duration-300',
          'placeholder-shown:pt-3.5 placeholder-shown:pb-3.5',
          focused
            ? 'border-ring ring-2 ring-ring/25'
            : 'border-border hover:border-ring/50',
        ].join(' ')}
      />
      <label
        htmlFor={id}
        className={[
          'pointer-events-none absolute left-4 transition-all duration-200 select-none',
          focused || hasValue
            ? 'top-1.5 text-[10px] font-semibold tracking-wide text-ring'
            : 'top-3.5 text-sm text-muted-foreground',
        ].join(' ')}
      >
        {placeholder}
      </label>
      {/* Glow border gradient on focus */}
      <div
        className={[
          'pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-300',
          'bg-gradient-to-r from-ring/10 via-accent/10 to-ring/10',
          focused ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
    </div>
  )
}

// ── Shimmer submit button (UIverse-style) ────────────────────────────────────

function ShimmerButton({
  loading, disabled, children,
}: { loading: boolean; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className={[
        'relative w-full overflow-hidden rounded-xl py-3 text-sm font-semibold text-white',
        'transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]',
        'cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30',
        // shimmer layer
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent',
        'before:transition-transform before:duration-700',
        'hover:before:translate-x-full',
        'hover:shadow-lg hover:shadow-blue-500/30',
      ].join(' ')}
      style={{ background: 'linear-gradient(135deg, #1a2340 0%, #2d6ef5 55%, #6b5ce7 100%)' }}
    >
      <span className="relative flex items-center justify-center gap-2">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {children}
      </span>
    </button>
  )
}

// ── Google button ─────────────────────────────────────────────────────────────

function GoogleButton({
  loading, onClick,
}: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={[
        'relative w-full overflow-hidden rounded-xl border border-border bg-background',
        'py-3 text-sm font-medium',
        'flex items-center justify-center gap-3',
        'cursor-pointer transition-all duration-300 hover:bg-muted hover:border-ring/40 hover:shadow-md',
        'hover:scale-[1.01] active:scale-[0.99]',
        'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30',
      ].join(' ')}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <svg className="size-4 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      )}
      Continue with Google
    </button>
  )
}

// ── Left branding panel with GSAP animations ─────────────────────────────────

function BrandingPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLHeadingElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLParagraphElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Badge entrance
    tl.fromTo(badgeRef.current,
      { opacity: 0, y: -16, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6 }
    )

    // Headline word-by-word split
    if (headlineRef.current) {
      const split = new SplitText(headlineRef.current, { type: 'words' })
      tl.fromTo(split.words,
        { opacity: 0, y: 30, rotationX: -40 },
        { opacity: 1, y: 0, rotationX: 0, duration: 0.6, stagger: 0.07 },
        '-=0.2'
      )
    }

    // Subtitle
    tl.fromTo(subtitleRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.5 },
      '-=0.3'
    )

    // Feature cards stagger
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.feature-card')
      tl.fromTo(cards,
        { opacity: 0, y: 24, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1 },
        '-=0.2'
      )
    }

    // Footer
    tl.fromTo(footerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4 },
      '-=0.1'
    )
  }, { scope: panelRef })

  const features = [
    { label: 'Discovery Docs', value: 'Auto-generated' },
    { label: 'BRD / PRD / SRS', value: 'Structured output' },
    { label: 'User Stories', value: 'Instant extraction' },
    { label: 'Architecture', value: 'AI-designed' },
  ]

  return (
    <div ref={panelRef} className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0f1628] p-10 relative overflow-hidden">
      {/* Deep navy base — brand background */}
      {/* Blue glow top-left */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[500px] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #2d6ef5 0%, transparent 70%)' }} />
      {/* Purple glow bottom-right */}
      <div className="pointer-events-none absolute -bottom-40 -right-20 size-[400px] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #6b5ce7 0%, transparent 70%)' }} />
      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Brand logo */}
      <div className="relative">
        <BrandLockup textSize="text-lg" variant="light" />
      </div>

      {/* Hero content */}
      <div className="relative space-y-6">
        {/* Animated badge */}
        <div ref={badgeRef} className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 opacity-0">
          <Sparkles className="size-3.5 text-blue-400 animate-pulse" />
          <span className="font-mono text-xs tracking-widest text-blue-300">AI PRE-SALES ENGINEER</span>
        </div>

        {/* Split-text headline */}
        <h1
          ref={headlineRef}
          className="text-4xl font-bold leading-tight text-white [perspective:800px]"
        >
          Turn conversations<br />into requirements.
        </h1>

        {/* Subtitle */}
        <p ref={subtitleRef} className="text-base leading-relaxed text-blue-100/60 opacity-0">
          ProjectPilot listens to your discovery calls and automatically generates
          BRDs, PRDs, SRS documents, user stories, and architecture blueprints —
          powered by Gemini&nbsp;AI.
        </p>

        {/* Feature cards */}
        <div ref={cardsRef} className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="feature-card group rounded-xl border border-white/10 bg-white/5 p-3 opacity-0 transition-all duration-300 hover:border-blue-400/30 hover:bg-white/10 hover:shadow-lg hover:-translate-y-0.5 cursor-default backdrop-blur-sm"
            >
              <p className="font-mono text-[10px] tracking-wider text-blue-300/70">{f.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <p ref={footerRef} className="relative font-mono text-[10px] tracking-wider text-white/30 opacity-0">
        © {new Date().getFullYear()} PROJECTPILOT · POWERED BY GEMINI 2.0 FLASH
      </p>
    </div>
  )
}

// ── Animated tab switcher (21st.dev-style sliding pill) ──────────────────────

function TabSwitcher({
  tab, onSwitch,
}: { tab: 'login' | 'signup'; onSwitch: (t: 'login' | 'signup') => void }) {
  return (
    <div className="relative flex rounded-xl border border-border bg-muted/40 p-1">
      {/* Sliding indicator */}
      <div
        className={[
          'absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-background shadow-sm',
          'transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          tab === 'login' ? 'translate-x-0 left-1' : 'translate-x-full left-1',
        ].join(' ')}
      />
      {(['login', 'signup'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSwitch(t)}
          className={[
            'relative z-10 flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors duration-200 cursor-pointer',
            tab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
          ].join(' ')}
        >
          {t === 'login' ? 'Sign In' : 'Sign Up'}
        </button>
      ))}
    </div>
  )
}

// ── Main auth form ────────────────────────────────────────────────────────────

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const orgSlug = searchParams.get('org') || ''
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

  const [tab, setTab] = useState<'login' | 'signup'>(orgSlug ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null)
  const [errorRaw, setErrorRaw] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  const formPanelRef = useRef<HTMLDivElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const items = formPanelRef.current?.querySelectorAll('.form-animate')
    if (items) {
      gsap.fromTo(items,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.2 }
      )
    }
  }, { scope: formPanelRef })

  useEffect(() => {
    if ((errorKind || success) && alertRef.current) {
      gsap.fromTo(alertRef.current,
        { opacity: 0, y: -12, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
      )
    }
  }, [errorKind, success])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      const decoded = decodeURIComponent(err)
      setErrorKind(classifyError(decoded))
      setErrorRaw(decoded)
    }
  }, [searchParams])

  const clearAlerts = () => { setErrorKind(null); setErrorRaw(''); setSuccess(null) }
  const switchTab = (t: 'login' | 'signup') => { setTab(t); clearAlerts(); setAwaitingConfirmation(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAlerts()
    setLoading(true)
    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) {
          const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', u.id).single()
          router.push(profile?.is_admin ? '/admin' : '/projects')
        } else {
          router.push('/projects')
        }
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, org_slug: orgSlug }, emailRedirectTo: `${siteUrl}/auth/callback` },
        })
        if (error) throw error
        setSuccess('Account created! Check your email for a confirmation link, then sign in.')
        setConfirmedEmail(email)
        setAwaitingConfirmation(true)
        setTab('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      const kind = classifyError(msg)
      setErrorKind(kind)
      setErrorRaw(msg)
      if (kind === 'email_not_confirmed') { setConfirmedEmail(email); setAwaitingConfirmation(true) }
    } finally {
      setLoading(false)
    }
  }

  const errInfo = errorKind ? ERROR_MESSAGES[errorKind] : null

  return (
    <div className="flex min-h-dvh w-full overflow-hidden">
      {/* ── Left branding ── */}
      <BrandingPanel />

      {/* ── Right form panel — respects dark/light mode ── */}
      <div
        ref={formPanelRef}
        className="relative flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-12 bg-background transition-colors duration-300"
      >
        {/* Theme toggle — top-right of form panel */}
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-5">

          {/* Mobile logo */}
          <div className="form-animate flex items-center justify-between lg:hidden opacity-0">
            <BrandLockup textSize="text-base" variant="auto" />
          </div>

          {/* Heading */}
          <div className="form-animate opacity-0">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === 'login' ? 'Sign in to your workspace' : 'Start your first discovery session'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="form-animate opacity-0">
            <TabSwitcher tab={tab} onSwitch={switchTab} />
          </div>

          {/* Alerts */}
          <div ref={alertRef}>
            {errInfo && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm font-semibold text-destructive">{errInfo.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-destructive/80">{errInfo.body || errorRaw}</p>
                {errorKind === 'email_rate_limit' && (
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">💡 Quick fix for development:</p>
                    <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
                      In Supabase → Authentication → Settings, toggle <strong>"Confirm email"</strong> OFF.
                    </p>
                  </div>
                )}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                {success}
              </div>
            )}
            {awaitingConfirmation && confirmedEmail && (
              <ResendConfirmation email={confirmedEmail} siteUrl={siteUrl} />
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="form-animate space-y-4 opacity-0">
            {tab === 'signup' && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <AnimatedInput
                  id="fullName" type="text" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Full Name" required
                />
              </div>
            )}
            <AnimatedInput
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email" required autoComplete="email"
            />
            <AnimatedInput
              id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'Password (min 6 chars)' : 'Password'}
              required minLength={6}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />
            <ShimmerButton loading={loading} disabled={loading}>
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </ShimmerButton>
          </form>

          {/* Divider */}
          <div className="form-animate flex items-center gap-3 opacity-0">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google */}
          <div className="form-animate opacity-0">
            <GoogleButton
              loading={googleLoading}
              onClick={async () => {
                setGoogleLoading(true)
                clearAlerts()
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: `${siteUrl}/auth/callback`,
                    queryParams: { access_type: 'offline', prompt: 'consent' },
                  },
                })
                if (error) { setErrorKind(classifyError(error.message)); setErrorRaw(error.message); setGoogleLoading(false) }
              }}
            />
          </div>

          <p className="form-animate text-center text-xs text-muted-foreground opacity-0">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
