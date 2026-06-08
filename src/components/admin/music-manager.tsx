'use client'

import { useState } from 'react'
import type { Music } from '@/lib/supabase/types'

export function MusicManager({ tracks: initialTracks }: { tracks: Music[] }) {
  const [tracks, setTracks] = useState(initialTracks)
  const [uploading, setUploading] = useState(false)

  async function handleDelete(id: string) {
    if (!confirm('确认删除？')) return
    const res = await fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
    if (res.ok) setTracks((prev) => prev.filter((t) => t.id !== id))
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', file.type.startsWith('image/') ? 'covers' : 'music')

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        await fetch('/api/admin/music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: file.name.replace(/\.[^/.]+$/, ''), audio_url: url }),
        })
      }
    }
    setUploading(false)
    const listRes = await fetch('/api/admin/music')
    if (listRes.ok) setTracks(await listRes.json())
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label className="btn btn-primary btn-sm" style={{ background: 'var(--grn-dark)', color: '#fff', cursor: 'pointer' }}>
          {uploading ? '上传中...' : '+ 上传音乐'}
          <input
            type="file"
            accept="audio/*,.lrc,image/*"
            multiple
            onChange={handleUpload}
            hidden
            disabled={uploading}
          />
        </label>
      </div>

      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>艺术家</th>
              <th>专辑</th>
              <th>日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((track) => (
              <tr key={track.id}>
                <td>{track.title}</td>
                <td style={{ color: 'var(--text-dim)' }}>{track.artist ?? '—'}</td>
                <td style={{ color: 'var(--text-dim)' }}>{track.album ?? '—'}</td>
                <td style={{ color: 'var(--text-dim)' }}>
                  {new Date(track.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td>
                  <button
                    onClick={() => handleDelete(track.id)}
                    className="btn btn-sm btn-ghost"
                    style={{ color: '#dc2626' }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {tracks.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                  暂无音乐
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
