'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayer } from '@/components/music/player-provider'
import { parseLRC, getActiveIndex } from '@/lib/lrc'
import { splitArtists } from '@/lib/artist'

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
    play,
    resume,
    pause,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer()
  const router = useRouter()

  const [showLyrics, setShowLyrics] = useState(false)

  // Reset cover error on track change
  useEffect(() => { setCoverError(false) }, [currentTrack?.id])

  // sessionStorage recovery
  useEffect(() => {
    const trackJson = sessionStorage.getItem('pendingTrack')
    if (!trackJson) return
    try {
      const track = JSON.parse(trackJson)
      if (currentTrack?.id === track.id) return
      const playlistJson = sessionStorage.getItem('pendingPlaylist')
      const playlist = playlistJson ? JSON.parse(playlistJson) : [track]
      sessionStorage.removeItem('pendingTrack')
      sessionStorage.removeItem('pendingPlaylist')
      play(track, playlist)
    } catch { /* ignore */ }
  }, [currentTrack?.id, play])

  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLParagraphElement>(null)

  const rawLyrics = currentTrack?.lyrics ?? null

  const lrcLines = useMemo(() => {
    if (!rawLyrics) return null
    const parsed = parseLRC(rawLyrics)
    return parsed.length > 0 ? parsed : null
  }, [rawLyrics, currentTrack?.id])

  const hasLyrics = !!lrcLines

  const activeIndex = useMemo(() => {
    if (!lrcLines) return -1
    return getActiveIndex(lrcLines, currentTime)
  }, [lrcLines, currentTime])

  useEffect(() => {
    if (activeRef.current && showLyrics) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex, showLyrics])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value))
  }, [seek])

  const handleLyricClick = useCallback((time: number) => {
    seek(time)
  }, [seek])

  // artists
  const artists = useMemo(() => splitArtists(currentTrack?.artist ?? null), [currentTrack?.artist])
  const displayArtist = artists.length > 0 ? artists.join(' · ') : (currentTrack?.artist ?? '未知艺术家')
  const albumName = currentTrack?.album || null
  const albumYear = currentTrack?.album_year || null
  const albumArtist = currentTrack?.album_artist || null

  // artist images
  const [coverError, setCoverError] = useState(false)
  const [artistImgs, setArtistImgs] = useState<Record<string, string | null>>({})
  useEffect(() => {
    if (artists.length === 0) return
    const toFetch = artists.filter((a) => !(a in artistImgs))
    if (toFetch.length === 0) return
    let canceled = false
    const names = toFetch.join(',')
    fetch(`/api/artist/image?name=${encodeURIComponent(names)}`)
      .then((res) => res.json())
      .then((data) => {
        if (canceled) return
        const map: Record<string, string | null> = data.results || {}
        setArtistImgs((prev) => {
          const next = { ...prev }
          for (const name of toFetch) {
            next[name] = map[name] ?? null
          }
          return next
        })
      })
      .catch(() => {})
    return () => { canceled = true }
  }, [artists.join(',')])

  // Empty state
  if (!currentTrack) {
    return (
      <div className="music-hero music-hero-empty">
        <div className="hero-empty-icon">♪</div>
        <p>在音乐库中选择一首歌曲开始播放</p>
      </div>
    )
  }

  return (
    <div className="music-hero">
      {/* Back button */}
      <button className="hero-back" onClick={() => router.push('/music')}>
        ← 返回音乐库
      </button>

      {/* Visual: Vinyl */}
      <div className="hero-visual">
        <div className={`vinyl-wrap${isPlaying ? ' spinning' : ''}`}>
          <div className="vinyl-disc" />
          {currentTrack.cover_url && !coverError ? (
            <img
              className="vinyl-cover"
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              onError={() => setCoverError(true)}
            />
          ) : (
            <div className="vinyl-cover vinyl-cover-placeholder">♪</div>
          )}
        </div>
      </div>

      {/* Track Info */}
      <div className="hero-info">
        <h2 className="hero-title">{currentTrack.title}</h2>

        {/* Artist Avatars */}
        {artists.length > 0 && Object.values(artistImgs).some(Boolean) && (
          <div className="hero-artist-imgs">
            {artists.map((name) => {
              const url = artistImgs[name]
              return url ? (
                <img key={name} className="hero-artist-avatar" src={url} alt={name} />
              ) : null
            })}
          </div>
        )}

        <p className="hero-artist">
          {artists.length > 0 ? (
            artists.map((name, i) => (
              <span key={name}>
                {i > 0 && ' · '}
                <button
                  className="hero-artist-link"
                  onClick={() => router.push(`/music?artist=${encodeURIComponent(name)}`)}
                >
                  {name}
                </button>
              </span>
            ))
          ) : (
            displayArtist
          )}
        </p>

        {currentTrack.genre && (
          <span className="hero-genre-tag">{currentTrack.genre}</span>
        )}
      </div>

      {/* Album Info */}
      <div className="hero-album">
        <span className="hero-album-icon">💿</span>
        {albumArtist && albumName && albumName !== albumArtist ? (
          <>
            <span className="hero-album-artist">{albumArtist}</span>
            <span> · </span>
            <button
              className="hero-album-link"
              onClick={() => router.push(`/music?album=${encodeURIComponent(albumName)}`)}
            >
              {albumName}
            </button>
          </>
        ) : albumName ? (
          <button
            className="hero-album-link"
            onClick={() => router.push(`/music?album=${encodeURIComponent(albumName)}`)}
          >
            {albumName}
          </button>
        ) : null}
        {!albumArtist && albumName ? (
          <button
            className="hero-album-link"
            onClick={() => router.push(`/music?album=${encodeURIComponent(albumName)}`)}
          >
            {albumName}
          </button>
        ) : null}
        {albumYear && (
          <>
            <span> · </span>
            <span className="hero-album-year">{albumYear}</span>
          </>
        )}
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
          max={duration || 1}
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
          <button className="hero-btn" onClick={prev} aria-label="上一首">
            ⏮
          </button>
          <button
            className="hero-btn hero-btn-play"
            onClick={() => (isPlaying ? pause() : resume())}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="hero-btn" onClick={next} aria-label="下一首">
            ⏭
          </button>
        </div>

        <div className="hero-ctrl-extra">
          <button
            className={`hero-btn-sm${isShuffled ? ' active' : ''}`}
            onClick={toggleShuffle}
          >
            {isShuffled ? '🔀 随机' : '🔀 顺序'}
          </button>

          <button
            className={`hero-btn-sm${repeatMode !== 'off' ? ' active' : ''}`}
            onClick={toggleRepeat}
          >
            {repeatMode === 'one' ? '🔂 单曲' : repeatMode === 'all' ? '🔁 列表' : '🔁 关闭'}
          </button>

          {hasLyrics && (
            <button
              className={`hero-btn-sm${showLyrics ? ' active' : ''}`}
              onClick={() => setShowLyrics((v) => !v)}
            >
              词
            </button>
          )}

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
