'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePlayer, type PlayerTrack } from '@/components/music/player-provider'

export function FloatingPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    next,
    prev,
    pause,
    resume,
    isMvActive,
  } = usePlayer()

  const [coverSwitching, setCoverSwitching] = useState(false)
  const prevTrackId = useRef<string | null>(null)

  useEffect(() => {
    if (currentTrack && currentTrack.id !== prevTrackId.current) {
      // No-MV transition: cover fade animation
      if (!isMvActive) {
        setCoverSwitching(true)
        const t = setTimeout(() => setCoverSwitching(false), 400)
        return () => clearTimeout(t)
      }
      prevTrackId.current = currentTrack.id
    }
  }, [currentTrack?.id, isMvActive])

  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="float-player">
      {/* Cover */}
      {currentTrack.cover_url ? (
        <img
          src={currentTrack.cover_url}
          alt={currentTrack.title}
          className={`fp-cover${isPlaying && !coverSwitching ? ' playing' : ''}${coverSwitching ? ' cover-switching' : ''}`}
        />
      ) : (
        <div
          className={`fp-cover fp-cover-placeholder${isPlaying && !coverSwitching ? ' playing' : ''}${coverSwitching ? ' cover-switching' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-muted)',
            color: 'var(--text-dim)',
            fontSize: '1.2rem',
          }}
        >
          ♪
        </div>
      )}

      {/* Info */}
      <div className="fp-info">
        <div className="fp-title">{currentTrack.title}</div>
        <div className="fp-lyric">
          {currentTrack.artist ?? '未知艺术家'}
          {currentTrack.album ? ` · ${currentTrack.album}` : ''}
        </div>
      </div>

      {/* Controls */}
      <div className="fp-ctrls">
        <button onClick={prev} title="上一首" aria-label="上一首">
          ⏮
        </button>
        <button
          onClick={() => (isPlaying ? pause() : resume())}
          title={isPlaying ? '暂停' : '播放'}
          aria-label={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={next} title="下一首" aria-label="下一首">
          ⏭
        </button>
      </div>

      {/* Progress bar */}
      <div className="fp-progress">
        <div className="fp-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
