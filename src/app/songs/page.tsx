import { MusicHero } from '@/components/music/music-hero'

export const dynamic = 'force-dynamic'

export default async function SongsPage() {
  return (
    <div className="music-page music-page-fullscreen">
      <MusicHero />
    </div>
  )
}
