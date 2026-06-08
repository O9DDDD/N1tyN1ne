/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('posts')
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
    .from('posts')
    .insert({
      title: body.title,
      content: body.content,
      excerpt: body.excerpt ?? null,
      tags: body.tags ?? null,
      published: body.published ?? true,
      pinned: body.pinned ?? false,
      author_id: user.id, // 服务端注入，不信任请求体
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
