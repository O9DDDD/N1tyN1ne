import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { basename } from 'path'

const client = new S3Client({
  region: 'cn-sy1',
  endpoint: 'https://cn-sy1.rains3.com',
  credentials: {
    accessKeyId: 'tUiMmxfkOg3D3KZO',
    secretAccessKey: 'qeAS39z3nwKTdTLCzp1gaSjNlw0Ufi',
  },
  forcePathStyle: true,
})

const MV_DIR = 'E:/Desktop/mv'
const files = process.argv.slice(2)

async function upload(filePath) {
  const key = 'mv/' + basename(filePath)
  const body = readFileSync(filePath)
  console.log(`Uploading ${basename(filePath)} (${(body.length / 1024 / 1024).toFixed(1)}MB) → ${key}`)
  try {
    await client.send(new PutObjectCommand({
      Bucket: '321',
      Key: key,
      Body: body,
    }))
    console.log(`  ✓ Done`)
  } catch (e) {
    console.log(`  ✗ ${e.message}`)
  }
}

for (const f of files) {
  await upload(f)
}
