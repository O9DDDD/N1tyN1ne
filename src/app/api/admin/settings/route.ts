/* eslint-disable no-restricted-imports */
import { NextRequest, NextResponse } from 'next/server'
import { guardAdmin } from '@/lib/auth/api-guard'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const adminDb = createAdminClient()
  const { data, error } = await adminDb
    .from('site_settings')
    .select('*')
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? {})
}

export async function PATCH(request: NextRequest) {
  const user = await guardAdmin()
  if (user instanceof NextResponse) return user

  const body = await request.json()
  const adminDb = createAdminClient()

  // Upsert: 只维护 id=1 的一条记录
  const { data, error } = await adminDb
    .from('site_settings')
    .upsert({
      id: 1,
      hero_title: body.hero_title,
      hero_desc: body.hero_desc,
      about_intro: body.about_intro,
      about_title2: body.about_title2,
      about_desc2: body.about_desc2,
      about_title3: body.about_title3,
      about_desc3: body.about_desc3,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
