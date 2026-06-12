import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_PATTERNS = ['/admin', '/api/admin']

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATTERNS.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (isAdminPath(pathname)) {
    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // 快速路径：JWT app_metadata 中已有 role（DB Trigger 同步后）
    let role = user.app_metadata?.role as string | undefined

    // 回退：查询 profiles 表（Trigger 部署前兼容）
    if (!role) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      role = (data as { role: string } | null)?.role
    }

    if (role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/?error=forbidden', request.url))
    }
  }

  // ⚠ 重要：非 admin 路径也必须返回 supabaseResponse，
  // 因为 getUser() 可能已刷新了 session cookie（写入在 supabaseResponse 上）。

  // 音乐页强制 CDN 不缓存
  if (pathname === '/music' || pathname === '/songs') {
    supabaseResponse.headers.set('Surrogate-Control', 'no-store, max-age=0')
    supabaseResponse.headers.set('CDN-Cache-Control', 'no-store, max-age=0')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
