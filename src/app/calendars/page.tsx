import type { Metadata } from 'next'
import CalendarsClient from './CalendarsClient'

// NOTE: A route's page.tsx must be a Server Component to export `metadata`,
// so this server wrapper supplies the metadata and renders the interactive
// 'use client' CalendarsClient (same pattern as /moon).
export const metadata: Metadata = {
  title: 'Cosmic Calendars | Portal Astra',
  description:
    'Your complete cosmic planning toolkit. Moon phase calendar, lunar planting calendar, and birth calendar with life path number.',
}

export default function CalendarsPage() {
  return <CalendarsClient />
}
