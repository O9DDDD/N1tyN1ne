'use client'

import { useState } from 'react'
import type { Music, MvUrls } from '@/lib/supabase/types'

interface MvState {
  low: string
  medium: string
  high: string
  saving: boolean
  editing: boolean
}

function initStates(tracks: Music[]): Record<string, MvState> {
  const map: Record<string, MvState> = {}
  for (const t of tracks) {
    const mv = t.mv_urls as MvUrls | null
    map[t.id] = {
      low: mv?.low ?? '',
      medium: mv?.medium ?? '',
      high: mv?.high ?? '',
      saving: false,
      editing: false,
    }
  }
  return map
}

function hasAnyMv(st: MvState): boolean {
  return !!(st.low.trim() || st.medium.trim() || st.high.trim())
}

export function MvBinder({ tracks }: { tracks: Music[] }) {
  const [mvStates, setMvStates] = useState<Record<string, MvState>>(() => initStates(tracks))
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' } | null>(null)

  function toggleEdit(trackId: string) {
    setMvStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], editing: !prev[trackId].editing },
    }))
  }

  function updateField(trackId: string, field: 'low' | 'medium' | 'high', value: string) {
    setMvStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], [field]: value },
    }))
  }

  async function handleSave(trackId: string) {
    const st = mvStates[trackId]
    setMvStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], saving: true },
    }))

    const mv_urls: Record<string, string> = {}
    if (st.low.trim()) mv_urls.low = st.low.trim()
    if (st.medium.trim()) mv_urls.medium = st.medium.trim()
    if (st.high.trim()) mv_urls.high = st.high.trim()

    const res = await fetch(`/api/admin/music/${trackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mv_urls: Object.keys(mv_urls).length > 0 ? mv_urls : null,
      }),
    })

    setMvStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], saving: false, editing: false },
    }))

    if (res.ok) {
      setMessage({ text: '保存成功', type: 'info' })
      setTimeout(() => setMessage(null), 2000)
    } else {
      setMessage({ text: '保存失败', type: 'error' })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const track = (id: string) => tracks.find((t) => t.id === id)

  return (
    <div>
      {message && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            background: message.type === 'error' ? '#fef2f2' : 'var(--accent-glow)',
            color: message.type === 'error' ? '#dc2626' : 'var(--accent-dark)',
            fontSize: '.82rem',
            fontWeight: 500,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Desktop table */}
      <div className="table-wrap mv-binder-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>歌曲</th>
              <th>艺术家</th>
              <th>MV Low (360p)</th>
              <th>MV Medium (720p)</th>
              <th>MV High (1080p)</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => {
              const st = mvStates[t.id]
              if (!st) return null
              const hasMv = hasAnyMv(st)
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.title}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{t.artist ?? '—'}</td>
                  {st.editing ? (
                    <>
                      <td>
                        <input
                          type="url"
                          value={st.low}
                          onChange={(e) => updateField(t.id, 'low', e.target.value)}
                          placeholder="https://321.cn-sy1.rains3.com/mv/..."
                          style={{
                            width: '100%',
                            minWidth: 140,
                            padding: '8px 10px',
                            border: '1.5px solid var(--border)',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '.78rem',
                            fontFamily: 'inherit',
                            minHeight: 44,
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="url"
                          value={st.medium}
                          onChange={(e) => updateField(t.id, 'medium', e.target.value)}
                          placeholder="https://321.cn-sy1.rains3.com/mv/..."
                          style={{
                            width: '100%',
                            minWidth: 140,
                            padding: '8px 10px',
                            border: '1.5px solid var(--border)',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '.78rem',
                            fontFamily: 'inherit',
                            minHeight: 44,
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="url"
                          value={st.high}
                          onChange={(e) => updateField(t.id, 'high', e.target.value)}
                          placeholder="https://321.cn-sy1.rains3.com/mv/..."
                          style={{
                            width: '100%',
                            minWidth: 140,
                            padding: '8px 10px',
                            border: '1.5px solid var(--border)',
                            borderRadius: 'var(--radius-xs)',
                            background: 'var(--bg)',
                            color: 'var(--text)',
                            fontSize: '.78rem',
                            fontFamily: 'inherit',
                            minHeight: 44,
                          }}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontSize: '.76rem', color: 'var(--text-dim)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {st.low || '—'}
                      </td>
                      <td style={{ fontSize: '.76rem', color: 'var(--text-dim)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {st.medium || '—'}
                      </td>
                      <td style={{ fontSize: '.76rem', color: 'var(--text-dim)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {st.high || '—'}
                      </td>
                    </>
                  )}
                  <td>
                    {hasMv ? (
                      <span style={{ color: 'var(--grn)', fontSize: '.78rem', fontWeight: 600 }}>✓ 已绑定</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '.78rem' }}>未设置</span>
                    )}
                  </td>
                  <td>
                    {st.editing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleSave(t.id)}
                          disabled={st.saving}
                          className="btn btn-sm btn-primary"
                          style={{
                            background: 'var(--grn-dark)',
                            color: '#fff',
                            minHeight: 44,
                            minWidth: 44,
                            padding: '6px 14px',
                            border: 'none',
                            borderRadius: 'var(--radius-xs)',
                            cursor: 'pointer',
                            fontSize: '.78rem',
                            fontWeight: 600,
                          }}
                        >
                          {st.saving ? '...' : '保存'}
                        </button>
                        <button
                          onClick={() => toggleEdit(t.id)}
                          className="btn btn-sm btn-ghost"
                          style={{
                            minHeight: 44,
                            minWidth: 44,
                            padding: '6px 14px',
                            border: 'none',
                            background: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '.78rem',
                          }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleEdit(t.id)}
                        className="btn btn-sm btn-ghost"
                        style={{
                          minHeight: 44,
                          minWidth: 44,
                          padding: '6px 14px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--warm)',
                          cursor: 'pointer',
                          fontSize: '.78rem',
                          fontWeight: 500,
                        }}
                      >
                        编辑
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mv-binder-cards" style={{ display: 'none' }}>
        {tracks.map((t) => {
          const st = mvStates[t.id]
          if (!st) return null
          const hasMv = hasAnyMv(st)
          return (
            <div key={t.id} className="mv-binder-card" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text-bright)' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-dim)' }}>
                    {t.artist ?? '未知艺术家'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {hasMv && (
                    <span style={{ color: 'var(--grn)', fontSize: '.72rem', fontWeight: 600 }}>✓ MV</span>
                  )}
                  {st.editing ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleSave(t.id)}
                        disabled={st.saving}
                        style={{
                          minHeight: 44,
                          minWidth: 44,
                          background: 'var(--grn-dark)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-xs)',
                          cursor: 'pointer',
                          fontSize: '.76rem',
                          padding: '6px 10px',
                        }}
                      >
                        {st.saving ? '...' : '保存'}
                      </button>
                      <button
                        onClick={() => toggleEdit(t.id)}
                        style={{
                          minHeight: 44,
                          minWidth: 44,
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          fontSize: '.76rem',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleEdit(t.id)}
                      style={{
                        minHeight: 44,
                        minWidth: 44,
                        background: 'none',
                        border: 'none',
                        color: 'var(--warm)',
                        cursor: 'pointer',
                        fontSize: '.76rem',
                        fontWeight: 500,
                      }}
                    >
                      编辑
                    </button>
                  )}
                </div>
              </div>

              {st.editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ fontSize: '.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>
                      Low (360p)
                    </label>
                    <input
                      type="url"
                      value={st.low}
                      onChange={(e) => updateField(t.id, 'low', e.target.value)}
                      placeholder="https://321.cn-sy1.rains3.com/mv/..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        minHeight: 44,
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '.82rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>
                      Medium (720p)
                    </label>
                    <input
                      type="url"
                      value={st.medium}
                      onChange={(e) => updateField(t.id, 'medium', e.target.value)}
                      placeholder="https://321.cn-sy1.rains3.com/mv/..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        minHeight: 44,
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '.82rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '.7rem', color: 'var(--text-dim)', display: 'block', marginBottom: 2 }}>
                      High (1080p)
                    </label>
                    <input
                      type="url"
                      value={st.high}
                      onChange={(e) => updateField(t.id, 'high', e.target.value)}
                      placeholder="https://321.cn-sy1.rains3.com/mv/..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        minHeight: 44,
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--bg)',
                        color: 'var(--text)',
                        fontSize: '.82rem',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '.76rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div>360p: {st.low ? `${st.low.slice(0, 50)}...` : '—'}</div>
                  <div>720p: {st.medium ? `${st.medium.slice(0, 50)}...` : '—'}</div>
                  <div>1080p: {st.high ? `${st.high.slice(0, 50)}...` : '—'}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
