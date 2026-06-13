import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Nav } from '@/components/layout/nav'
import { NavProgress } from '@/components/layout/nav-progress'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { PlayerProvider } from '@/components/music/player-provider'
import { ToastProvider } from '@/components/layout/toast-provider'
import { MainContent } from '@/components/layout/main-content'
import { FloatingPlayer } from '@/components/music/floating-player'
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'N1tyN1ne',
  description: '记录、思考、分享。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fjybxoqfatxtgydltvuw.supabase.co" />
        <link rel="preconnect" href="https://cn-sy1.rains3.com" />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font)' }}>
        <ThemeProvider>
          <AuthProvider>
            <PlayerProvider>
              <ToastProvider>
                <NavProgress />
                <Nav />
                <MainContent>{children}</MainContent>
                <FloatingPlayer />
              </ToastProvider>
            </PlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
