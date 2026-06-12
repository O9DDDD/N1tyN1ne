import { createClient } from '@/lib/supabase/server'
import { MusicTabs } from './music-tabs'

export const dynamic = 'force-dynamic'

export default async function MusicPage() {
  const supabase = await createClient()

  const { data: tracks } = await supabase
    .from('music')
    .select('*')
    .order('created_at', { ascending: false })

  const trackList = tracks ?? []

  return (
    <div className="music-page">
      <MusicTabs tracks={trackList} />
    </div>
  )
}
