import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminShell } from './admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const email    = user.email ?? ''
  const name     = (user.user_metadata?.full_name as string) ?? ''

  return (
    <AdminShell userEmail={email} userName={name}>
      {children}
    </AdminShell>
  )
}
