'use client'

import { useState } from 'react'
import type { Comment } from '@/lib/supabase/types'

export function CommentList({ comments: initialComments }: { comments: Comment[] }) {
  const [comments, setComments] = useState(initialComments)

  async function handleDelete(id: string) {
    if (!confirm('确认删除？')) return
    const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' })
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>内容</th>
            <th>日期</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {comments.map((comment) => (
            <tr key={comment.id}>
              <td style={{ color: 'var(--text-dim)' }}>
                {comment.user_id.slice(0, 8)}...
              </td>
              <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {comment.content}
              </td>
              <td style={{ color: 'var(--text-dim)' }}>
                {new Date(comment.created_at).toLocaleDateString('zh-CN')}
              </td>
              <td>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="btn btn-sm btn-ghost"
                  style={{ color: '#dc2626' }}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
          {comments.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                暂无留言
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
