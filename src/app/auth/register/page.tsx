'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? '注册失败')
      setLoading(false)
      return
    }

    const userId = signUpData.user.id

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('注册成功但自动登录失败，请手动登录')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: userId, username, role: 'user' } as any)

    if (profileError) {
      setError('个人资料创建失败: ' + profileError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="auth-box">
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 20 }}>
          注册
        </h2>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '.78rem', marginBottom: 8 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="用户名"
          />
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
            minLength={6}
            placeholder="密码（至少6位）"
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 14, fontSize: '.82rem', color: 'var(--text-dim)' }}>
          已有账号？{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            登录
          </Link>
        </p>
      </div>
    </div>
  )
}
