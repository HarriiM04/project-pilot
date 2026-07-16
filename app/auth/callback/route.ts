import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles the OAuth / magic-link callback.
 * Supabase redirects the browser here with ?code=... after the user
 * confirms their email or completes an OAuth flow.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('redirectTo') ?? '/projects'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Successful login — redirect to the originally requested page
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — go back to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=Could+not+authenticate`)
}
