/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const MAX_SIZE: Record<string, number> = {
  music: 50 * 1024 * 1024,
  covers: 5 * 1024 * 1024,
}

// 宽松的 MIME + 扩展名双重校验
const ALLOWED_EXTS: Record<string, string[]> = {
  music: ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.opus'],
  covers: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.svg'],
}

function getExt(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i >= 0 ? filename.slice(i).toLowerCase() : ''
}

function detectBucket(filename: string, mimeType: string): string | null {
  // 优先用扩展名判断
  const ext = getExt(filename)
  for (const [bucket, exts] of Object.entries(ALLOWED_EXTS)) {
    if (exts.includes(ext)) return bucket
  }
  // 回退到 MIME 类型判断
  if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'music'
  if (mimeType.startsWith('image/')) return 'covers'
  return null
}

const S3_ENDPOINT = process.env.RAINYUN_S3_ENDPOINT!
const S3_BUCKET = process.env.RAINYUN_S3_BUCKET!
const S3_ACCESS_KEY = process.env.RAINYUN_S3_ACCESS_KEY!
const S3_SECRET_KEY = process.env.RAINYUN_S3_SECRET_KEY!

function buildPublicUrl(key: string): string {
  const base = S3_ENDPOINT.replace(/\/+$/, '')
  return `${base}/${S3_BUCKET}/${key}`
}

const s3 = new S3Client({
  region: 'rainyun',
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
  const clientBucket = (formData.get('bucket') as string) || undefined

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // 用扩展名 + MIME 综合判断文件类型
  const detectedBucket = clientBucket && Object.keys(MAX_SIZE).includes(clientBucket)
    ? clientBucket
    : detectBucket(file.name, file.type)

  if (!detectedBucket) {
    return NextResponse.json({
      error: `无法识别文件类型: ${file.name} (${file.type || '未知类型'})`,
    }, { status: 400 })
  }

  if (file.size > MAX_SIZE[detectedBucket]) {
    return NextResponse.json({
      error: `文件过大，最大 ${MAX_SIZE[detectedBucket] / 1024 / 1024}MB`,
    }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const key = `${detectedBucket}/${Date.now()}_${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
    ContentLength: buffer.length,
  })

  try {
    await s3.send(command)
  } catch (err: any) {
    console.error('S3 upload error:', err)
    return NextResponse.json({ error: `S3 上传失败: ${err.message || err}` }, { status: 500 })
  }

  const publicUrl = buildPublicUrl(key)

  return NextResponse.json({ url: publicUrl, path: key })
}
