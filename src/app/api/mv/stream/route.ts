import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/rainyun/s3'
import type { MvUrls } from '@/lib/supabase/types'

const QUALITIES = ['low', 'medium', 'high'] as const

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get('trackId')
  const quality = request.nextUrl.searchParams.get('quality') || 'high'

  if (!trackId) {
    return NextResponse.json({ error: 'trackId required' }, { status: 400, headers: { 'Cache-Control': 'no-cache' } })
  }

  const supabase = await createClient()
  const { data: track, error } = await supabase
    .from('music')
    .select('mv_urls')
    .eq('id', trackId)
    .single()

  if (error || !track?.mv_urls) {
    return NextResponse.json({ error: 'No MV for this track' }, { status: 404, headers: { 'Cache-Control': 'no-cache' } })
  }

  const mv_urls = track.mv_urls as MvUrls
  let rawUrl = mv_urls[quality as keyof MvUrls]
  if (!rawUrl) {
    for (const q of QUALITIES) {
      if (mv_urls[q]) { rawUrl = mv_urls[q]; break }
    }
  }
  if (!rawUrl) {
    return NextResponse.json({ error: 'No MV URL' }, { status: 404, headers: { 'Cache-Control': 'no-cache' } })
  }

  const key = rawUrl.replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '')
  const url = await getSignedUrl(key)

  if (!url) {
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500, headers: { 'Cache-Control': 'no-cache' } })
  }

  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-cache' } })
}
