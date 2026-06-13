'use client'

import { useState } from 'react'
import { parseBlob } from 'music-metadata-browser'
import type { Music } from '@/lib/supabase/types'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

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

  async function uploadToS3(
    file: File | Blob,
    filename: string,
    mimeType: string,
    bucket: string,
    onProgress: (pct: number) => void,
  ): Promise<{ url: string }> {
    // Get presigned PUT URL
    const presignParams = new URLSearchParams({
      name: filename,
      type: mimeType || 'application/octet-stream',
      bucket,
    })
    const presignRes = await fetch(`/api/admin/upload/presign?${presignParams}`)
    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({ error: presignRes.statusText }))
      throw new Error(err.error || '获取上传链接失败')
    }
    const { uploadUrl, publicUrl } = await presignRes.json()

    // PUT file directly to S3
    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': mimeType || 'application/octet-stream' },
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      throw new Error(`S3 直传失败: ${resp.status}${errText ? ' — ' + errText : ''}`)
    }

    return { url: publicUrl }
  }

  function isAudioFile(f: File): boolean {
    if (f.type.startsWith('audio/')) return true
    return /\.(mp3|flac|wav|ogg|m4a|aac|wma|opus)$/i.test(f.name)
  }

  function isLyricsFile(f: File): boolean {
    return /\.lrc$/i.test(f.name)
  }

  function basename(f: File): string {
    return f.name.replace(/\.[^/.]+$/, '')
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const fileList = Array.from(files)

    // Separate files into groups
    const audioFiles = fileList.filter(isAudioFile)
    const lrcFiles = fileList.filter(isLyricsFile)
    const imageFiles = fileList.filter(f => f.type.startsWith('image/') && !isLyricsFile(f))

    // Warn about large lossless files
    const losslessExts = /\.(flac|wav|wma)$/i
    const largeFiles = audioFiles.filter(f => {
      const sizeMB = f.size / (1024 * 1024)
      return losslessExts.test(f.name) && sizeMB > 15
    })
    if (largeFiles.length > 0) {
      const names = largeFiles.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)}MB)`).join('\n')
      const ok = confirm(
        `⚠️ 以下文件为无损格式，文件很大，播放会卡：\n\n${names}\n\n` +
        `建议转换为 MP3 (320kbps) 后再上传以提升播放速度。\n是否仍要上传？`
      )
      if (!ok) {
        setUploading(false)
        e.target.value = ''
        return
      }
    }

    // Pre-read all .lrc files into a map keyed by base filename
    const lrcMap = new Map<string, string>()
    for (const lrc of lrcFiles) {
      try {
        const text = await lrc.text()
        lrcMap.set(basename(lrc), text)
      } catch {
        // ignore unreadable lrc
      }
    }

    const total = audioFiles.length
    let done = 0

    for (const file of audioFiles) {
      done++
      setProgressLabel(`${done}/${total}  解析中: ${file.name}`)
      setProgress(0)

      try {
        let meta: {
          title: string
          artist: string | null
          album: string | null
          album_artist: string | null
          album_year: string | null
          track_number: number | null
          genre: string | null
          duration: string | null
          lyrics: string | null
          coverBlob: Blob | null
          coverExt: string | null
        } = {
          title: basename(file),
          artist: null,
          album: null,
          album_artist: null,
          album_year: null,
          track_number: null,
          genre: null,
          duration: null,
          lyrics: null,
          coverBlob: null,
          coverExt: null,
        }

        // Extract metadata
        try {
          const result = await parseBlob(file)
          const { common, format } = result

          meta.title = common.title || basename(file)
          meta.artist = common.artist || null
          meta.album = common.album || null
          meta.album_artist = common.albumartist || null
          meta.album_year = common.year?.toString() || null
          meta.track_number = common.track?.no ?? null
          meta.genre = common.genre?.[0] || null
          meta.duration = format.duration ? formatDuration(format.duration) : null

          if (common.lyrics?.length) {
            const lyricsArr = common.lyrics.map(l => typeof l === 'string' ? l : (l as any).text || '')
            meta.lyrics = lyricsArr.join('\n\n') || null
          }

          const frontCover = common.picture?.find(p =>
            p.type?.includes('front') || p.type?.includes('Front') || !p.type
          )
          if (frontCover) {
            const mime = frontCover.format || 'image/jpeg'
            meta.coverBlob = new Blob([frontCover.data as unknown as BlobPart], { type: mime })
            meta.coverExt = mime.split('/')[1] || 'jpg'
          }
        } catch {
          // Metadata parse failed, use defaults
        }

        // Prefer .lrc lyrics over embedded lyrics if a matching .lrc exists
        const matchingLrc = lrcMap.get(basename(file))
        if (matchingLrc != null) {
          meta.lyrics = matchingLrc
        }

        // Upload audio
        setProgressLabel(`${done}/${total}  上传: ${file.name}`)
        setProgress(0)
        const { url: audioUrl } = await uploadToS3(file, file.name, file.type, 'music', setProgress)

        // Upload embedded cover
        let coverUrl: string | null = null
        if (meta.coverBlob && meta.coverExt) {
          const coverName = `${meta.album || meta.title}_cover.${meta.coverExt}`
          setProgressLabel(`${done}/${total}  上传封面: ${coverName}`)
          setProgress(0)
          try {
            const cover = await uploadToS3(
              meta.coverBlob, coverName,
              meta.coverBlob.type || 'image/jpeg', 'covers',
              setProgress,
            )
            coverUrl = cover.url
          } catch {
            // continue without cover
          }
        }

        // Create DB record
        setProgressLabel(`${done}/${total}  保存...`)
        const createRes = await fetch('/api/admin/music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: meta.title,
            artist: meta.artist,
            album: meta.album,
            album_artist: meta.album_artist,
            album_year: meta.album_year,
            track_number: meta.track_number,
            genre: meta.genre,
            duration: meta.duration,
            lyrics: meta.lyrics,
            audio_url: audioUrl,
            cover_url: coverUrl,
          }),
        })
        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}))
          throw new Error(errData.error || `创建记录失败: ${createRes.status}`)
        }
      } catch (err: any) {
        console.error('Upload failed:', file.name, err)
        alert(`${file.name} 上传失败 — ${err.message || err}`)
      }
    }

    // Upload standalone image files — bind to matching album
    for (const img of imageFiles) {
      done++
      setProgressLabel(`${done}/${total + imageFiles.length}  上传封面: ${img.name}`)
      setProgress(0)
      try {
        const { url: coverUrl } = await uploadToS3(img, img.name, img.type, 'covers', setProgress)
        // Try to match album name from filename (strip "cover", "封面", "_cover" etc.)
        const albumName = basename(img).replace(/[_\-\s]*(cover|封面|专辑封面|album\s*art)$/i, '').trim()
        if (albumName) {
          await fetch('/api/admin/music/album-cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ album: albumName, cover_url: coverUrl }),
          })
        }
      } catch (err: any) {
        console.error('Cover upload failed:', img.name, err)
      }
    }

    setUploading(false)
    setProgress(0)
    setProgressLabel('')

    const listRes = await fetch('/api/admin/music')
    if (listRes.ok) setTracks(await listRes.json())

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
