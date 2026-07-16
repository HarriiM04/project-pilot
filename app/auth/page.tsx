'use client'

import { FileStack, Loader2, Mail, RefreshCw, Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    body: "Supabase's free tier allows 4 confirmation emails per hour. Please wait ~60 minutes or use a different email address. You can also disable email confirmation in your Supabase dashboard (Auth → Settings) for development.",
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

const RESEND_COOLDOWN_S = 60 // 60 seconds between resend attempts

function ResendConfirmation({ email }: { email: string }) {
  const supabase = createClient()
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_S)
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
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
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2.5">
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
        className="ml-3 flex shrink-0 items-center gap-1 text-xs font-medium text-primary disabled:opacity-50"
      >
        {status === 'sending'
          ? <Loader2 className="size-3 animate-spin" />
          : <RefreshCw className="size-3" />
        }
        {cooldown > 0 ? `${cooldown}s` : 'Resend'}
      </button>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorKind, setErrorKind] = useState<AuthErrorKind | null>(null)
  const [errorRaw, setErrorRaw] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [confirmedEmail, setConfirmedEmail] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err) {
      const decoded = decodeURIComponent(err)
      setErrorKind(classifyError(decoded))
      setErrorRaw(decoded)
    }
  }, [searchParams])

  const clearAlerts = () => {
    setErrorKind(null)
    setErrorRaw('')
    setSuccess(null)
  }

  const switchTab = (t: 'login' | 'signup') => {
    setTab(t)
    clearAlerts()
    setAwaitingConfirmation(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAlerts()
    setLoading(true)

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/projects')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
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

      // If "email not confirmed" during login, offer resend
      if (kind === 'email_not_confirmed') {
        setConfirmedEmail(email)
        setAwaitingConfirmation(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const errInfo = errorKind ? ERROR_MESSAGES[errorKind] : null

  return (
    <div className="flex min-h-dvh w-full">

      {/* ── Left panel: Branding ─────────────────────────── */}
      <div className="hidden flex-col justify-between bg-sidebar p-10 lg:flex lg:w-[45%]">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileStack className="size-5" />
          </div>
          <span className="text-lg font-semibold text-sidebar-accent-foreground">ProjectPilot</span>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent/20 px-4 py-1.5">
            <Sparkles className="size-3.5 text-accent-foreground" />
            <span className="font-mono text-xs tracking-widest text-accent-foreground">AI PRE-SALES ENGINEER</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-sidebar-accent-foreground">
            Turn conversations<br />into requirements.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            ProjectPilot listens to your discovery calls and automatically generates
            BRDs, PRDs, SRS documents, user stories, and architecture blueprints —
            powered by Gemini&nbsp;AI.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Discovery Docs', value: 'Auto-generated' },
              { label: 'BRD / PRD / SRS', value: 'Structured output' },
              { label: 'User Stories', value: 'Instant extraction' },
              { label: 'Architecture', value: 'AI-designed' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
                <p className="font-mono text-[10px] tracking-wider text-muted-foreground">{f.label}</p>
                <p className="mt-1 text-sm font-medium text-sidebar-accent-foreground">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-wider text-muted-foreground">
          © {new Date().getFullYear()} PROJECTPILOT · POWERED BY GEMINI 2.0 FLASH
        </p>
      </div>

      {/* ── Right panel: Auth form ───────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">

          {/* Logo (mobile) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileStack className="size-4" />
            </div>
            <span className="font-semibold">ProjectPilot</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              {tab === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === 'login'
                ? 'Sign in to your workspace'
                : 'Start your first discovery session'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-xl border border-border bg-muted/40 p-1">
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* ── Error alert ── */}
          {errInfo && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm font-semibold text-destructive">{errInfo.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-destructive/80">
                {errInfo.body || errorRaw}
              </p>
              {/* Rate-limit specific tip */}
              {errorKind === 'email_rate_limit' && (
                <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    💡 Quick fix for development:
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
                    In Supabase → Authentication → Settings, toggle{' '}
                    <strong>"Confirm email"</strong> OFF. This lets you sign in immediately without email confirmation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Success alert ── */}
          {success && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          {/* ── Resend confirmation ── */}
          {awaitingConfirmation && confirmedEmail && (
            <ResendConfirmation email={confirmedEmail} />
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
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
