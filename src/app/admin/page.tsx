/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const adminDb = createAdminClient()

  const [posts, music, comments] = await Promise.all([
    adminDb.from('posts').select('id', { count: 'exact', head: true }),
    adminDb.from('music').select('id', { count: 'exact', head: true }),
    adminDb.from('comments').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: '文章', count: posts.count ?? 0 },
    { label: '音乐', count: music.count ?? 0 },
    { label: '留言', count: comments.count ?? 0 },
  ]

  return (
    <div>
      <h1>管理概览</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="num">{s.count}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: '.85rem' }}>
        选择一个栏目开始管理。
      </p>
    </div>
  )
}
