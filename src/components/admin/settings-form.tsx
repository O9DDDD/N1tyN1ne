'use client'

import { useState } from 'react'

interface SettingsData {
  hero_title?: string | null
  hero_desc?: string | null
  about_intro?: string | null
  about_title2?: string | null
  about_desc2?: string | null
  about_title3?: string | null
  about_desc3?: string | null
}

const DEFAULTS: SettingsData = {
  hero_title: 'N1tyN1ne',
  hero_desc: '记录、思考、分享。',
  about_intro: '',
  about_title2: '音乐',
  about_desc2: '',
  about_title3: '写作',
  about_desc3: '',
}

export function SettingsForm({ settings }: { settings: SettingsData | null }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)

    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hero_title: form.get('hero_title'),
        hero_desc: form.get('hero_desc'),
        about_intro: form.get('about_intro'),
        about_title2: form.get('about_title2'),
        about_desc2: form.get('about_desc2'),
        about_title3: form.get('about_title3'),
        about_desc3: form.get('about_desc3'),
      }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const s = { ...DEFAULTS, ...settings }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <div className="form-group">
        <label>Hero 标题</label>
        <input name="hero_title" defaultValue={s.hero_title ?? ''} />
      </div>
      <div className="form-group">
        <label>Hero 简介</label>
        <input name="hero_desc" defaultValue={s.hero_desc ?? ''} />
      </div>
      <div className="form-group">
        <label>关于 — 个人介绍</label>
        <textarea name="about_intro" defaultValue={s.about_intro ?? ''} style={{ minHeight: 60 }} />
      </div>
      <div className="form-group">
        <label>关于 — 卡片 2 标题</label>
        <input name="about_title2" defaultValue={s.about_title2 ?? ''} />
      </div>
      <div className="form-group">
        <label>关于 — 卡片 2 描述</label>
        <textarea name="about_desc2" defaultValue={s.about_desc2 ?? ''} style={{ minHeight: 60 }} />
      </div>
      <div className="form-group">
        <label>关于 — 卡片 3 标题</label>
        <input name="about_title3" defaultValue={s.about_title3 ?? ''} />
      </div>
      <div className="form-group">
        <label>关于 — 卡片 3 描述</label>
        <textarea name="about_desc3" defaultValue={s.about_desc3 ?? ''} style={{ minHeight: 60 }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{ background: 'var(--grn-dark)', color: '#fff' }}
        >
          {saving ? '保存中...' : saved ? '已保存 ✓' : '保存'}
        </button>
        <button type="button" className="btn btn-sm btn-ghost">
          恢复默认
        </button>
      </div>
    </form>
  )
}
