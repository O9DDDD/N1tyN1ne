'use client'

import { useState, useMemo } from 'react'
import type { Music, MvUrls } from '@/lib/supabase/types'
import { usePlayer, type PlayerTrack } from '@/components/music/player-provider'

function toPlayerTrack(t: Music): PlayerTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    audio_url: t.audio_url,
    cover_url: t.cover_url,
    duration: t.duration,
    mv_urls: t.mv_urls as MvUrls | null,
  }
}

function hasMv(t: Music): boolean {
  const mv = t.mv_urls as MvUrls | null
  return !!(mv && (mv.low || mv.medium || mv.high))
}

export function TrackList({ tracks }: { tracks: Music[] }) {
  const { play, currentTrack, isPlaying } = usePlayer()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return tracks
    const q = search.toLowerCase()
    return tracks.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.album && t.album.toLowerCase().includes(q))
    )
  }, [tracks, search])

  function handlePlay(track: Music) {
    const mapped = toPlayerTrack(track)
    const fullPlaylist = tracks.map(toPlayerTrack)
    play(mapped, fullPlaylist)
  }

  return (
    <div className="track-list-section">
      {/* Search */}
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

      {/* List */}
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
              {/* Cover */}
              {track.cover_url ? (
                <img
                  src={track.cover_url}
                  alt={track.title}
                  className={`track-cover${isCurrent && isPlaying ? ' spinning' : ''}`}
                />
              ) : (
                <div className="track-cover track-cover-placeholder">
                  {isCurrent && isPlaying ? '🎵' : '♪'}
                </div>
              )}

              {/* Info */}
              <div className="track-info">
                <div className="track-title-row">
                  <span className="track-title">{track.title}</span>
                  {hasMv(track) && <span className="track-mv-badge">MV</span>}
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

              {/* Duration */}
              {track.duration && (
                <span className="track-duration">{track.duration}</span>
              )}

              {/* Now playing indicator */}
              {isCurrent && (
                <div className="track-current-dot" />
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="track-empty">
            {search ? '没有匹配的歌曲' : '暂无音乐'}
          </div>
        )}
      </div>
    </div>
  )
}
