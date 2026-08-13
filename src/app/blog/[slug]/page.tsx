import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPost, getAllPosts, getRelatedPosts } from '@/lib/posts'
import { formatDate } from '@/lib/shared'
import ReadingProgress from './ReadingProgress'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../../page.module.css'

// Apex, no www, matching sitemap.ts, robots.ts and layout.tsx.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://portalastra.com').replace(/\/$/, '')

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getPost(params.slug)
  if (!post) return { title: 'Post not found, Portal Astra' }
  return {
    title: `${post.title}, Portal Astra`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `${SITE_URL}/blog/${post.slug}`,
      publishedTime: post.date,
      images: [
        {
          url: '/images/portalastralogohorizontal.png',
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

// Parse inline <a href='...'>label</a> tags in body text into real links.
function renderInline(text: string) {
  const re = /<a href=['"]([^'"]+)['"]>(.*?)<\/a>/g
  const out: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const href = m[1]
    const label = m[2]
    if (href.startsWith('/')) {
      out.push(<Link key={key++} href={href} className={styles.bodyLink}>{label}</Link>)
    } else {
      out.push(<a key={key++} href={href} className={styles.bodyLink} target="_blank" rel="noopener noreferrer">{label}</a>)
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

// Render the plain-text body: "## " blocks become headings, others paragraphs.
function renderBody(body: string) {
  return body.split(/\n\n+/).map((block, i) => {
    if (block.startsWith('## ')) {
      return (
        <h2 key={i} className={styles.bodyH2}>
          {renderInline(block.slice(3))}
        </h2>
      )
    }
    return (
      <p key={i} className={styles.bodyP}>
        {renderInline(block)}
      </p>
    )
  })
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

  const related = getRelatedPosts(post.slug)
  const wordCount = post.body.split(' ').length

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    wordCount,
    keywords: post.tags.join(', '),
    articleSection: post.category,
    author: {
      '@type': 'Organization',
      name: 'Portal Astra Editorial Team',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Portal Astra',
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  }

  return (
    <main className={styles.main}>
      <ReadingProgress />
      <div className={styles.stars} aria-hidden />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className={styles.container}>
        <Navbar />
        <p>
          <Link href="/blog" className={styles.footerLink}>← All articles</Link>
        </p>

        <article className={styles.article}>
          <p className={styles.label}>{post.category}</p>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          <p className={styles.articleMeta}>{formatDate(post.date)}</p>
          <p className={styles.authorLine}>
            By <Link href="/about" className={styles.authorLink}>Portal Astra Editorial Team</Link> · portalastra.com
          </p>

          <div className={styles.articleBody}>{renderBody(post.body)}</div>
        </article>

        {/* The Pinterest-only row that used to sit here is gone: the footer's
            ShareButtons carries Pinterest plus six other targets. */}

        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <p className={styles.label}>Related reading</p>
            <div className={styles.relatedGrid}>
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className={styles.relatedCard}>
                  <span className={styles.postCardCat}>{r.category}</span>
                  <span className={styles.relatedTitle}>{r.title}</span>
                  <span className={styles.postCardExcerpt}>{r.excerpt}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
      <Footer
        title="Portal Astra"
        shareText={`${post.title}, portalastra.com`}
        shareImage={`${SITE_URL}/images/portalastralogohorizontal.png`}
      />
    </main>
  )
}
