'use client'

import { useState } from 'react'
import type { Post } from '@/lib/supabase/types'
import { PostList } from '@/components/admin/post-list'

export function PostManager({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), published: true }),
      })
      if (res.ok) {
        const post = await res.json()
        setPosts((prev) => [post, ...prev])
        setTitle('')
        setContent('')
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>文章管理</h1>
        <button
          className="btn btn-primary btn-sm"
          style={{ background: 'var(--grn-dark)', color: '#fff' }}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? '取消' : '+ 新文章'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <input
            type="text"
            placeholder="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--text)',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <textarea
            placeholder="文章内容（支持 Markdown）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--text)',
              fontSize: '.92rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--grn-dark)', color: '#fff' }}
              onClick={handleCreate}
              disabled={saving || !title.trim()}
            >
              {saving ? '发布中...' : '发布'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setShowForm(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <PostList posts={posts} onUpdate={setPosts} />
    </div>
  )
}
