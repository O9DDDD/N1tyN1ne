import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded border border-neutral-700 bg-neutral-900 p-6 text-center text-neutral-400">
            加载中...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
