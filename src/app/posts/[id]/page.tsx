import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const revalidate = 60

export async function generateMetadata({ params }: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single()
  if (!post) return { title: '文章不存在' }
  return { title: post.title, description: post.excerpt ?? undefined }
}

export default async function PostPage({ params }: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single()

  if (!post) notFound()

  const date = new Date(post.created_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const tags = Array.isArray(post.tags) ? post.tags : []

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '60px 20px' }}>
      <Link href="/" style={{ color: 'var(--text-dim)', fontSize: '.85rem', textDecoration: 'none' }}>
        ← 返回首页
      </Link>

      <article style={{ marginTop: 32 }}>
        <header style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
            {post.title}
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <time style={{ color: 'var(--text-dim)', fontSize: '.88rem' }}>{date}</time>
            {tags.map((tag: string) => (
              <span key={tag} style={{
                background: 'var(--bg-muted)',
                color: 'var(--text-dim)',
                padding: '2px 10px',
                borderRadius: 99,
                fontSize: '.78rem',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div
          className="post-content"
          style={{
            lineHeight: 1.85,
            fontSize: '1.05rem',
            color: 'var(--text)',
          }}
        >
          {post.content.split('\n').map((line: string, i: number) => {
            if (line.trim() === '') return <br key={i} />
            return <p key={i} style={{ margin: '0 0 1em' }}>{line}</p>
          })}
        </div>
      </article>
    </div>
  )
}
