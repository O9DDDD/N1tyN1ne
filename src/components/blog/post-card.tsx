import Link from 'next/link'
import type { Post } from '@/lib/supabase/types'

export function PostCard({ post }: { post: Post }) {
  const tags = Array.isArray(post.tags) ? post.tags : []
  const date = new Date(post.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Link href={`/posts/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <article className={`blog-card ${post.pinned ? 'pinned-card' : ''}`}>
        <div className="meta">
          {post.pinned && <span className="pinned-badge">📌 置顶</span>}
          <time>{date}</time>
          {tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
      </article>
    </Link>
  )
}
