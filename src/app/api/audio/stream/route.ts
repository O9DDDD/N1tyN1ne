import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src')
  if (!src) return new NextResponse('Missing src', { status: 400 })

  // Only allow proxying from our S3 bucket
  const allowedHost = process.env.RAINYUN_S3_ENDPOINT?.replace(/^https?:\/\//, '')
  if (!allowedHost) return new NextResponse('Not configured', { status: 500 })

  try {
    const url = new URL(src)
    if (url.hostname !== new URL(`https://${allowedHost}`).hostname) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  const response = await fetch(src)

  if (!response.ok) {
    return new NextResponse('Upstream error', { status: response.status })
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': response.headers.get('Content-Length') || '',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
