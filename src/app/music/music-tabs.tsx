'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Music } from '@/lib/supabase/types'
import { TrackList } from './track-list'
import { usePlayer } from '@/components/music/player-provider'
import { splitArtists } from '@/lib/artist'

type Tab = 'tracks' | 'artists' | 'albums'

function ArtistGrid({ tracks }: { tracks: Music[] }) {
  const { play } = usePlayer()
  const router = useRouter()
  const [artistImgs, setArtistImgs] = useState<Record<string, string | null>>({})

  const artists = useMemo(() => {
    const map = new Map<string, Music[]>()
    for (const t of tracks) {
      const names = splitArtists(t.artist ?? null)
      for (const name of names) {
        if (!map.has(name)) map.set(name, [])
        map.get(name)!.push(t)
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
  }, [tracks])

  useEffect(() => {
    const toFetch = artists.map(a => a[0]).filter(a => !(a in artistImgs))
    if (toFetch.length === 0) return
    let canceled = false
    Promise.all(
      toFetch.map(async (name) => {
        try {
          const res = await fetch(`/api/artist/image?name=${encodeURIComponent(name)}`)
          const j = await res.json()
          return { name, url: j.url || null }
        } catch { return { name, url: null } }
      })
    ).then((results) => {
      if (canceled) return
      setArtistImgs((prev) => {
        const next = { ...prev }
        for (const r of results) next[r.name] = r.url
        return next
      })
    })
    return () => { canceled = true }
  }, [artists.map(a => a[0]).join(',')])

  function handleArtistClick(name: string, artistTracks: Music[]) {
    if (artistTracks.length === 0) return
    const mapped = artistTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      album_artist: t.album_artist,
      album_year: t.album_year,
      album_description: t.album_description,
      genre: t.genre,
      audio_url: t.audio_url,
      cover_url: t.cover_url,
      duration: t.duration,
      lyrics: t.lyrics,
    }))
    play(mapped[0], mapped)
    router.push('/songs')
  }

  const count = artists.length

  return (
    <div className="library-section">
      <p className="library-section-title">艺术家 · {count}</p>
      <div className="artist-grid">
        {artists.map(([name, artistTracks]) => (
          <button
            key={name}
            className="artist-card"
            onClick={() => handleArtistClick(name, artistTracks)}
          >
            {artistImgs[name] ? (
              <img className="artist-card-img" src={artistImgs[name]!} alt={name} />
            ) : (
              <div className="artist-card-img artist-card-placeholder">{name.charAt(0)}</div>
            )}
            <span className="artist-card-name">{name}</span>
            <span className="artist-card-count">{artistTracks.length} 首</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function AlbumGrid({ tracks }: { tracks: Music[] }) {
  const { play } = usePlayer()
  const router = useRouter()

  const albums = useMemo(() => {
    const map = new Map<string, Music>()
    for (const t of tracks) {
      const key = t.album || '未知专辑'
      if (!map.has(key)) map.set(key, t)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh'))
  }, [tracks])

  function handleAlbumClick(albumName: string, albumTrack: Music) {
    const albumTracks = tracks.filter((t) => (t.album || '未知专辑') === albumName)
    const mapped = albumTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      album_artist: t.album_artist,
      album_year: t.album_year,
      album_description: t.album_description,
      genre: t.genre,
      audio_url: t.audio_url,
      cover_url: t.cover_url,
      duration: t.duration,
      lyrics: t.lyrics,
    }))
    play(mapped[0], mapped)
    router.push('/songs')
  }

  const count = albums.length

  return (
    <div className="library-section">
      <p className="library-section-title">专辑 · {count}</p>
      <div className="album-grid">
        {albums.map(([name, track]) => (
          <button
            key={name}
            className="album-card"
            onClick={() => handleAlbumClick(name, track)}
          >
            {track.cover_url ? (
              <img className="album-card-cover" src={track.cover_url} alt={name} />
            ) : (
              <div className="album-card-cover album-card-placeholder">💿</div>
            )}
            <span className="album-card-name">{name}</span>
            {track.album_artist && (
              <span className="album-card-artist">{track.album_artist}</span>
            )}
            {track.album_year && (
              <span className="album-card-year">{track.album_year}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'tracks', label: '全部音乐' },
  { key: 'artists', label: '艺术家' },
  { key: 'albums', label: '专辑' },
]

export function MusicTabs({ tracks }: { tracks: Music[] }) {
  const [tab, setTab] = useState<Tab>('tracks')

  return (
    <div className="music-tabs">
      <div className="music-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`music-tab-btn${tab === t.key ? ' music-tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="music-tab-content">
        {tab === 'tracks' && <TrackList tracks={tracks} />}
        {tab === 'artists' && <ArtistGrid tracks={tracks} />}
        {tab === 'albums' && <AlbumGrid tracks={tracks} />}
      </div>
    </div>
  )
}
