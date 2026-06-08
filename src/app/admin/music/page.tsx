/* eslint-disable no-restricted-imports */
import { createAdminClient } from '@/lib/supabase/admin'
import { MusicManager } from '@/components/admin/music-manager'

export const dynamic = 'force-dynamic'

export default async function AdminMusicPage() {
  const adminDb = createAdminClient()
  const { data: tracks } = await adminDb
    .from('music')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">音乐管理</h1>
      </div>
      <MusicManager tracks={tracks ?? []} />
    </div>
  )
}
