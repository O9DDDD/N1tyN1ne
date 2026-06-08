/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('music')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const body = await request.json()
  const adminDb = createAdminClient()

  const { data, error } = await adminDb
    .from('music')
    .insert({
      title: body.title,
      artist: body.artist ?? null,
      album: body.album ?? null,
      genre: body.genre ?? null,
      track_number: body.track_number ?? null,
      duration: body.duration ?? null,
      audio_url: body.audio_url,
      cover_url: body.cover_url ?? null,
      lyrics: body.lyrics ?? null,
      mv_urls: body.mv_urls ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
