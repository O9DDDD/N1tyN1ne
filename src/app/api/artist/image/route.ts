import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache: artist name → image URL
const cache = new Map<string, { url: string | null; ts: number }>()
const TTL = 24 * 60 * 60 * 1000 // 24 hours

async function searchArtist(name: string): Promise<string | null> {
  // Try public NetEase proxy APIs
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
    } catch {
      continue
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'Missing name param' }, { status: 400 })
  }

  // Check cache
  const cached = cache.get(name)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ url: cached.url })
  }

  const url = await searchArtist(name)
  cache.set(name, { url, ts: Date.now() })

  return NextResponse.json({ url })
}
