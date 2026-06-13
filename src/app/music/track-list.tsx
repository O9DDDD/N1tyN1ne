'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Music } from '@/lib/supabase/types'
import { usePlayer, type PlayerTrack } from '@/components/music/player-provider'

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

function TrackListInner({ tracks }: { tracks: Music[] }) {
  const { currentTrack, isPlaying, play } = usePlayer()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState<string | null>(null)

  const urlAlbum = searchParams.get('album')
  const urlArtist = searchParams.get('artist')

  const genres = useMemo(() => {
    const set = new Set<string>()
    for (const t of tracks) {
      if (t.genre) set.add(t.genre)
    }
    return [...set].sort()
  }, [tracks])

  const filtered = useMemo(() => {
    let result = tracks.filter(() => true)

    // URL param: album filter
    if (urlAlbum) {
      const albumTarget = urlAlbum === '未知专辑' ? null : urlAlbum
      result = result.filter((t) => {
        if (albumTarget === null) return !t.album
        return t.album === albumTarget
      })
    }

    // URL param: artist filter
    if (urlArtist) {
      result = result.filter((t) =>
        t.artist ? t.artist.toLowerCase().includes(urlArtist.toLowerCase()) : false
      )
    }

    // Local filters
    if (genre) result = result.filter((t) => t.genre === genre)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q))
      )
    }

    // Sort
    if (urlAlbum) {
      result = [...result].sort((a, b) => {
        const an = a.track_number ?? Number.MAX_SAFE_INTEGER
        const bn = b.track_number ?? Number.MAX_SAFE_INTEGER
        return an - bn
      })
    } else if (urlArtist) {
      result = [...result].sort((a, b) =>
        a.title.localeCompare(b.title, 'zh')
      )
    }

    return result
  }, [tracks, urlAlbum, urlArtist, search, genre])

  function handlePlay(track: Music) {
    const mapped = toPlayerTrack(track)
    const fullPlaylist = tracks.map(toPlayerTrack)
    play(mapped, fullPlaylist)
    sessionStorage.setItem('pendingTrack', JSON.stringify(mapped))
    sessionStorage.setItem('pendingPlaylist', JSON.stringify(fullPlaylist))
    router.push('/songs')
  }

  return (
    <div className="track-list-section">
      {genres.length > 0 && (
        <div className="genre-filter">
          <button
            className={`genre-chip${!genre ? ' genre-active' : ''}`}
            onClick={() => setGenre(null)}
          >
            全部
          </button>
          {genres.map((g) => (
            <button
              key={g}
              className={`genre-chip${genre === g ? ' genre-active' : ''}`}
              onClick={() => setGenre(genre === g ? null : g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <div className="track-search">
        <span className="track-search-icon">🔍</span>
        <input
          type="text"
          className="track-search-input"
          placeholder="搜索歌曲、艺术家或专辑..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="track-search-clear" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>

      {/* Active URL filter chips */}
      {(urlAlbum || urlArtist) && (
        <div className="url-filter-bar">
          {urlAlbum && (
            <button
              className="url-filter-chip"
              onClick={() => router.push('/music')}
            >
              专辑: {urlAlbum} ✕
            </button>
          )}
          {urlArtist && (
            <button
              className="url-filter-chip"
              onClick={() => router.push('/music')}
            >
              艺术家: {urlArtist} ✕
            </button>
          )}
        </div>
      )}

      <div className="track-list">
        {filtered.map((track) => {
          const isCurrent = currentTrack?.id === track.id
          return (
            <div
              key={track.id}
              className={`track-card${isCurrent ? ' track-current' : ''}`}
              onClick={() => handlePlay(track)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlay(track) }}
            >
              {track.cover_url ? (
                <img
                  src={track.cover_url}
                  alt={track.title}
                  className="track-cover"
                />
              ) : (
                <div className="track-cover track-cover-placeholder">
                  {isCurrent && isPlaying ? '🎵' : '♪'}
                </div>
              )}

              <div className="track-info">
                <div className="track-title-row">
                  <span className="track-title">{track.title}</span>
                  {track.genre && (
                    <span className="track-genre-mini">{track.genre}</span>
                  )}
                  {isCurrent && isPlaying && (
                    <span className="track-eq">
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                </div>
                <div className="track-sub">
                  {track.artist ?? '未知艺术家'}
                  {track.album ? ` · ${track.album}` : ''}
                </div>
              </div>

              {track.duration && (
                <span className="track-duration">{track.duration}</span>
              )}

              {isCurrent && (
                <div className="track-current-dot" />
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="track-empty">
            {urlAlbum
              ? `专辑 "${urlAlbum}" 中没有歌曲`
              : urlArtist
                ? `未找到艺术家 "${urlArtist}" 的歌曲`
                : search || genre
                  ? '没有匹配的歌曲'
                  : '暂无音乐'}
          </div>
        )}
      </div>
    </div>
  )
}

export function TrackList({ tracks }: { tracks: Music[] }) {
  return (
    <Suspense fallback={null}>
      <TrackListInner tracks={tracks} />
    </Suspense>
  )
}
