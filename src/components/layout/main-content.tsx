'use client'

import { usePathname } from 'next/navigation'

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullscreen = pathname === '/songs'

  return (
    <main className={isFullscreen ? 'main-fullscreen' : 'flex-1'}>
      {children}
    </main>
  )
}
