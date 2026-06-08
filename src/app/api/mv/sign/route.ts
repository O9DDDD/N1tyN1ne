import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signUrl, extractKey } from '@/lib/rainyun/s3'
import type { MvUrls } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const { trackId } = await request.json() as { trackId?: string }
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
    return NextResponse.json({ error: 'No MV for this track' }, { status: 404 })
  }

  const signed: Record<string, string> = {}

  for (const q of ['low', 'medium', 'high'] as const) {
    const raw = mv_urls[q]
    if (raw) {
      signed[q] = await signUrl(extractKey(raw))
    }
  }

  if (Object.keys(signed).length === 0) {
    return NextResponse.json({ error: 'No MV URLs configured' }, { status: 404 })
  }

  return NextResponse.json({ urls: signed })
}
