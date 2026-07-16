import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

/**
 * GET /api/health
 * Tests database connectivity and Gemini API key validity.
 * Returns a JSON summary of each check.
 */
export async function GET() {
  const results: Record<string, unknown> = {}

  // ── 1. Supabase connection ──────────────────────────────────
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('projects').select('id').limit(1)
    if (error) {
      results.supabase = { ok: false, error: error.message }
    } else {
      results.supabase = { ok: true, message: 'Connected to Supabase', rowsRead: data?.length ?? 0 }
    }
  } catch (err: unknown) {
    results.supabase = {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown Supabase error',
    }
  }

  // ── 2. Gemini API ───────────────────────────────────────────
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: 'Reply with just the word: CONNECTED',
    })
    const text = response.text?.trim()
    results.gemini = { ok: true, message: 'Gemini API reachable', response: text }
  } catch (err: unknown) {
    results.gemini = {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown Gemini error',
    }
  }

  // ── 3. Auth check ───────────────────────────────────────────
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    results.auth = {
      ok: true,
      authenticated: !!user,
      userId: user?.id ?? null,
      email: user?.email ?? null,
    }
  } catch (err: unknown) {
    results.auth = {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown auth error',
    }
  }

  const allOk = Object.values(results).every((r: unknown) => (r as { ok: boolean }).ok)

  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', checks: results, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 207 },
  )
}
