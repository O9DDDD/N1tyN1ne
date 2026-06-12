import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('music')
    .select('id,title')
    .order('created_at', { ascending: false })

  const sample = (data ?? []).slice(0, 3)
  return NextResponse.json({ count: data?.length ?? 0, sample })
}
