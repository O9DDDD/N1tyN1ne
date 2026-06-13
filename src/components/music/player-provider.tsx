'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'

export interface PlayerTrack {
  id: string
  title: string
  artist: string | null
  album: string | null
  album_artist: string | null
  album_year: string | null
  album_description: string | null
  genre: string | null
  track_number: number | null
  audio_url: string
  cover_url: string | null
  duration: string | null
  lyrics: string | null
}

export type RepeatMode = 'off' | 'one' | 'all'

interface PlayerState {
  currentTrack: PlayerTrack | null
  isPlaying: boolean
  playlist: PlayerTrack[]
  currentTime: number
  duration: number
  volume: number
  isShuffled: boolean
  repeatMode: RepeatMode
  audioRef: React.RefObject<HTMLAudioElement | null>
  play: (track: PlayerTrack, playlist?: PlayerTrack[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  prev: () => void
  seek: (time: number) => void
  setVolume: (v: number) => void
  setPlaylist: (tracks: PlayerTrack[]) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
}

const PlayerContext = createContext<PlayerState>({
  currentTrack: null,
  isPlaying: false,
  playlist: [],
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isShuffled: false,
  repeatMode: 'off',
  audioRef: { current: null },
  play: () => {},
  pause: () => {},
  resume: () => {},
  next: () => {},
  prev: () => {},
  seek: () => {},
  setVolume: () => {},
  setPlaylist: () => {},
  toggleShuffle: () => {},
  toggleRepeat: () => {},
})

export function usePlayer() {
  return useContext(PlayerContext)
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState<PlayerTrack[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextRef = useRef<() => void>(() => {})
  const isPlayingRef = useRef(false)

  // Lazy-init audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
      audioRef.current.volume = volume
    }
    const audio = audioRef.current

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMeta = () => setDuration(audio.duration)
    const onEnded = () => nextRef.current()

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMeta)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMeta)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  // Sync src when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    audio.currentTime = 0
    audio.src = currentTrack.audio_url
    const playWhenReady = () => {
      audio.removeEventListener('canplay', playWhenReady)
      audio.currentTime = 0
      if (isPlayingRef.current) audio.play().catch(() => {})
    }
    // 已缓存的音频 readyState >= 2 时 canplay 不会触发
    if (audio.readyState >= 2) {
      playWhenReady()
    } else {
      audio.addEventListener('canplay', playWhenReady)
    }
    return () => audio.removeEventListener('canplay', playWhenReady)
  }, [currentTrack?.id])

  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // getShuffledIndex picks a random index != current
  const getShuffledIndex = useCallback((currentIdx: number, length: number): number => {
    if (length <= 1) return 0
    let idx: number
    do { idx = Math.floor(Math.random() * length) } while (idx === currentIdx && length > 1)
    return idx
  }, [])

  const play = useCallback((track: PlayerTrack, newPlaylist?: PlayerTrack[]) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    if (newPlaylist) setPlaylist(newPlaylist)
    else if (!playlist.some((t) => t.id === track.id)) {
      setPlaylist([track])
    }
  }, [playlist])

  const pause = useCallback(() => setIsPlaying(false), [])
  const resume = useCallback(() => setIsPlaying(true), [])

  const next = useCallback(() => {
    if (!currentTrack) return
    const idx = playlist.findIndex((t) => t.id === currentTrack.id)
    if (idx < 0) { setIsPlaying(false); return }

    // Last track
    if (idx >= playlist.length - 1) {
      if (repeatMode === 'all') {
        const nextTrack = playlist[0]
        setCurrentTrack(nextTrack)
        setIsPlaying(true)
        return
      }
      setIsPlaying(false)
      return
    }

    let nextIdx: number
    if (isShuffled) {
      nextIdx = getShuffledIndex(idx, playlist.length)
    } else {
      nextIdx = idx + 1
    }

    const nextTrack = playlist[nextIdx]
    setCurrentTrack(nextTrack)
    setIsPlaying(true)
  }, [currentTrack, playlist, isShuffled, repeatMode, getShuffledIndex])
  nextRef.current = next

  const prev = useCallback(() => {
    if (!currentTrack) return
    const audio = audioRef.current

    // If more than 3s in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }

    const idx = playlist.findIndex((t) => t.id === currentTrack.id)
    if (idx <= 0) {
      if (audio) audio.currentTime = 0
      return
    }
    const prevTrack = playlist[idx - 1]
    setCurrentTrack(prevTrack)
    setIsPlaying(true)
  }, [currentTrack, playlist])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }, [])

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)))
  }, [])

  const toggleShuffle = useCallback(() => setIsShuffled((s) => !s), [])
  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => m === 'off' ? 'all' : m === 'all' ? 'one' : 'off')
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playlist,
        currentTime,
        duration,
        volume,
        isShuffled,
        repeatMode,
        audioRef,
        play,
        pause,
        resume,
        next,
        prev,
        seek,
        setVolume,
        setPlaylist,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}
