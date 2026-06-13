import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const CACHE_FILE = join('/tmp', 'artist-images.json')
const TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

let cache: Map<string, { url: string; ts: number }> | null = null

function loadCache(): Map<string, { url: string; ts: number }> {
  if (cache) return cache
  try {
    if (existsSync(CACHE_FILE)) {
      cache = new Map(JSON.parse(readFileSync(CACHE_FILE, 'utf-8')))
      return cache
    }
  } catch { /* corrupt, start fresh */ }
  cache = new Map()
  return cache
}

function saveCache() {
  try {
    if (!existsSync('/tmp')) mkdirSync('/tmp', { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify([...cache!.entries()]))
  } catch { /* ignore */ }
}

async function searchArtist(name: string): Promise<string | null> {
  const proxies = [
    `https://autumnfish.cn/search?keywords=${encodeURIComponent(name)}&type=100&limit=1`,
    `https://music.163.com/api/search/get?s=${encodeURIComponent(name)}&type=100&limit=1`,
  ]

  for (const url of proxies) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const data = await res.json()
      const artists = data?.result?.artists
      if (artists && artists.length > 0 && artists[0].picUrl) {
        return artists[0].picUrl
      }
    } catch { continue }
  }
  return null
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('name')
  if (!raw) {
    return NextResponse.json({ error: 'Missing name param' }, { status: 400 })
  }

  const names = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const c = loadCache()
  const results: Record<string, string | null> = {}
  const toFetch: string[] = []

  for (const name of names) {
    const cached = c.get(name)
    if (cached && Date.now() - cached.ts < TTL) {
      results[name] = cached.url
    } else {
      toFetch.push(name)
    }
  }

  if (toFetch.length > 0) {
    await Promise.all(
      toFetch.map(async (name) => {
        const url = await searchArtist(name)
        if (url) {
          c.set(name, { url, ts: Date.now() })
          results[name] = url
        } else {
          results[name] = null
          c.set(name, { url: '', ts: Date.now() }) // cache the "not found" state
        }
      })
    )
    saveCache()
  }

  if (names.length === 1) {
    return NextResponse.json({ url: results[names[0]] })
  }

  return NextResponse.json({ results })
}
