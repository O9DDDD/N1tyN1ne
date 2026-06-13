'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Music } from '@/lib/supabase/types'
import { TrackList } from './track-list'
import { splitArtists } from '@/lib/artist'
import { useAuth } from '@/components/auth/auth-provider'
import type { PlayerTrack } from '@/components/music/player-provider'

type Tab = 'tracks' | 'artists' | 'albums'

function toPlayerTrack(t: Music): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    album_artist: t.album_artist,
    album_year: t.album_year,
    album_description: t.album_description,
    genre: t.genre,
    track_number: t.track_number,
    audio_url: t.audio_url,
    cover_url: t.cover_url,
    duration: t.duration,
    lyrics: t.lyrics,
  }
}

function navigateToPlayTrack(router: ReturnType<typeof useRouter>, track: Music, playlist: Music[]) {
  const mapped = playlist.map(toPlayerTrack)
  sessionStorage.setItem('pendingTrack', JSON.stringify(toPlayerTrack(track)))
  sessionStorage.setItem('pendingPlaylist', JSON.stringify(mapped))
  router.push('/songs')
}

function ArtistGrid({ tracks, onSelectArtist }: { tracks: Music[]; onSelectArtist: (name: string) => void }) {
  const [artistImgs, setArtistImgs] = useState<Record<string, string | null>>({})

  const artists = useMemo(() => {
    const map = new Map<string, Music[]>()
    for (const t of tracks) {
      const names = splitArtists(t.artist ?? null)
      for (const name of names) {
        if (!map.has(name)) map.set(name, [])
        map.get(name)!.push(t)
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
  }, [tracks])

  useEffect(() => {
    const toFetch = artists.map(a => a[0]).filter(a => !(a in artistImgs))
    if (toFetch.length === 0) return
    let canceled = false
    const names = toFetch.join(',')
    fetch(`/api/artist/image?name=${encodeURIComponent(names)}`)
      .then((res) => res.json())
      .then((data) => {
        if (canceled) return
        const map: Record<string, string | null> = data.results || {}
        setArtistImgs((prev) => {
          const next = { ...prev }
          for (const name of toFetch) {
            next[name] = map[name] ?? null
          }
          return next
        })
      })
      .catch(() => {})
    return () => { canceled = true }
  }, [artists.map(a => a[0]).join(',')])

  const count = artists.length

  return (
    <div className="library-section">
      <p className="library-section-title">艺术家 · {count}</p>
      <div className="artist-grid">
        {artists.map(([name]) => (
          <button
            key={name}
            className="artist-card"
            onClick={() => onSelectArtist(name)}
          >
            {artistImgs[name] ? (
              <img className="artist-card-img" src={artistImgs[name]!} alt={name} />
            ) : (
              <div className="artist-card-img artist-card-placeholder">{name.charAt(0)}</div>
            )}
            <span className="artist-card-name">{name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AlbumGrid({ tracks, onSelectAlbum }: { tracks: Music[]; onSelectAlbum: (name: string) => void }) {
  const albums = useMemo(() => {
    const map = new Map<string, Music>()
    for (const t of tracks) {
      const key = t.album || '未知专辑'
      if (!map.has(key)) map.set(key, t)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
  }, [tracks])

  const count = albums.length

  if (count === 0) {
    return (
      <div className="library-section">
        <p className="library-section-title">专辑 · 0</p>
        <div className="track-empty">暂无专辑信息</div>
      </div>
    )
  }

  return (
    <div className="library-section">
      <p className="library-section-title">专辑 · {count}</p>
      <div className="album-grid">
        {albums.map(([name, track]) => (
          <button
            key={name}
            type="button"
            className="album-card"
            onClick={() => onSelectAlbum(name)}
          >
            {track.cover_url ? (
              <img className="album-card-cover" src={track.cover_url} alt={name} />
            ) : (
              <div className="album-card-cover album-card-placeholder">💿</div>
            )}
            <span className="album-card-name">{name}</span>
            {track.album_artist && (
              <span className="album-card-artist">{track.album_artist}</span>
            )}
            {track.album_year && (
              <span className="album-card-year">{track.album_year}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function ArtistDetailView({
  tracks,
  artistName,
  onBack,
}: {
  tracks: Music[]
  artistName: string
  onBack: () => void
}) {
  const router = useRouter()

  const filtered = useMemo(() => {
    return tracks
      .filter((t) => {
        const names = splitArtists(t.artist ?? null)
        return names.includes(artistName)
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
  }, [tracks, artistName])

  const [artistImg, setArtistImg] = useState<string | null>(null)
  useEffect(() => {
    let canceled = false
    fetch(`/api/artist/image?name=${encodeURIComponent(artistName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (canceled) return
        setArtistImg(data.results?.[artistName] ?? null)
      })
      .catch(() => {})
    return () => { canceled = true }
  }, [artistName])

  const count = filtered.length

  return (
    <div className="artist-detail">
      <button className="detail-back-btn" onClick={onBack}>
        ← 返回艺术家列表
      </button>

      <div className="artist-detail-header">
        {artistImg ? (
          <img className="artist-detail-avatar" src={artistImg} alt={artistName} />
        ) : (
          <div className="artist-detail-avatar artist-detail-avatar-ph">
            {artistName.charAt(0)}
          </div>
        )}
        <div className="artist-detail-info">
          <h3 className="artist-detail-name">{artistName}</h3>
          <span className="artist-detail-count">{count} 首歌曲</span>
        </div>
      </div>

      <div className="track-list">
        {filtered.map((track) => (
          <div
            key={track.id}
            className="track-card"
            onClick={() => navigateToPlayTrack(router, track, filtered)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToPlayTrack(router, track, filtered) }}
          >
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title} className="track-cover" />
            ) : (
              <div className="track-cover track-cover-placeholder">♪</div>
            )}
            <div className="track-info">
              <div className="track-title-row">
                <span className="track-title">{track.title}</span>
                {track.genre && <span className="track-genre-mini">{track.genre}</span>}
              </div>
              <div className="track-sub">
                {track.album ? `${track.album}` : ''}
              </div>
            </div>
            {track.duration && <span className="track-duration">{track.duration}</span>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="track-empty">该艺术家暂无歌曲</div>
        )}
      </div>
    </div>
  )
}

function AlbumDetailView({
  tracks,
  albumName,
  onBack,
}: {
  tracks: Music[]
  albumName: string
  onBack: () => void
}) {
  const router = useRouter()
  const { isAdmin } = useAuth()

  const albumTracks = useMemo(() => {
    const target = albumName === '未知专辑' ? null : albumName
    return tracks
      .filter((t) => {
        if (target === null) return !t.album
        return t.album === target
      })
      .sort((a, b) => {
        const an = a.track_number ?? Number.MAX_SAFE_INTEGER
        const bn = b.track_number ?? Number.MAX_SAFE_INTEGER
        return an - bn
      })
  }, [tracks, albumName])

  const firstTrack = albumTracks[0]
  const coverUrl = firstTrack?.cover_url ?? null
  const albumArtist = firstTrack?.album_artist ?? null
  const albumYear = firstTrack?.album_year ?? null

  const [description, setDescription] = useState(firstTrack?.album_description ?? null)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [savingDesc, setSavingDesc] = useState(false)

  useEffect(() => {
    setDescription(firstTrack?.album_description ?? null)
  }, [firstTrack?.album_description])

  const artists = useMemo(() => splitArtists(albumArtist), [albumArtist])
  const [artistImgs, setArtistImgs] = useState<Record<string, string | null>>({})
  useEffect(() => {
    if (artists.length === 0) return
    const toFetch = artists.filter((a) => !(a in artistImgs))
    if (toFetch.length === 0) return
    let canceled = false
    const names = toFetch.join(',')
    fetch(`/api/artist/image?name=${encodeURIComponent(names)}`)
      .then((r) => r.json())
      .then((data) => {
        if (canceled) return
        const map: Record<string, string | null> = data.results || {}
        setArtistImgs((prev) => {
          const next = { ...prev }
          for (const name of toFetch) {
            next[name] = map[name] ?? null
          }
          return next
        })
      })
      .catch(() => {})
    return () => { canceled = true }
  }, [artists.join(',')])

  async function saveDescription() {
    setSavingDesc(true)
    try {
      const res = await fetch('/api/admin/music/album-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album: albumName, album_description: descDraft }),
      })
      if (res.ok) {
        setDescription(descDraft || null)
        setEditingDesc(false)
      }
    } finally {
      setSavingDesc(false)
    }
  }

  function startEdit() {
    setDescDraft(description ?? '')
    setEditingDesc(true)
  }

  return (
    <div className="album-detail">
      <button className="detail-back-btn" onClick={onBack}>
        ← 返回专辑列表
      </button>

      {/* Header: cover + info + description */}
      <div className="album-detail-header">
        <div className="album-detail-cover-wrap">
          {coverUrl ? (
            <img className="album-detail-cover" src={coverUrl} alt={albumName} />
          ) : (
            <div className="album-detail-cover album-detail-cover-ph">💿</div>
          )}
        </div>
        <div className="album-detail-meta">
          <h3 className="album-detail-album-name">{albumName}</h3>
          {albumYear && <span className="album-detail-year">{albumYear}</span>}

          <div className="album-detail-artists">
            {artists.length > 0 && artists.map((name) => (
              <div key={name} className="album-detail-artist-chip">
                {artistImgs[name] ? (
                  <img className="album-detail-artist-avatar" src={artistImgs[name]!} alt={name} />
                ) : (
                  <div className="album-detail-artist-avatar album-detail-artist-ph">
                    {name.charAt(0)}
                  </div>
                )}
                <span className="album-detail-artist-name">{name}</span>
              </div>
            ))}
          </div>

          {/* Description — inline, no box */}
          {editingDesc ? (
            <div className="album-desc-edit">
              <textarea
                className="album-desc-textarea"
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder="输入专辑简介..."
                rows={3}
              />
              <div className="album-desc-edit-actions">
                <button onClick={saveDescription} disabled={savingDesc}>
                  {savingDesc ? '保存中...' : '保存'}
                </button>
                <button onClick={() => setEditingDesc(false)}>取消</button>
              </div>
            </div>
          ) : (
            <div className="album-desc-inline">
              {description ? (
                <p className="album-desc-text">{description}</p>
              ) : null}
              {isAdmin && (
                <button className="album-desc-edit-btn" onClick={startEdit}>
                  {description ? '✎' : '+ 添加简介'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Track listing */}
      <div className="album-track-list">
        {albumTracks.map((track) => (
          <div
            key={track.id}
            className="album-track-card"
            onClick={() => navigateToPlayTrack(router, track, albumTracks)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigateToPlayTrack(router, track, albumTracks)
            }}
          >
            <span className="album-track-num">
              {track.track_number != null ? track.track_number : '-'}
            </span>
            {track.cover_url ? (
              <img className="album-track-cover" src={track.cover_url} alt={track.title} />
            ) : (
              <div className="album-track-cover album-track-cover-ph">♪</div>
            )}
            <div className="album-track-info">
              <span className="album-track-title">{track.title}</span>
              <span className="album-track-artist">{track.artist ?? '未知艺术家'}</span>
            </div>
            {track.duration && (
              <span className="album-track-duration">{track.duration}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'tracks', label: '全部音乐' },
  { key: 'artists', label: '艺术家' },
  { key: 'albums', label: '专辑' },
]

export function MusicTabs({
  tracks,
  filterAlbum,
  filterArtist,
}: {
  tracks: Music[]
  filterAlbum: string | null
  filterArtist: string | null
}) {
  const [tab, setTab] = useState<Tab>('tracks')
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)

  function handleTabChange(t: Tab) {
    setTab(t)
    setSelectedArtist(null)
    setSelectedAlbum(null)
  }

  return (
    <div className="music-tabs">
      <div className="music-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`music-tab-btn${tab === t.key ? ' music-tab-active' : ''}`}
            onClick={() => handleTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="music-tab-content">
        {tab === 'tracks' && (
          <TrackList
            tracks={tracks}
            filterAlbum={filterAlbum}
            filterArtist={filterArtist}
          />
        )}
        {tab === 'artists' && !selectedArtist && (
          <ArtistGrid tracks={tracks} onSelectArtist={setSelectedArtist} />
        )}
        {tab === 'artists' && selectedArtist && (
          <ArtistDetailView
            tracks={tracks}
            artistName={selectedArtist}
            onBack={() => setSelectedArtist(null)}
          />
        )}
        {tab === 'albums' && !selectedAlbum && (
          <AlbumGrid tracks={tracks} onSelectAlbum={setSelectedAlbum} />
        )}
        {tab === 'albums' && selectedAlbum && (
          <AlbumDetailView
            tracks={tracks}
            albumName={selectedAlbum}
            onBack={() => setSelectedAlbum(null)}
          />
        )}
      </div>
    </div>
  )
}
