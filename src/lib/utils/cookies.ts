export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  // 30 天 — Supabase 通过 JWT expiry 自行管理实际过期
  maxAge: 60 * 60 * 24 * 30,
}
