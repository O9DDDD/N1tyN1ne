import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getObject } from '@/lib/rainyun/s3'
import type { MvUrls } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get('trackId')
  const quality = request.nextUrl.searchParams.get('quality') || 'high'

  if (!trackId) {
    return NextResponse.json({ error: 'trackId required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: track, error } = await supabase
    .from('music')
    .select('mv_urls')
    .eq('id', trackId)
    .single()

  if (error || !track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  const mv_urls = track.mv_urls as MvUrls | null
  if (!mv_urls) {
    return NextResponse.json({ error: 'No MV' }, { status: 404 })
  }

  const qualities = ['low', 'medium', 'high'] as const
  let rawUrl = mv_urls[quality as keyof MvUrls]

  // 回退到其他画质
  if (!rawUrl) {
    for (const q of qualities) {
      if (mv_urls[q]) { rawUrl = mv_urls[q]; break }
    }
  }

  if (!rawUrl) {
    return NextResponse.json({ error: 'No MV URL' }, { status: 404 })
  }

  const key = rawUrl.replace(/^https?:\/\/[^\/]+\//, '').replace(/^\//, '')
  const stream = await getObject(key)

  if (!stream) {
    return NextResponse.json({ error: 'MV not found' }, { status: 404 })
  }

  const ext = rawUrl.split('.').pop()?.toLowerCase()
  const contentType = ext === 'mp4' ? 'video/mp4' : 'video/webm'

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
