/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const adminDb = createAdminClient()

  // 列出所有 profile（仅 admin 可见）
  const { data, error } = await adminDb
    .from('profiles')
    .select('*')
    .order('username', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: 修改用户角色（仅 admin 可调用）
export async function PATCH(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const body = await request.json()
  const { userId, role } = body

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role required' }, { status: 400 })
  }
  if (!['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const adminDb = createAdminClient()

  // 1. 更新 profiles.role
  const { error: profileError } = await adminDb
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // 2. 同步 app_metadata（Middleware 依赖此项）
  const { error: metaError } = await adminDb.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  })

  if (metaError) {
    return NextResponse.json({ error: metaError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
