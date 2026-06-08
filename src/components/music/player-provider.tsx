'use client'

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import type { MvUrls } from '@/lib/supabase/types'

export interface PlayerTrack {
  id: string
  title: string
  artist: string | null
  album: string | null
  audio_url: string
  cover_url: string | null
  duration: string | null
  mv_urls: MvUrls | null
}

interface PlayerState {
  currentTrack: PlayerTrack | null
  isPlaying: boolean
  playlist: PlayerTrack[]
  isMvActive: boolean
  mvQuality: 'low' | 'medium' | 'high' | 'auto'
  currentTime: number
  duration: number
  audioRef: React.RefObject<HTMLAudioElement | null>
  play: (track: PlayerTrack, playlist?: PlayerTrack[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  prev: () => void
  setPlaylist: (tracks: PlayerTrack[]) => void
  setMvQuality: (q: 'low' | 'medium' | 'high' | 'auto') => void
  onMvEnd: () => void
  onMvError: () => void
}

const PlayerContext = createContext<PlayerState>({
  currentTrack: null,
  isPlaying: false,
  playlist: [],
  isMvActive: false,
  mvQuality: 'auto',
  currentTime: 0,
  duration: 0,
  audioRef: { current: null },
  play: () => {},
  pause: () => {},
  resume: () => {},
  next: () => {},
  prev: () => {},
  setPlaylist: () => {},
  setMvQuality: () => {},
  onMvEnd: () => {},
  onMvError: () => {},
})

export function usePlayer() {
  return useContext(PlayerContext)
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playlist, setPlaylist] = useState<PlayerTrack[]>([])
  const [isMvActive, setIsMvActive] = useState(false)
  const [mvQuality, setMvQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('auto')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevTrackIdRef = useRef<string | null>(null)

  // Lazy-init audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }
    const audio = audioRef.current

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMeta = () => setDuration(audio.duration)
    const onEnded = () => next()

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMeta)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMeta)
      audio.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync src when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (currentTrack.id === prevTrackIdRef.current) return
    prevTrackIdRef.current = currentTrack.id

    audio.src = currentTrack.audio_url
    audio.load()
    if (isPlaying) {
      audio.play().catch(() => {})
    }
  }, [currentTrack?.id])

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

  // Mute during MV
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMvActive
    }
  }, [isMvActive])

  const play = useCallback((track: PlayerTrack, newPlaylist?: PlayerTrack[]) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    if (newPlaylist) setPlaylist(newPlaylist)
    else if (!playlist.some((t) => t.id === track.id)) {
      setPlaylist([track])
    }
    if (track.mv_urls && (track.mv_urls.low || track.mv_urls.medium || track.mv_urls.high)) {
      setIsMvActive(true)
    } else {
      setIsMvActive(false)
    }
  }, [playlist])

  const pause = useCallback(() => setIsPlaying(false), [])
  const resume = useCallback(() => setIsPlaying(true), [])

  const next = useCallback(() => {
    if (!currentTrack) return
    setIsMvActive(false)
    const idx = playlist.findIndex((t) => t.id === currentTrack.id)
    if (idx < 0 || idx >= playlist.length - 1) {
      setIsPlaying(false)
      return
    }
    const nextTrack = playlist[idx + 1]
    setCurrentTrack(nextTrack)
    setIsPlaying(true)
    prevTrackIdRef.current = nextTrack.id
    if (nextTrack.mv_urls && (nextTrack.mv_urls.low || nextTrack.mv_urls.medium || nextTrack.mv_urls.high)) {
      setIsMvActive(true)
    }
  }, [currentTrack, playlist])

  const prev = useCallback(() => {
    if (!currentTrack) return
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    setIsMvActive(false)
    const idx = playlist.findIndex((t) => t.id === currentTrack.id)
    if (idx <= 0) {
      if (audio) audio.currentTime = 0
      return
    }
    const prevTrack = playlist[idx - 1]
    setCurrentTrack(prevTrack)
    setIsPlaying(true)
    prevTrackIdRef.current = prevTrack.id
    if (prevTrack.mv_urls && (prevTrack.mv_urls.low || prevTrack.mv_urls.medium || prevTrack.mv_urls.high)) {
      setIsMvActive(true)
    }
  }, [currentTrack, playlist])

  const onMvEnd = useCallback(() => {
    setIsMvActive(false)
  }, [])

  const onMvError = useCallback(() => {
    setIsMvActive(false)
  }, [])

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playlist,
        isMvActive,
        mvQuality,
        currentTime,
        duration,
        audioRef,
        play,
        pause,
        resume,
        next,
        prev,
        setPlaylist,
        setMvQuality,
        onMvEnd,
        onMvError,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}
