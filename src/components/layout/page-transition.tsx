'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Trigger a ripple zoom animation on the clicked element, then navigate.
 * Call from onClick handlers that need a transition.
 */
export function useNavigateWithTransition() {
  const router = useRouter()

  return useCallback((url: string, e?: React.MouseEvent<HTMLElement>) => {
    // Add ripple class to clicked element
    const el = e?.currentTarget as HTMLElement | null
    if (el) {
      el.classList.add('ptr-clicked')
      setTimeout(() => el.classList.remove('ptr-clicked'), 400)
    }
    // Small delay for animation, then navigate
    setTimeout(() => router.push(url), 120)
  }, [router])
}
