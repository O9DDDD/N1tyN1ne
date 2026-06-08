'use client'

import { useState } from 'react'
import type { Friend } from '@/lib/supabase/types'

export function FriendList({ friends: initialFriends }: { friends: Friend[] }) {
  const [friends, setFriends] = useState(initialFriends)
  const [editing, setEditing] = useState<Friend | null>(null)
  const [adding, setAdding] = useState(false)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get('name') as string,
      url: form.get('url') as string,
      description: form.get('description') as string,
      avatar_url: form.get('avatar_url') as string,
    }

    if (editing) {
      const res = await fetch(`/api/admin/friends/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        setFriends((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
        setEditing(null)
      }
    } else {
      const res = await fetch('/api/admin/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const created = await res.json()
        setFriends((prev) => [created, ...prev])
        setAdding(false)
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除？')) return
    const res = await fetch(`/api/admin/friends/${id}`, { method: 'DELETE' })
    if (res.ok) setFriends((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => { setAdding(!adding); setEditing(null) }}
          className="btn btn-primary btn-sm"
          style={{ background: 'var(--grn-dark)', color: '#fff' }}
        >
          {adding ? '取消' : '+ 添加友链'}
        </button>
      </div>

      {(adding || editing) && (
        <form
          onSubmit={handleSave}
          style={{
            marginBottom: 16,
            padding: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h3 style={{ fontSize: '.95rem', fontWeight: 700, color: 'var(--text-bright)' }}>
            {editing ? '编辑友链' : '添加友链'}
          </h3>
          <input name="name" placeholder="名称" defaultValue={editing?.name ?? ''} required className="auth-box input" style={{ marginBottom: 0, padding: '10px 14px' }} />
          <input name="url" placeholder="链接 https://..." defaultValue={editing?.url ?? ''} required className="auth-box input" style={{ marginBottom: 0, padding: '10px 14px' }} />
          <input name="description" placeholder="描述" defaultValue={editing?.description ?? ''} className="auth-box input" style={{ marginBottom: 0, padding: '10px 14px' }} />
          <input name="avatar_url" placeholder="头像 URL（可选）" defaultValue={editing?.avatar_url ?? ''} className="auth-box input" style={{ marginBottom: 0, padding: '10px 14px' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--grn-dark)', color: '#fff' }}>保存</button>
            <button type="button" onClick={() => { setEditing(null); setAdding(false) }} className="btn btn-sm btn-ghost">取消</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>链接</th>
              <th>描述</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {friends.map((friend) => (
              <tr key={friend.id}>
                <td>{friend.name}</td>
                <td>
                  <a href={friend.url} target="_blank" rel="noopener">
                    {(() => { try { return new URL(friend.url).hostname } catch { return friend.url } })()}
                  </a>
                </td>
                <td style={{ color: 'var(--text-dim)' }}>{friend.description ?? '—'}</td>
                <td style={{ color: 'var(--text-dim)' }}>
                  {new Date(friend.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td>
                  <button onClick={() => setEditing(friend)} className="btn btn-sm btn-ghost" style={{ marginRight: 8 }}>编辑</button>
                  <button onClick={() => handleDelete(friend.id)} className="btn btn-sm btn-ghost" style={{ color: '#dc2626' }}>删除</button>
                </td>
              </tr>
            ))}
            {friends.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)' }}>暂无友链</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
