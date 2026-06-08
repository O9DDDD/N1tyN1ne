'use client'

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

  function handlePlay(track: Music) {
    const mapped = toPlayerTrack(track)
    const fullPlaylist = tracks.map(toPlayerTrack)
    play(mapped, fullPlaylist)
  }

  return (
    <div className="space-y-3">
      {tracks.map((track) => {
        const isCurrent = currentTrack?.id === track.id
        return (
          <div
            key={track.id}
            className="track-card"
            data-current={isCurrent || undefined}
            onClick={() => handlePlay(track)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePlay(track) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 'var(--radius)',
              border: isCurrent ? '2px solid var(--accent)' : '1.5px solid var(--border)',
              background: isCurrent ? 'var(--accent-glow)' : 'var(--bg-card)',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
            }}
          >
            {/* Cover */}
            {track.cover_url ? (
              <img
                src={track.cover_url}
                alt={track.title}
                className="track-cover"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '2px solid var(--border)',
                  animation: isCurrent && isPlaying ? 'fp-spin 8s linear infinite' : undefined,
                }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  color: 'var(--text-dim)',
                }}
              >
                {isCurrent && isPlaying ? (
                  <span style={{ animation: 'fp-spin 8s linear infinite' }}>🎵</span>
                ) : (
                  '♪'
                )}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-bright)' }}>
                  {track.title}
                </span>
                {hasMv(track) && <span className="mv-badge">MV</span>}
                {isCurrent && isPlaying && (
                  <span style={{
                    display: 'inline-flex',
                    gap: 2,
                    alignItems: 'flex-end',
                    height: 14,
                  }}>
                    <span style={{ width: 3, height: 8, background: 'var(--accent)', borderRadius: 99, animation: 'eq 0.6s ease infinite' }} />
                    <span style={{ width: 3, height: 14, background: 'var(--accent)', borderRadius: 99, animation: 'eq 0.6s ease infinite', animationDelay: '0.15s' }} />
                    <span style={{ width: 3, height: 5, background: 'var(--accent)', borderRadius: 99, animation: 'eq 0.6s ease infinite', animationDelay: '0.3s' }} />
                  </span>
                )}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-dim)', marginTop: 2 }}>
                {track.artist ?? '未知艺术家'}
                {track.album ? ` · ${track.album}` : ''}
              </div>
            </div>

            {/* Duration */}
            {track.duration && (
              <span style={{ fontSize: '.78rem', color: 'var(--text-dim)' }}>
                {track.duration}
              </span>
            )}
          </div>
        )
      })}

      {tracks.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 48 }}>
          暂无音乐
        </p>
      )}
    </div>
  )
}
