import { S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

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

/**
 * 为 S3 对象键生成预签名 URL，有效期 10 分钟。
 * @param key 对象键，如 "mv/songid_low.mp4"
 */
export async function signUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn: 600 }) // 10 分钟
}

/**
 * 从完整 S3 URL 中提取对象键。
 * 例: "https://321.cn-sy1.rains3.com/mv/songid.mp4" → "mv/songid.mp4"
 */
export function extractKey(url: string): string {
  try {
    const u = new URL(url)
    return u.pathname.replace(/^\//, '')
  } catch {
    return url
  }
}
