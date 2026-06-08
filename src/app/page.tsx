import { createClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/blog/post-card'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .single()

  const heroTitle = settings?.hero_title ?? 'N1tyN1ne'
  const heroDesc = settings?.hero_desc ?? '记录、思考、分享。'
  const aboutIntro = settings?.about_intro ?? ''
  const aboutTitle2 = settings?.about_title2 ?? '音乐'
  const aboutDesc2 = settings?.about_desc2 ?? ''
  const aboutTitle3 = settings?.about_title3 ?? '写作'
  const aboutDesc3 = settings?.about_desc3 ?? ''

  return (
    <div>
      {/* Hero */}
      <section id="hero">
        <div className="hero-glow" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h1>{heroTitle}</h1>
          <p className="hero-desc">{heroDesc}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="#posts" className="btn btn-primary">
              阅读文章
            </Link>
            <Link href="/music" className="btn btn-outline">
              听听音乐
            </Link>
          </div>
        </div>
      </section>

      {/* Posts */}
      <section id="posts">
        <div className="container">
          <h2 className="section-title">文章</h2>
          <p className="section-subtitle">记录、思考、分享。</p>
          <div className="blog-grid">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {(!posts || posts.length === 0) && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>暂无文章</p>
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section id="about">
        <div className="container">
          <h2 className="section-title">关于</h2>
          <p className="section-subtitle">一个人，一隅角落。</p>

          {aboutIntro && (
            <div className="about-intro">
              <p>{aboutIntro}</p>
            </div>
          )}

          <div className="about-notes">
            <div className="sticky-note">
              <div className="note-tape" />
              <div className="note-icon">🎵</div>
              <h3>{aboutTitle2}</h3>
              <p>{aboutDesc2 || '穿梭于旋律之间，收集时光的碎片。'}</p>
            </div>
            <div className="sticky-note">
              <div className="note-tape" />
              <div className="note-icon">✍</div>
              <h3>{aboutTitle3}</h3>
              <p>{aboutDesc3 || '用文字雕刻思想，把灵感留在此处。'}</p>
            </div>
          </div>

          <div className="social-links">
            <a href="https://github.com/N1tyN1ne" target="_blank" rel="noopener" title="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.604-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p>&copy; {new Date().getFullYear()} N1tyN1ne. Built with ♥ and Next.js.</p>
      </footer>
    </div>
  )
}
