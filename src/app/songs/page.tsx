import { createClient } from '@/lib/supabase/server'
import { TrackList } from '@/app/music/track-list'
import { MusicHero } from '@/components/music/music-hero'

export const dynamic = 'force-dynamic'

export default async function SongsPage() {
  const supabase = await createClient()

  const { data: tracks } = await supabase
    .from('music')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="music-page">
      <MusicHero />
      <TrackList tracks={tracks ?? []} />
    </div>
  )
}
