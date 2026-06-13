/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'
import { PostManager } from '@/components/admin/post-manager'

export const dynamic = 'force-dynamic'

export default async function AdminPostsPage() {
  const adminDb = createAdminClient()
  const { data: posts } = await adminDb
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  return <PostManager initialPosts={posts ?? []} />
}
