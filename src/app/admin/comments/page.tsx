/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'
import { CommentList } from '@/components/admin/comment-list'

export const dynamic = 'force-dynamic'

export default async function AdminCommentsPage() {
  const adminDb = createAdminClient()
  const { data: comments } = await adminDb
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">留言管理</h1>
      <CommentList comments={comments ?? []} />
    </div>
  )
}
