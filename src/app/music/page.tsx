import { createClient } from '@/lib/supabase/server'
import { TrackList } from './track-list'

export const revalidate = 300

export default async function MusicPage() {
  const supabase = await createClient()

  const { data: tracks } = await supabase
    .from('music')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">音乐</h1>
      <TrackList tracks={tracks ?? []} />
    </div>
  )
}
