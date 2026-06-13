/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const body = await request.json()
  const { album, album_description } = body as { album: string; album_description: string | null }

  if (!album) {
    return NextResponse.json({ error: 'Missing album name' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  const { error } = await adminDb
    .from('music')
    .update({ album_description: album_description ?? null })
    .eq('album', album)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated_album: album })
}
