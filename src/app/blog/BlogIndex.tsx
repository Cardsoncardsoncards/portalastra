'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/shared'
import styles from '../page.module.css'

// Fixed, ordered filter list so the pills stay consistent regardless of posts.
const CATEGORIES = ['All', 'Moon', 'Astrology', 'Angel Numbers', 'Space & NASA', 'Spiritual']

export interface BlogCard {
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  tags: string[]
}

export default function BlogIndex({ posts }: { posts: BlogCard[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter((p) => {
      const inCategory = category === 'All' || p.category === category
      if (!inCategory) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [posts, query, category])

  return (
    <>
      <input
        type="search"
        className={styles.searchInput}
        placeholder="Search articles by title or tag…"
        aria-label="Search articles"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.pills}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`${styles.pill} ${category === c ? styles.pillActive : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No articles match your search.</p>
      ) : (
        <div className={styles.postGrid}>
          {filtered.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className={styles.postCard}>
              <span className={styles.postCardCat}>{p.category}</span>
              <span className={styles.postCardTitle}>{p.title}</span>
              <span className={styles.postCardExcerpt}>{p.excerpt}</span>
              <span className={styles.postCardMeta}>{formatDate(p.date)}</span>
              <span className={styles.postTags}>
                {p.tags.slice(0, 3).map((t) => (
                  <span key={t} className={styles.postTag}>#{t}</span>
                ))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
