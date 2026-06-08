/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'
import { FriendList } from '@/components/admin/friend-list'

export const dynamic = 'force-dynamic'

export default async function AdminFriendsPage() {
  const adminDb = createAdminClient()
  const { data: friends } = await adminDb
    .from('friends')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">友链管理</h1>
      <FriendList friends={friends ?? []} />
    </div>
  )
}
