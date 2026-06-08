/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_SIZE: Record<string, number> = {
  music: 50 * 1024 * 1024, // 50MB
  covers: 5 * 1024 * 1024, // 5MB
}

const ALLOWED_TYPES: Record<string, string[]> = {
  music: ['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'],
  covers: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
}

export async function POST(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string) || 'music'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // 校验 bucket
  if (!Object.keys(MAX_SIZE).includes(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }

  // 校验大小
  if (file.size > MAX_SIZE[bucket]) {
    return NextResponse.json(
      { error: `File too large, max ${MAX_SIZE[bucket] / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  // 校验类型
  if (!ALLOWED_TYPES[bucket].includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // 安全文件名
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${Date.now()}_${safeName}`

  const adminDb = createAdminClient()
  const { data, error } = await adminDb.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const {
    data: { publicUrl },
  } = adminDb.storage.from(bucket).getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl, path: data.path })
}
