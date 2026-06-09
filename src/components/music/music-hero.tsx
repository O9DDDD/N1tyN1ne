'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePlayer } from '@/components/music/player-provider'
import { useToast } from '@/components/layout/toast-provider'
import type { MvUrls } from '@/lib/supabase/types'

const QUALITY_ORDER: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']

function detectQuality(mv_urls: MvUrls | null, preference: 'low' | 'medium' | 'high' | 'auto'): 'low' | 'medium' | 'high' {
  if (preference !== 'auto') return preference

  const conn = (navigator as any).connection
  if (conn?.effectiveType) {
    const t = conn.effectiveType as string
    if (t === 'slow-2g' || t === '2g') {
      if (mv_urls?.low) return 'low'
    }
    if (t === '3g') {
      if (mv_urls?.medium) return 'medium'
      if (mv_urls?.low) return 'low'
    }
  }
  if (mv_urls?.high) return 'high'
  if (mv_urls?.medium) return 'medium'
  return 'low'
}

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
    isMvActive,
    mvQuality,
    setMvQuality,
    currentTime,
    duration,
    volume,
    isShuffled,
    repeatMode,
    audioRef,
    resume,
    pause,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    onMvEnd,
    onMvError,
  } = usePlayer()
  const { showToast } = useToast()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [resolvedQuality, setResolvedQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [mvLoading, setMvLoading] = useState(true)
  const [mvError, setMvError] = useState(false)
  const triedRef = useRef<Set<string>>(new Set())
  const [srcKey, setSrcKey] = useState(0)

  const mv = currentTrack?.mv_urls ?? null
  const available = QUALITY_ORDER.filter((q) => !!mv?.[q])
  const hasMv = available.length > 0

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Reset MV state when activating or track changes
  useEffect(() => {
    if (!isMvActive || !currentTrack?.mv_urls) return
    const q = detectQuality(currentTrack.mv_urls, mvQuality)
    setResolvedQuality(q)
    triedRef.current.clear()
    setMvLoading(true)
    setMvError(false)
    setSrcKey((k) => k + 1)
  }, [isMvActive, mvQuality, currentTrack?.id])

  // Sync video time with audio on activation
  useEffect(() => {
    if (isMvActive && videoRef.current && audioRef.current) {
      videoRef.current.currentTime = audioRef.current.currentTime
    }
  }, [isMvActive])

  const src = currentTrack
    ? `/api/mv/stream?trackId=${encodeURIComponent(currentTrack.id)}&quality=${resolvedQuality}`
    : ''

  const handleMvLoaded = useCallback(() => setMvLoading(false), [])

  const handleMvError = useCallback(() => {
    triedRef.current.add(resolvedQuality)
    for (const q of available) {
      if (!triedRef.current.has(q)) {
        setResolvedQuality(q)
        setSrcKey((k) => k + 1)
        return
      }
    }
    showToast('MV 加载失败，已切换为音频模式', 'error')
    setMvError(true)
    onMvError()
  }, [resolvedQuality, available, showToast, onMvError])

  const handleMvClose = useCallback(() => onMvEnd(), [onMvEnd])

  const cycleQuality = useCallback(() => {
    const idx = available.indexOf(resolvedQuality)
    const next_q = available[(idx + 1) % available.length]
    setResolvedQuality(next_q)
    setMvQuality(next_q)
    setMvLoading(true)
    setSrcKey((k) => k + 1)
    if (videoRef.current && audioRef.current) {
      videoRef.current.currentTime = audioRef.current.currentTime
    }
    triedRef.current.clear()
  }, [available, resolvedQuality, setMvQuality, audioRef])

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    seek(t)
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
      {/* Visual: Vinyl or MV */}
      <div className="hero-visual">
        {isMvActive && !mvError ? (
          <div className="mv-inline">
            {mvLoading && (
              <div className="mv-loading">
                <div className="mv-spinner" />
                <span>加载 MV...</span>
              </div>
            )}
            <video
              key={srcKey}
              ref={videoRef}
              className="mv-video-inline"
              src={src}
              autoPlay
              playsInline
              onLoadedData={handleMvLoaded}
              onError={handleMvError}
            />
            <div className="mv-inline-controls">
              <button className="mv-ctrl-btn" onClick={handleMvClose} title="关闭 MV">
                ✕
              </button>
              {available.length > 1 && (
                <button className="mv-ctrl-btn mv-quality-badge" onClick={cycleQuality}>
                  {resolvedQuality === 'low' ? '360p' : resolvedQuality === 'medium' ? '720p' : '1080p'}
                </button>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </div>

      {/* Track Info */}
      <div className="hero-info">
        <h2 className="hero-title">{currentTrack.title}</h2>
        <p className="hero-artist">
          {currentTrack.artist ?? '未知艺术家'}
          {currentTrack.album ? ` · ${currentTrack.album}` : ''}
        </p>
      </div>

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
          {/* MV toggle */}
          {hasMv && (
            <button
              className={`hero-btn-sm${isMvActive ? ' active' : ''}`}
              onClick={() => (isMvActive ? onMvEnd() : (resume(), undefined))}
              title={isMvActive ? '关闭 MV' : '播放 MV'}
            >
              MV
            </button>
          )}

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
