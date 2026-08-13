import type { Metadata } from 'next'
import { getAllPosts } from '@/lib/posts'
import BlogIndex from './BlogIndex'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import styles from '../page.module.css'

export const metadata: Metadata = {
  title: 'Blog — Portal Astra',
  description:
    'Guides to the night sky and the symbolism we read into it — moon phases, angel numbers, tarot, zodiac signs, space weather and more.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog, Portal Astra', url: '/blog', type: 'website' },
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
        <Navbar />
        <h1 className={styles.pageTitle}>The Blog</h1>

        <p className={styles.blogIntro}>
          Plain-spoken guides to astronomy and the symbolism people have always read into the sky.
          Science is labelled as science; spiritual content is labelled as reflection.
        </p>

        <BlogIndex posts={posts} />
      </div>
      <Footer title="Portal Astra" />
    </main>
  )
}
