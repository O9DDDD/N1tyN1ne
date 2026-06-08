'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePlayer } from '@/components/music/player-provider'
import { useToast } from '@/components/layout/toast-provider'
import type { MvUrls } from '@/lib/supabase/types'

const QUALITY_ORDER: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']

function detectQuality(mv_urls: MvUrls, preference: 'low' | 'medium' | 'high' | 'auto'): 'low' | 'medium' | 'high' {
  if (preference !== 'auto') return preference

  const conn = (navigator as any).connection
  if (conn?.effectiveType) {
    const t = conn.effectiveType as string
    if (t === 'slow-2g' || t === '2g') {
      if (mv_urls.low) return 'low'
    }
    if (t === '3g') {
      if (mv_urls.medium) return 'medium'
      if (mv_urls.low) return 'low'
    }
  }
  if (mv_urls.high) return 'high'
  if (mv_urls.medium) return 'medium'
  return 'low'
}

function getAvailableQualities(mv_urls: Record<string, string>): Array<'low' | 'medium' | 'high'> {
  return QUALITY_ORDER.filter((q) => !!mv_urls[q])
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
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [resolvedQuality, setResolvedQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [signError, setSignError] = useState(false)
  const triedRef = useRef<Set<string>>(new Set())

  // Fetch signed URLs when MV activates
  useEffect(() => {
    if (!isMvActive || !currentTrack?.id) return
    setLoading(true)
    setSignError(false)
    setSignedUrls({})
    triedRef.current.clear()

    fetch('/api/mv/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: currentTrack.id }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('sign failed')
        return res.json()
      })
      .then((data) => {
        if (data.urls && Object.keys(data.urls).length > 0) {
          setSignedUrls(data.urls)
        } else {
          throw new Error('no urls')
        }
      })
      .catch(() => {
        setSignError(true)
        showToast('MV 签名获取失败，已切换为音频模式', 'error')
        onMvError()
      })
      .finally(() => setLoading(false))
  }, [isMvActive, currentTrack?.id])

  if (!isMvActive || !currentTrack?.mv_urls) return null
  if (signError) return null
  if (loading) {
    return (
      <div className="mv-overlay">
        <div className="mv-backdrop" />
        <div style={{ position: 'relative', zIndex: 1, color: '#fff', fontSize: '1rem' }}>
          加载 MV...
        </div>
      </div>
    )
  }

  const available = getAvailableQualities(signedUrls)
  if (available.length === 0) return null

  // Resolve quality on mount / preference change
  useEffect(() => {
    const mv_urls_bool: MvUrls = {}
    for (const q of available) mv_urls_bool[q] = signedUrls[q]
    const q = detectQuality(mv_urls_bool, mvQuality)
    setResolvedQuality(q)
    triedRef.current.clear()
  }, [signedUrls, mvQuality])

  const src = signedUrls[resolvedQuality] ?? ''

  const handleEnded = useCallback(() => {
    onMvEnd()
  }, [onMvEnd])

  const handleError = useCallback(() => {
    triedRef.current.add(resolvedQuality)
    for (const q of available) {
      if (!triedRef.current.has(q)) {
        setResolvedQuality(q)
        return
      }
    }
    showToast('MV 加载失败，已切换为音频模式', 'error')
    onMvError()
  }, [resolvedQuality, available, showToast, onMvError])

  const cycleQuality = useCallback(() => {
    const idx = available.indexOf(resolvedQuality)
    const next = available[(idx + 1) % available.length]
    setResolvedQuality(next)
    setMvQuality(next)
    if (videoRef.current && audioRef.current) {
      videoRef.current.currentTime = audioRef.current.currentTime
    }
    triedRef.current.clear()
  }, [available, resolvedQuality, setMvQuality, audioRef])

  const handleClose = useCallback(() => {
    onMvEnd()
  }, [onMvEnd])

  return (
    <div className="mv-overlay">
      <div className="mv-backdrop" />
      <video
        ref={videoRef}
        className="mv-video"
        src={src}
        autoPlay
        playsInline
        onEnded={handleEnded}
        onError={handleError}
      />
      <button className="mv-close-btn" onClick={handleClose} aria-label="关闭 MV">
        ✕
      </button>
      <div className="mv-quality-btn-group">
        <button
          className="mv-quality-btn"
          onClick={cycleQuality}
          aria-label="切换画质"
        >
          {resolvedQuality === 'low' ? '360p' : resolvedQuality === 'medium' ? '720p' : '1080p'}
        </button>
      </div>
    </div>
  )
}
