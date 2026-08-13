import type { MetadataRoute } from 'next'

// Apex, no www, matching sitemap.ts and layout.tsx.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://portalastra.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
