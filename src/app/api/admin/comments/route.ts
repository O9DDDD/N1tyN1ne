/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('comments')
    .select('*, profiles!comments_user_id_fkey(username)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const adminDb = createAdminClient()
  const { error } = await adminDb.from('comments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
