'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/admin', label: '概览', icon: '📊' },
  { href: '/admin/posts', label: '文章', icon: '📝' },
  { href: '/admin/music', label: '音乐', icon: '🎵' },
  { href: '/admin/comments', label: '留言', icon: '💬' },
  { href: '/admin/friends', label: '友链', icon: '🔗' },
  { href: '/admin/settings', label: '设置', icon: '⚙' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="admin-sidebar">
      {links.map((link) => {
        const isActive =
          link.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={isActive ? 'active' : ''}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        )
      })}
    </aside>
  )
}
