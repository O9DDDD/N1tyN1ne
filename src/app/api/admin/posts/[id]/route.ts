/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const body = await request.json()
  const adminDb = createAdminClient()

  const { data, error } = await adminDb
    .from('posts')
    .update({
      title: body.title,
      content: body.content,
      excerpt: body.excerpt,
      tags: body.tags,
      published: body.published,
      pinned: body.pinned,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const { id } = await params
  const adminDb = createAdminClient()

  const { error } = await adminDb.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
