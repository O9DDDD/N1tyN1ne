'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthState {
  isAuthenticated: boolean
  isAdmin: boolean
  username: string | null
  userId: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isAdmin: false,
  username: null,
  userId: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'signOut'>>({
    isAuthenticated: false,
    isAdmin: false,
    username: null,
    userId: null,
    loading: true,
  })
  const router = useRouter()

  useEffect(() => {
    // 从服务端端点获取身份（不暴露 role 字符串）
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setState({
          isAuthenticated: data.isAuthenticated,
          isAdmin: data.isAdmin,
          username: data.username ?? null,
          userId: data.isAuthenticated ? 'authenticated' : null,
          loading: false,
        })
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loading: false }))
      })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setState({
      isAuthenticated: false,
      isAdmin: false,
      username: null,
      userId: null,
      loading: false,
    })
    router.push('/')
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
