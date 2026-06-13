'use client'

import { useState } from 'react'
import type { Music } from '@/lib/supabase/types'

export function MusicManager({ tracks: initialTracks }: { tracks: Music[] }) {
  const [tracks, setTracks] = useState(initialTracks)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  async function handleDelete(id: string) {
    if (!confirm('确认删除？')) return
    const res = await fetch(`/api/admin/music/${id}`, { method: 'DELETE' })
    if (res.ok) setTracks((prev) => prev.filter((t) => t.id !== id))
  }

  function uploadFile(
    file: File,
    bucket: string,
    onProgress: (pct: number) => void,
  ): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/upload')
      xhr.withCredentials = true

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            reject(new Error('Invalid response'))
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Network error')))
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

      xhr.send(formData)
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const fileList = Array.from(files)
    const total = fileList.length

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const bucket = file.type.startsWith('image/') ? 'covers' : 'music'

      setProgressLabel(`${i + 1}/${total}  ${file.name}`)
      setProgress(0)

      try {
        const { url } = await uploadFile(file, bucket, (pct) => setProgress(pct))
        await fetch('/api/admin/music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: file.name.replace(/\.[^/.]+$/, ''), audio_url: url }),
        })
      } catch (err) {
        console.error('Upload failed:', file.name, err)
        alert(`${file.name} 上传失败`)
      }
    }

    setUploading(false)
    setProgress(0)
    setProgressLabel('')

    const listRes = await fetch('/api/admin/music')
    if (listRes.ok) setTracks(await listRes.json())

    // Reset file input
    e.target.value = ''
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label
          className="btn btn-primary btn-sm"
          style={{
            background: uploading ? 'var(--text-dim)' : 'var(--grn-dark)',
            color: '#fff',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? .6 : 1,
          }}
        >
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

      {/* Upload progress bar */}
      {uploading && (
        <div className="upload-progress-wrap">
          <div className="upload-progress-label">{progressLabel}</div>
          <div className="upload-progress-track">
            <div
              className="upload-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="upload-progress-pct">{progress}%</div>
        </div>
      )}

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
