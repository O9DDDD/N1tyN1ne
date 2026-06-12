'use client'

export default function SongsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="music-page music-page-fullscreen" style={{ padding: 40, textAlign: 'center' }}>
      <h2 style={{ color: 'var(--text-bright)' }}>播放页面加载失败</h2>
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
        }}
      >
        重试
      </button>
    </div>
  )
}
