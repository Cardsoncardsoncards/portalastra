import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllPosts } from '@/lib/posts'
import BlogIndex from './BlogIndex'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Blog — Portal Astra',
  description:
    'Guides to the night sky and the symbolism we read into it — moon phases, angel numbers, tarot, zodiac signs, space weather and more.',
}

export default function BlogPage() {
  const posts = getAllPosts().map(({ slug, title, excerpt, date, category, tags }) => ({
    slug,
    title,
    excerpt,
    date,
    category,
    tags,
  }))

  return (
    <main className={styles.main}>
      <div className={styles.stars} aria-hidden />

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.logo} aria-label="Portal Astra">
              PORTAL<span className={styles.dot}>·</span>ASTRA
            </h1>
            <p className={styles.tagline}>The Blog · the sky, both ways</p>
          </div>
        </header>

        <p className={styles.blogIntro}>
          Plain-spoken guides to astronomy and the symbolism people have always read into the sky.
          Science is labelled as science; spiritual content is labelled as reflection.
        </p>

        <BlogIndex posts={posts} />

        <footer className={styles.footer}>
          <p><Link href="/" className={styles.footerLink}>Portal Astra</Link> · <Link href="/about" className={styles.footerLink}>About</Link> · <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link></p>
        </footer>
      </div>
    </main>
  )
}
