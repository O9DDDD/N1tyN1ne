'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="auth-box">
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 20 }}>
        登录
      </h2>

      {error && (
        <p style={{ color: '#dc2626', fontSize: '.78rem', marginBottom: 8 }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="邮箱"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="密码"
        />
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 14, fontSize: '.82rem', color: 'var(--text-dim)' }}>
        还没有账号？{' '}
        <Link href="/auth/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          注册
        </Link>
      </p>
    </div>
  )
}
