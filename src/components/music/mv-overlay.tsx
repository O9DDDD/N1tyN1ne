'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
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

export function MvOverlay() {
  const {
    currentTrack,
    isMvActive,
    mvQuality,
    setMvQuality,
    onMvEnd,
    onMvError,
    audioRef,
  } = usePlayer()
  const { showToast } = useToast()
  const pathname = usePathname()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [resolvedQuality, setResolvedQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(true)
  const triedRef = useRef<Set<string>>(new Set())
  const [srcKey, setSrcKey] = useState(0)

  const mv = currentTrack?.mv_urls ?? null
  const available = QUALITY_ORDER.filter((q) => !!mv?.[q])

  // Don't show on songs page (MusicHero handles it there)
  if (pathname === '/songs' || pathname === '/music') return null

  // Reset state when MV activates or track changes
  useEffect(() => {
    if (!isMvActive || !currentTrack?.mv_urls) return
    const q = detectQuality(currentTrack.mv_urls, mvQuality)
    setResolvedQuality(q)
    triedRef.current.clear()
    setLoading(true)
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

  const handleLoaded = useCallback(() => setLoading(false), [])

  const handleError = useCallback(() => {
    triedRef.current.add(resolvedQuality)
    for (const q of available) {
      if (!triedRef.current.has(q)) {
        setResolvedQuality(q)
        setSrcKey((k) => k + 1)
        return
      }
    }
    showToast('MV 加载失败，已切换为音频模式', 'error')
    onMvError()
  }, [resolvedQuality, available, showToast, onMvError])

  const handleEnded = useCallback(() => onMvEnd(), [onMvEnd])

  const cycleQuality = useCallback(() => {
    const idx = available.indexOf(resolvedQuality)
    const next = available[(idx + 1) % available.length]
    setResolvedQuality(next)
    setMvQuality(next)
    setLoading(true)
    setSrcKey((k) => k + 1)
    if (videoRef.current && audioRef.current) {
      videoRef.current.currentTime = audioRef.current.currentTime
    }
    triedRef.current.clear()
  }, [available, resolvedQuality, setMvQuality, audioRef])

  const handleClose = useCallback(() => onMvEnd(), [onMvEnd])

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.removeAttribute('src')
        videoRef.current.load()
      }
    }
  }, [])

  if (!isMvActive || !currentTrack?.mv_urls) return null
  if (available.length === 0) return null

  return (
    <div className="mv-overlay">
      <div className="mv-backdrop" />

      {loading && (
        <div className="mv-loading">
          <div className="mv-spinner" />
          <span>加载 MV...</span>
        </div>
      )}

      <video
        key={srcKey}
        ref={videoRef}
        className="mv-video"
        src={src}
        autoPlay
        playsInline
        onLoadedData={handleLoaded}
        onEnded={handleEnded}
        onError={handleError}
      />

      <button className="mv-close-btn" onClick={handleClose} aria-label="关闭 MV">
        ✕
      </button>

      {available.length > 1 && (
        <button
          className="mv-quality-btn"
          onClick={cycleQuality}
          aria-label="切换画质"
        >
          {resolvedQuality === 'low' ? '360p' : resolvedQuality === 'medium' ? '720p' : '1080p'}
        </button>
      )}
    </div>
  )
}
