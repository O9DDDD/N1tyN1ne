'use client'

import { useEffect } from 'react'

export default function MusicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Music page error:', error.message, error.stack)
  }, [error])

  return (
    <div className="music-page" style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ color: 'var(--text-bright)', marginBottom: 12 }}>音乐页面加载失败</h2>
      <pre style={{
        color: 'var(--text-dim)',
        background: 'var(--bg-card)',
        padding: 16,
        borderRadius: 8,
        margin: '16px auto',
        fontSize: '.8rem',
        textAlign: 'left',
        maxWidth: 500,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {error.message}
      </pre>
      <button
        onClick={reset}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          padding: '8px 24px',
          borderRadius: 6,
          cursor: 'pointer',
          marginRight: 12,
        }}
      >
        重试
      </button>
      <button
        onClick={() => window.location.href = '/music'}
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-bright)',
          border: '1px solid var(--border)',
          padding: '8px 24px',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        强制刷新
      </button>
    </div>
  )
}
