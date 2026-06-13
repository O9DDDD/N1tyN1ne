'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayer } from '@/components/music/player-provider'
import { parseLRC, getActiveIndex } from '@/lib/lrc'
import { splitArtists, extractFeat } from '@/lib/artist'

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
  const [recovered, setRecovered] = useState(false)

  const lyricsRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLParagraphElement>(null)

  // sessionStorage recovery
  useEffect(() => {
    const trackJson = sessionStorage.getItem('pendingTrack')
    if (!trackJson) { setRecovered(true); return }
    try {
      const track = JSON.parse(trackJson)
      if (currentTrack?.id === track.id) { setRecovered(true); return }
      const playlistJson = sessionStorage.getItem('pendingPlaylist')
      const playlist = playlistJson ? JSON.parse(playlistJson) : [track]
      sessionStorage.removeItem('pendingTrack')
      sessionStorage.removeItem('pendingPlaylist')
      play(track, playlist)
      setRecovered(true)
    } catch { setRecovered(true) }
  }, [currentTrack?.id, play])

  // Auto-redirect to /music if no track after recovery
  useEffect(() => {
    if (recovered && !currentTrack) {
      router.replace('/music')
    }
  }, [recovered, currentTrack, router])

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
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value))
  }, [seek])

  const handleLyricClick = useCallback((time: number) => {
    seek(time)
  }, [seek])

  const repeatLabel = repeatMode === 'one' ? '🔂' : repeatMode === 'all' ? '🔁' : '🔁'

  // Parse artists
  const artists = useMemo(() => splitArtists(currentTrack?.artist ?? null), [currentTrack?.artist])
  const featArtist = useMemo(() => extractFeat(currentTrack?.artist ?? null), [currentTrack?.artist])
  const displayArtist = artists.length > 0 ? artists.join(' · ') : (currentTrack?.artist ?? '未知艺术家')
  const albumName = currentTrack?.album_artist || currentTrack?.album || null
  const albumYear = currentTrack?.album_year || null

  // Artist images
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

  if (!currentTrack) {
    return (
      <div className="playback-page-empty">
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="playback-page">
      {/* Blurred background */}
      <div className="playback-bg">
        {currentTrack.cover_url ? (
          <img src={currentTrack.cover_url} alt="" aria-hidden="true" />
        ) : (
          <div className="playback-bg-fallback" />
        )}
        <div className="playback-bg-overlay" />
      </div>

      {/* Content */}
      <div className="playback-content">
        <div className="playback-columns">
          {/* LEFT: Cover + Vinyl */}
          <div className="playback-cover-col">
            <div className="playback-cover-wrap">
              <div className={`playback-vinyl${isPlaying ? ' spinning' : ''}`} />
              {currentTrack.cover_url ? (
                <img
                  className="playback-cover"
                  src={currentTrack.cover_url}
                  alt={currentTrack.title}
                />
              ) : (
                <div className="playback-cover-placeholder">♪</div>
              )}
            </div>
          </div>

          {/* RIGHT: Info + Lyrics */}
          <div className="playback-lyrics-col">
            <div className="playback-info">
              {/* Artist avatars */}
              {artists.length > 0 && Object.values(artistImgs).some(Boolean) && (
                <div className="playback-artist-imgs">
                  {artists.map((name) => {
                    const url = artistImgs[name]
                    return url ? (
                      <img key={name} className="playback-artist-avatar" src={url} alt={name} />
                    ) : null
                  })}
                </div>
              )}
              <p className="playback-artist">{displayArtist}</p>
              <h2 className="playback-title">{currentTrack.title}</h2>
              {featArtist && (
                <p className="playback-feat">ft. {featArtist}</p>
              )}
              {albumName && (
                <p className="playback-album">
                  💿 {albumName}{albumYear ? ` · ${albumYear}` : ''}
                </p>
              )}
              {currentTrack.genre && (
                <span className="playback-genre-tag">{currentTrack.genre}</span>
              )}
            </div>

            {/* Lyrics */}
            {hasLyrics ? (
              <div className="playback-lyrics" ref={lyricsRef}>
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
            ) : (
              <div className="playback-no-lyrics">暂无歌词</div>
            )}
          </div>
        </div>

        {/* Bottom: Progress + Controls */}
        <div className="playback-bottom">
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
              <button
                className={`hero-btn-sm${isShuffled ? ' active' : ''}`}
                onClick={toggleShuffle}
                title={isShuffled ? '关闭随机' : '随机播放'}
              >
                🔀
              </button>

              <button
                className={`hero-btn-sm${repeatMode !== 'off' ? ' active' : ''}`}
                onClick={toggleRepeat}
                title={repeatMode === 'off' ? '列表循环' : repeatMode === 'all' ? '单曲循环' : '关闭循环'}
              >
                {repeatLabel}
              </button>

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
      </div>
    </div>
  )
}
