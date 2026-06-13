/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const MAX_SIZE: Record<string, number> = {
  music: 50 * 1024 * 1024, // 50MB
  covers: 5 * 1024 * 1024,  // 5MB
}

const ALLOWED_TYPES: Record<string, string[]> = {
  music: ['audio/mpeg', 'audio/flac', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'],
  covers: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
}

const S3_ENDPOINT = process.env.RAINYUN_S3_ENDPOINT!
const S3_BUCKET = process.env.RAINYUN_S3_BUCKET!
const S3_ACCESS_KEY = process.env.RAINYUN_S3_ACCESS_KEY!
const S3_SECRET_KEY = process.env.RAINYUN_S3_SECRET_KEY!

const s3 = new S3Client({
  region: 'cn-sy1',
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

export async function POST(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string) || 'music'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!Object.keys(MAX_SIZE).includes(bucket)) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }

  if (file.size > MAX_SIZE[bucket]) {
    return NextResponse.json(
      { error: `File too large, max ${MAX_SIZE[bucket] / 1024 / 1024}MB` },
      { status: 400 }
    )
  }

  if (!ALLOWED_TYPES[bucket].includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `${bucket}/${Date.now()}_${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    ContentLength: buffer.length,
  })

  try {
    await s3.send(command)
  } catch (err: any) {
    console.error('S3 upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }

  const publicUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${key}`

  return NextResponse.json({ url: publicUrl, path: key })
}
