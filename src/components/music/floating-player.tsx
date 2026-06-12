'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayer } from '@/components/music/player-provider'
import { parseLRC, getActiveIndex, type LyricLine } from '@/lib/lrc'

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
    seek,
  } = usePlayer()

  const pathname = usePathname()
  const router = useRouter()
  const [coverSwitching, setCoverSwitching] = useState(false)
  const prevTrackId = useRef<string | null>(null)
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const activeRef = useRef<HTMLParagraphElement>(null)
  const lyricsScrollRef = useRef<HTMLDivElement>(null)

  // Track change animation
  useEffect(() => {
    if (currentTrack && currentTrack.id !== prevTrackId.current) {
      setCoverSwitching(true)
      const t = setTimeout(() => setCoverSwitching(false), 400)
      prevTrackId.current = currentTrack.id
      return () => clearTimeout(t)
    }
  }, [currentTrack?.id])

  // LRC parsing
  const rawLyrics = currentTrack?.lyrics ?? null
  const lrcLines: LyricLine[] | null = useMemo(() => {
    if (!rawLyrics) return null
    const parsed = parseLRC(rawLyrics)
    return parsed.length > 0 ? parsed : null
  }, [rawLyrics, currentTrack?.id])
  const hasLyrics = !!lrcLines

  const activeIndex = useMemo(() => {
    if (!lrcLines) return -1
    return getActiveIndex(lrcLines, currentTime)
  }, [lrcLines, currentTime])

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeRef.current && lyricsOpen) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, lyricsOpen])

  // Close lyrics when track changes
  useEffect(() => {
    setLyricsOpen(false)
  }, [currentTrack?.id])

  // Hide on /songs page
  if (pathname === '/songs' || pathname === '/music') return null
  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    if (duration > 0) seek(ratio * duration)
  }, [duration, seek])

  const handleLyricClick = useCallback((time: number) => {
    seek(time)
  }, [seek])

  const goToSongs = useCallback(() => {
    router.push('/songs')
  }, [router])

  return (
    <div className={`float-player${lyricsOpen ? ' fp-expanded' : ''}`}>
      {/* Lyrics panel */}
      {hasLyrics && lyricsOpen && (
        <div className="fp-lyrics" ref={lyricsScrollRef}>
          {lrcLines!.map((line, i) => {
            const isActive = i === activeIndex
            return (
              <p
                key={i}
                ref={isActive ? activeRef : null}
                className={`fp-lrc-line${isActive ? ' fp-lrc-active' : ''}`}
                onClick={() => handleLyricClick(line.time)}
              >
                {line.text}
              </p>
            )
          })}
        </div>
      )}

      <div className="fp-main">
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

        {/* Lyrics toggle */}
        {hasLyrics && (
          <button
            className={`fp-lyrics-btn${lyricsOpen ? ' active' : ''}`}
            onClick={() => setLyricsOpen((v) => !v)}
            title={lyricsOpen ? '收起歌词' : '展开歌词'}
          >
            词
          </button>
        )}
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
