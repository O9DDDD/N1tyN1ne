import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const ENDPOINT = process.env.RAINYUN_S3_ENDPOINT!
const BUCKET = process.env.RAINYUN_S3_BUCKET!
const ACCESS_KEY = process.env.RAINYUN_S3_ACCESS_KEY!
const SECRET_KEY = process.env.RAINYUN_S3_SECRET_KEY!

const s3Client = new S3Client({
  region: 'cn-sy1',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true,
})

export async function getObject(key: string): Promise<ReadableStream | null> {
  try {
    const res = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }))
    return res.Body?.transformToWebStream() ?? null
  } catch {
    return null
  }
}

export function extractKey(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname.replace(/^\//, '')
  } catch {
    return url
  }
}
