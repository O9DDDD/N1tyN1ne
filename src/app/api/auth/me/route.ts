import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 客户端获取当前用户身份（不暴露 role 字符串）
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ isAuthenticated: false })
  }

  const role = user.app_metadata?.role as string | undefined

  return NextResponse.json({
    isAuthenticated: true,
    isAdmin: role === 'admin',
    userId: user.id,
    username:
      user.user_metadata?.username ??
      user.email?.split('@')[0] ??
      'unknown',
  })
}
