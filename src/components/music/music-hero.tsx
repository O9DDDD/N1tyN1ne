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

  // Reset cover error on track change
  useEffect(() => { setCoverError(false) }, [currentTrack?.id])

  // sessionStorage recovery — always check, skip only if same track already active
  useEffect(() => {
    const trackJson = sessionStorage.getItem('pendingTrack')
    if (!trackJson) return
    try {
      const track = JSON.parse(trackJson)
      // Skip if this exact track is already playing
      if (currentTrack?.id === track.id) return
      const playlistJson = sessionStorage.getItem('pendingPlaylist')
      const playlist = playlistJson ? JSON.parse(playlistJson) : [track]
      sessionStorage.removeItem('pendingTrack')
      sessionStorage.removeItem('pendingPlaylist')
      play(track, playlist)
    } catch { /* ignore */ }
  }, [currentTrack?.id])

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
      <div className="songs-empty">
        <div className="songs-empty-icon">♪</div>
        <p>在音乐库中选择一首歌曲开始播放</p>
      </div>
    )
  }

  return (
    <div className="songs-player">
      {/* Ambient background */}
      {currentTrack.cover_url && (
        <div className="songs-bg">
          <img className="songs-bg-img" src={currentTrack.cover_url} alt="" />
          <div className="songs-bg-overlay" />
        </div>
      )}

      {/* Back button */}
      <button className="songs-back" onClick={() => { router.push('/music') }}>
        ← 返回音乐库
      </button>

      {/* Main content */}
      <div className="songs-content">
        {/* Cover */}
        <div className="songs-visual">
          <div className={`songs-cover-wrap${isPlaying ? ' playing' : ''}`}>
            {currentTrack.cover_url && !coverError ? (
              <img
                className="songs-cover"
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                onError={() => setCoverError(true)}
              />
            ) : (
              <div className="songs-cover songs-cover-placeholder">♪</div>
            )}
          </div>
        </div>

        {/* Info + Lyrics */}
        <div className="songs-main">
          <div className="songs-info">
            <h1 className="songs-title">{currentTrack.title}</h1>

            <div className="songs-artist-row">
              {artists.length > 0 && Object.values(artistImgs).some(Boolean) && (
                <div className="songs-artist-avatars">
                  {artists.map((name) => {
                    const url = artistImgs[name]
                    return url ? (
                      <img key={name} className="songs-artist-avatar" src={url} alt={name} />
                    ) : null
                  })}
                </div>
              )}
              <span className="songs-artist">
                {artists.length > 0 ? (
                  artists.map((name, i) => (
                    <span key={name}>
                      {i > 0 && <span> · </span>}
                      <button
                        className="songs-artist-link"
                        onClick={() => router.push(`/music?artist=${encodeURIComponent(name)}`)}
                      >
                        {name}
                      </button>
                    </span>
                  ))
                ) : (
                  displayArtist
                )}
              </span>
            </div>

            <div className="songs-meta">
              {albumArtist && <span>{albumArtist}</span>}
              {albumArtist && albumName && albumName !== albumArtist && (
                <>
                  <span style={{ margin: '0 2px' }}>·</span>
                  <button
                    className="songs-meta-link"
                    onClick={() => router.push(`/music?album=${encodeURIComponent(albumName)}`)}
                  >
                    {albumName}
                  </button>
                </>
              )}
              {!albumArtist && albumName && (
                <button
                  className="songs-meta-link"
                  onClick={() => router.push(`/music?album=${encodeURIComponent(albumName)}`)}
                >
                  {albumName}
                </button>
              )}
              {albumYear && <span className="songs-meta-dot" style={{ margin: '0 2px' }} />}
              {albumYear && <span>{albumYear}</span>}
            </div>

            {currentTrack.genre && (
              <span className="songs-genre">{currentTrack.genre}</span>
            )}
          </div>

          {/* Lyrics */}
          {hasLyrics ? (
            <div className="songs-lyrics" ref={lyricsRef}>
              {lrcLines!.map((line, i) => {
                const isActive = i === activeIndex
                return (
                  <p
                    key={i}
                    ref={isActive ? activeRef : null}
                    className={`songs-lyric-line${isActive ? ' songs-lyric-active' : ''}`}
                    onClick={() => handleLyricClick(line.time)}
                  >
                    {line.text}
                  </p>
                )
              })}
            </div>
          ) : (
            <div className="songs-no-lyrics">暂无歌词</div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="songs-bottom">
        <div className="songs-progress">
          <span className="songs-time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="songs-progress-bar"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleProgressChange}
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          />
          <span className="songs-time">{formatTime(duration)}</span>
        </div>

        <div className="songs-controls">
          <button className="songs-ctrl-sm active" onClick={toggleShuffle}>
            {isShuffled ? '🔀 随机' : '🔀 顺序'}
          </button>

          <button className="songs-ctrl-btn" onClick={prev} aria-label="上一首">
            ⏮
          </button>

          <button
            className="songs-ctrl-play"
            onClick={() => (isPlaying ? pause() : resume())}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button className="songs-ctrl-btn" onClick={next} aria-label="下一首">
            ⏭
          </button>

          <button className="songs-ctrl-sm active" onClick={toggleRepeat}>
            {repeatMode === 'one' ? '🔂 单曲' : repeatMode === 'all' ? '🔁 列表' : '🔁 关闭'}
          </button>

          {hasLyrics && (
            <div className="songs-volume">
              <span className="songs-volume-icon">🔊</span>
              <input
                type="range"
                className="songs-volume-slider"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
