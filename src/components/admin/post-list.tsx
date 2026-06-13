'use client'

import type { Post } from '@/lib/supabase/types'

export function PostList({ posts, onUpdate }: { posts: Post[]; onUpdate?: (posts: Post[]) => void }) {
  function updatePost(updated: Post) {
    const next = posts.map((p) => (p.id === updated.id ? updated : p))
    onUpdate?.(next)
  }

  function removePost(id: string) {
    onUpdate?.(posts.filter((p) => p.id !== id))
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除？')) return
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' })
    if (res.ok) removePost(id)
  }

  async function handlePublishToggle(post: Post) {
    const res = await fetch(`/api/admin/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !post.published }),
    })
    if (res.ok) {
      const updated = await res.json()
      updatePost(updated)
    }
  }

  async function handlePinToggle(post: Post) {
    const res = await fetch(`/api/admin/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !post.pinned }),
    })
    if (res.ok) {
      const updated = await res.json()
      updatePost(updated)
    }
  }

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>
                {post.pinned && <span style={{ marginRight: 4, color: '#e6a817' }}>📌</span>}
                {post.title}
              </td>
              <td>
                <button
                  onClick={() => handlePublishToggle(post)}
                  className="btn btn-sm btn-ghost"
                >
                  {post.published ? '已发布' : '草稿'}
                </button>
              </td>
              <td style={{ color: 'var(--text-dim)' }}>
                {new Date(post.created_at).toLocaleDateString('zh-CN')}
              </td>
              <td>
                <button
                  onClick={() => handlePinToggle(post)}
                  className="btn btn-sm btn-ghost"
                  style={{ marginRight: 8, color: '#e6a817' }}
                >
                  {post.pinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="btn btn-sm btn-ghost"
                  style={{ color: '#dc2626' }}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                暂无文章
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
