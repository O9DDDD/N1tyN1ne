import { createClient } from '@/lib/supabase/server'
import { MusicTabs } from './music-tabs'

export const dynamic = 'force-dynamic'

export default async function MusicPage({
  searchParams,
}: {
  searchParams: Promise<{ album?: string; artist?: string; tab?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: tracks } = await supabase
    .from('music')
    .select('*')
    .order('created_at', { ascending: false })

  const trackList = tracks ?? []

  const validTabs = ['tracks', 'artists', 'albums']
  const initialTab = params.tab && validTabs.includes(params.tab) ? params.tab as 'tracks' | 'artists' | 'albums' : undefined

  return (
    <div className="music-page">
      <MusicTabs
        tracks={trackList}
        filterAlbum={params.album ?? null}
        filterArtist={params.artist ?? null}
        initialTab={initialTab}
        initialArtist={params.artist ?? null}
        initialAlbum={params.album ?? null}
      />
    </div>
  )
}
