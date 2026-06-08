'use client'

import { usePlayer } from '@/components/music/player-provider'

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isMvActive } = usePlayer()

  return (
    <main className={`flex-1 mv-content ${isMvActive ? 'mv-slide-out' : 'mv-slide-in'}`}>
      {children}
    </main>
  )
}
