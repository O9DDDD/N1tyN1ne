/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const { album, cover_url } = await request.json()

  if (!album || !cover_url) {
    return NextResponse.json({ error: 'Missing album or cover_url' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('music')
    .update({ cover_url })
    .eq('album', album)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
