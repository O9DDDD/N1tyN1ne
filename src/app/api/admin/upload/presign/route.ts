/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { S3Client } from '@aws-sdk/client-s3'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const MAX_SIZE: Record<string, number> = {
  music: 50 * 1024 * 1024,
  covers: 5 * 1024 * 1024,
}

const ALLOWED_EXTS: Record<string, string[]> = {
  music: ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus'],
  covers: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.svg'],
}

function getExt(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i >= 0 ? filename.slice(i).toLowerCase() : ''
}

const S3_ENDPOINT = process.env.RAINYUN_S3_ENDPOINT!
const S3_BUCKET = process.env.RAINYUN_S3_BUCKET!
const S3_ACCESS_KEY = process.env.RAINYUN_S3_ACCESS_KEY!
const S3_SECRET_KEY = process.env.RAINYUN_S3_SECRET_KEY!

const s3 = new S3Client({
  region: 'rainyun',
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
})

function buildPublicUrl(key: string): string {
  const base = S3_ENDPOINT.replace(/\/+$/, '')
  return `${base}/${S3_BUCKET}/${key}`
}

export async function GET(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get('name')
  const mimeType = searchParams.get('type') || 'application/octet-stream'
  const clientBucket = searchParams.get('bucket')

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 })
  }

  // Detect bucket
  let bucket = 'music'
  if (clientBucket && Object.keys(MAX_SIZE).includes(clientBucket)) {
    bucket = clientBucket
  } else {
    const ext = getExt(filename)
    for (const [b, exts] of Object.entries(ALLOWED_EXTS)) {
      if (exts.includes(ext)) { bucket = b; break }
    }
  }

  if (!Object.keys(MAX_SIZE).includes(bucket)) {
    return NextResponse.json({ error: `无法识别文件类型: ${filename}` }, { status: 400 })
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `${bucket}/${Date.now()}_${safeName}`

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
  })

  try {
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 })

    const publicUrl = buildPublicUrl(key)

    return NextResponse.json({ uploadUrl, publicUrl, key })
  } catch (err: any) {
    console.error('Presign error:', err)
    return NextResponse.json({ error: `生成上传链接失败: ${err.message}` }, { status: 500 })
  }
}
