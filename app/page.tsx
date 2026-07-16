import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root page — redirects:
 * - Authenticated users → /projects
 * - Unauthenticated users → /auth (handled by middleware, but belt-and-suspenders)
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/projects')
  } else {
    redirect('/auth')
  }
}
