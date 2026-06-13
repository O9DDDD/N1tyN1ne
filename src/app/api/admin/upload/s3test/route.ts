/* eslint-disable no-restricted-imports */
import { NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const S3_ENDPOINT = process.env.RAINYUN_S3_ENDPOINT!
const S3_BUCKET = process.env.RAINYUN_S3_BUCKET!
const S3_ACCESS_KEY = process.env.RAINYUN_S3_ACCESS_KEY!
const S3_SECRET_KEY = process.env.RAINYUN_S3_SECRET_KEY!

export async function GET() {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const s3 = new S3Client({
    region: 'rainyun',
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    forcePathStyle: true,
  })

  const results: Record<string, any> = {}

  // Test 1: List buckets
  try {
    const listRes = await s3.send(new ListBucketsCommand({}))
    results.listBuckets = { ok: true, buckets: listRes.Buckets?.map(b => b.Name) }
  } catch (err: any) {
    results.listBuckets = { ok: false, error: err.message }
  }

  // Test 2: Put a tiny test file via server
  try {
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: '_s3test/test.txt',
      Body: 'hello rains3',
      ContentType: 'text/plain',
    }))
    results.putTest = { ok: true, url: `${S3_ENDPOINT.replace(/\/+$/, '')}/${S3_BUCKET}/_s3test/test.txt` }
  } catch (err: any) {
    results.putTest = { ok: false, error: err.message }
  }

  // Test 3: Generate a presigned URL and show its format
  try {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: '_s3test/presign-test.bin',
    })
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 })
    results.presignTest = {
      ok: true,
      url_prefix: presignedUrl.substring(0, 120),
      is_path_style: presignedUrl.includes(`${S3_ENDPOINT.replace(/\/+$/, '')}/${S3_BUCKET}`),
    }
  } catch (err: any) {
    results.presignTest = { ok: false, error: err.message }
  }

  return NextResponse.json(results)
}
