'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { usePlayer } from '@/components/music/player-provider'
import { parseLRC, getActiveIndex } from '@/lib/lrc'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function MusicHero() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffled,
    repeatMode,
    resume,
    pause,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer()

  const [showLyrics, setShowLyrics] = useState(false)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLParagraphElement>(null)

  const rawLyrics = currentTrack?.lyrics ?? null

  const lrcLines = useMemo(() => {
    if (!rawLyrics) return null
    const parsed = parseLRC(rawLyrics)
    return parsed.length > 0 ? parsed : null
  }, [rawLyrics, currentTrack?.id])

  const hasLyrics = !!lrcLines

  // Find current lyric line index
  const activeIndex = useMemo(() => {
    if (!lrcLines) return -1
    return getActiveIndex(lrcLines, currentTime)
  }, [lrcLines, currentTime])

  // Auto-scroll to active line
  useEffect(() => {
    if (activeRef.current && showLyrics) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, showLyrics])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    seek(t)
  }, [seek])

  const handleLyricClick = useCallback((time: number) => {
    seek(time)
  }, [seek])

  const repeatLabel = repeatMode === 'one' ? '🔂' : repeatMode === 'all' ? '🔁' : '🔁'

  if (!currentTrack) {
    return (
      <div className="music-hero music-hero-empty">
        <div className="hero-empty-icon">♪</div>
        <p>选择一首歌曲开始播放</p>
      </div>
    )
  }

  return (
    <div className="music-hero">
      {/* Visual: Vinyl */}
      <div className="hero-visual">
        <div className={`vinyl-wrap${isPlaying ? ' spinning' : ''}`}>
          <div className="vinyl-disc" />
          {currentTrack.cover_url ? (
            <img
              className="vinyl-cover"
              src={currentTrack.cover_url}
              alt={currentTrack.title}
            />
          ) : (
            <div className="vinyl-cover vinyl-cover-placeholder">♪</div>
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="hero-info">
        <h2 className="hero-title">{currentTrack.title}</h2>
        <p className="hero-artist">
          {currentTrack.artist ?? '未知艺术家'}
          {currentTrack.album ? ` · ${currentTrack.album}` : ''}
        </p>
      </div>

      {/* Scrolling Lyrics */}
      {hasLyrics && showLyrics && (
        <div className="hero-lyrics" ref={lyricsRef}>
          {lrcLines!.map((line, i) => {
            const isActive = i === activeIndex
            return (
              <p
                key={i}
                ref={isActive ? activeRef : null}
                className={`lrc-line${isActive ? ' lrc-active' : ''}`}
                onClick={() => handleLyricClick(line.time)}
              >
                {line.text}
              </p>
            )
          })}
        </div>
      )}

      {/* Progress Bar */}
      <div className="hero-progress">
        <span className="hero-time">{formatTime(currentTime)}</span>
        <input
          type="range"
          className="hero-progress-bar"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleProgressChange}
          style={{ '--progress': `${progress}%` } as React.CSSProperties}
        />
        <span className="hero-time">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="hero-controls">
        <div className="hero-ctrl-main">
          <button className="hero-btn" onClick={prev} title="上一首" aria-label="上一首">
            ⏮
          </button>
          <button
            className="hero-btn hero-btn-play"
            onClick={() => (isPlaying ? pause() : resume())}
            title={isPlaying ? '暂停' : '播放'}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="hero-btn" onClick={next} title="下一首" aria-label="下一首">
            ⏭
          </button>
        </div>

        <div className="hero-ctrl-extra">
          {/* Shuffle */}
          <button
            className={`hero-btn-sm${isShuffled ? ' active' : ''}`}
            onClick={toggleShuffle}
            title={isShuffled ? '关闭随机' : '随机播放'}
          >
            🔀
          </button>

          {/* Repeat */}
          <button
            className={`hero-btn-sm${repeatMode !== 'off' ? ' active' : ''}`}
            onClick={toggleRepeat}
            title={repeatMode === 'off' ? '列表循环' : repeatMode === 'all' ? '单曲循环' : '关闭循环'}
          >
            {repeatLabel}
          </button>

          {/* Lyrics toggle */}
          {hasLyrics && (
            <button
              className={`hero-btn-sm${showLyrics ? ' active' : ''}`}
              onClick={() => setShowLyrics((v) => !v)}
              title={showLyrics ? '隐藏歌词' : '显示歌词'}
            >
              词
            </button>
          )}

          {/* Volume */}
          <div className="hero-volume">
            <span className="hero-volume-icon">🔊</span>
            <input
              type="range"
              className="hero-volume-slider"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
