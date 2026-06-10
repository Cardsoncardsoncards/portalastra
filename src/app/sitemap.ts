import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.portalastra.com').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/moon`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/nasa-data`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/calendars`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...postEntries,
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
