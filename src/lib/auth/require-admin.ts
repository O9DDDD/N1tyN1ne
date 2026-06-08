import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const role = user.app_metadata?.role
  if (role !== 'admin') {
    redirect('/?error=forbidden')
  }

  return user
}
