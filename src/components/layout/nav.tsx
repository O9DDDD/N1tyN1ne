'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { useTheme } from '@/components/layout/theme-provider'

export function Nav() {
  const { isAuthenticated, isAdmin, username, loading, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <nav>
      <div className="container">
        <Link href="/" className="logo">
          N1tyN1ne
        </Link>

        <div className="nav-right">
          <div className="links">
            <Link href="/">首页</Link>
            <Link href="/music">音乐</Link>
          </div>

          {loading ? (
            <span className="text-dim" style={{ fontSize: '.76rem', fontWeight: 500 }}>
              ...
            </span>
          ) : isAuthenticated ? (
            <span className="user-badge">
              <span className="uname">{username}</span>
              {isAdmin && (
                <Link href="/admin" style={{ fontSize: '.72rem', color: 'var(--grn)' }}>
                  [管理]
                </Link>
              )}
              <button className="logout-btn" onClick={signOut}>
                退出
              </button>
            </span>
          ) : (
            <Link href="/auth/login" className="nav-btn">
              登录
            </Link>
          )}

          <button
            className="theme-toggle"
            onClick={toggle}
            title="切换深色/浅色模式"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </nav>
  )
}
