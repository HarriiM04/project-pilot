import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles the OAuth / magic-link callback.
 * Supabase redirects the browser here with ?code=... after the user
 * confirms their email or completes an OAuth flow (Google, etc.).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user is admin → route to /admin, otherwise /projects
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (profile?.is_admin) {
          return NextResponse.redirect(`${origin}/admin`)
        }
      }

      return NextResponse.redirect(`${origin}/projects`)
    }
  }

  // Something went wrong — go back to auth with an error flag
  return NextResponse.redirect(`${origin}/auth?error=Could+not+authenticate`)
}
