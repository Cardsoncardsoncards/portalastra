import type { Metadata } from 'next'
import CalendarsClient from './CalendarsClient'

// NOTE: A route's page.tsx must be a Server Component to export `metadata`,
// so this server wrapper supplies the metadata and renders the interactive
// 'use client' CalendarsClient (same pattern as /moon).
const DESCRIPTION =
  'Your complete cosmic planning toolkit. Moon phase calendar, lunar planting calendar, and birth calendar with life path number.'

export const metadata: Metadata = {
  title: 'Cosmic Calendars | Portal Astra',
  description: DESCRIPTION,
  alternates: { canonical: '/calendars' },
  openGraph: {
    title: 'Cosmic Calendars, Portal Astra',
    description: DESCRIPTION,
    url: '/calendars',
    type: 'website',
    images: [
      {
        url: '/images/portalastralogohorizontal.png',
        width: 1200,
        height: 630,
        alt: 'Portal Astra Cosmic Calendars',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cosmic Calendars, Portal Astra',
    description: DESCRIPTION,
  },
}

export default function CalendarsPage() {
  return <CalendarsClient />
}
