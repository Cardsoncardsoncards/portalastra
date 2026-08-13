import type { Metadata } from 'next'
import MoonClient from './MoonClient'

// NOTE: A page that exports `metadata` must be a Server Component, so the
// interactive 'use client' calendar lives in MoonClient and this server
// wrapper supplies the metadata.
const DESCRIPTION =
  'Track the full lunar cycle with our interactive moon phase calendar. Phase meanings, upcoming events, astronomical data and more.'

export const metadata: Metadata = {
  title: 'Moon Phase Calendar | Portal Astra',
  description: DESCRIPTION,
  alternates: { canonical: '/moon' },
  openGraph: {
    title: 'Moon Phase Calendar, Portal Astra',
    description: DESCRIPTION,
    url: '/moon',
    type: 'website',
    images: [
      {
        url: '/images/portalastralogohorizontal.png',
        width: 1200,
        height: 630,
        alt: 'Portal Astra Moon Phase Calendar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Moon Phase Calendar, Portal Astra',
    description: DESCRIPTION,
  },
}

export default function MoonPage() {
  return <MoonClient />
}
