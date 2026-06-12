'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayer } from '@/components/music/player-provider'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

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
  } = usePlayer()

  const pathname = usePathname()
  const router = useRouter()
  const [coverSwitching, setCoverSwitching] = useState(false)
  const prevTrackId = useRef<string | null>(null)

  // Track change animation
  useEffect(() => {
    if (currentTrack && currentTrack.id !== prevTrackId.current) {
      setCoverSwitching(true)
      const t = setTimeout(() => setCoverSwitching(false), 400)
      prevTrackId.current = currentTrack.id
      return () => clearTimeout(t)
    }
  }, [currentTrack?.id])

  // Hide on /songs page
  if (pathname === '/songs' || pathname === '/music') return null
  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const audio = (document.querySelector('audio') as HTMLAudioElement | null)
    if (audio && duration > 0) {
      audio.currentTime = ratio * duration
    }
  }, [duration])

  const goToSongs = useCallback(() => {
    router.push('/songs')
  }, [router])

  return (
    <div className="float-player">
      {/* Cover */}
      <div className="fp-cover-wrap" onClick={goToSongs}>
        {currentTrack.cover_url ? (
          <img
            src={currentTrack.cover_url}
            alt={currentTrack.title}
            className={`fp-cover${coverSwitching ? ' switching' : ''}`}
          />
        ) : (
          <div className={`fp-cover fp-cover-ph${coverSwitching ? ' switching' : ''}`}>
            ♪
          </div>
        )}
      </div>

      {/* Info */}
      <div className="fp-info" onClick={goToSongs}>
        <div className="fp-title">{currentTrack.title}</div>
        <div className="fp-artist">
          {currentTrack.artist ?? '未知艺术家'}
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
      <div className="fp-progress-bar" onClick={handleProgressClick}>
        <div className="fp-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Time */}
      <span className="fp-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
    </div>
  )
}
