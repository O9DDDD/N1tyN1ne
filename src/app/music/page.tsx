import { createClient } from '@/lib/supabase/server'

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

      <div className="space-y-3">
        {tracks?.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-4 rounded border border-neutral-800 bg-neutral-900 p-4"
          >
            {track.cover_url ? (
              <img
                src={track.cover_url}
                alt={track.title}
                className="h-12 w-12 rounded object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-neutral-800 text-neutral-600">
                ♪
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{track.title}</p>
              <p className="text-sm text-neutral-400">
                {track.artist ?? '未知艺术家'}
                {track.album && ` · ${track.album}`}
              </p>
            </div>

            {track.audio_url && (
              <audio controls className="h-8 w-48">
                <source src={track.audio_url} />
              </audio>
            )}
          </div>
        ))}

        {(!tracks || tracks.length === 0) && (
          <p className="text-center text-neutral-600">暂无音乐</p>
        )}
      </div>
    </div>
  )
}
