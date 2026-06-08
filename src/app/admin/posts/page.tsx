/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'
import { PostList } from '@/components/admin/post-list'

export const dynamic = 'force-dynamic'

export default async function AdminPostsPage() {
  const adminDb = createAdminClient()
  const { data: posts } = await adminDb
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>文章管理</h1>
        <button className="btn btn-primary btn-sm" style={{ background: 'var(--grn-dark)', color: '#fff' }}>
          + 新文章
        </button>
      </div>
      <PostList posts={posts ?? []} />
    </div>
  )
}
