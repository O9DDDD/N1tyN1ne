'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function NavProgress() {
  const pathname = usePathname()
  const barRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    // Reset
    clearTimeout(timerRef.current)
    bar.style.transition = 'none'
    bar.style.width = '0%'
    bar.style.opacity = '1'

    // Start growing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.transition = 'width 3s cubic-bezier(0.1, 0.05, 0, 1)'
        bar.style.width = '66%'
      })
    })

    // Finish
    let t2: ReturnType<typeof setTimeout>
    let t3: ReturnType<typeof setTimeout>
    timerRef.current = setTimeout(() => {
      bar.style.transition = 'width .35s ease-in'
      bar.style.width = '100%'
      t2 = setTimeout(() => {
        bar.style.transition = 'opacity .25s ease'
        bar.style.opacity = '0'
        t3 = setTimeout(() => {
          bar.style.transition = 'none'
          bar.style.width = '0%'
          bar.style.opacity = '1'
        }, 250)
      }, 350)
    }, 600)

    return () => {
      clearTimeout(timerRef.current)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [pathname])

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '2px',
        width: '0%',
        opacity: 1,
        background: 'var(--grn)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  )
}
