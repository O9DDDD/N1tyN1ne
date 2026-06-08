import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/auth-provider'
import { Nav } from '@/components/layout/nav'
import { ThemeProvider } from '@/components/layout/theme-provider'
import { PlayerProvider } from '@/components/music/player-provider'
import { ToastProvider } from '@/components/layout/toast-provider'
import { MainContent } from '@/components/layout/main-content'
import { FloatingPlayer } from '@/components/music/floating-player'
import { MvOverlay } from '@/components/music/mv-overlay'

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
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font)' }}>
        <ThemeProvider>
          <AuthProvider>
            <PlayerProvider>
              <ToastProvider>
                <Nav />
                <MainContent>{children}</MainContent>
                <FloatingPlayer />
                <MvOverlay />
              </ToastProvider>
            </PlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
