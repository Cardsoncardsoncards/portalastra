import type { Metadata } from 'next'
import MoonClient from './MoonClient'

// NOTE: A page that exports `metadata` must be a Server Component, so the
// interactive 'use client' calendar lives in MoonClient and this server
// wrapper supplies the metadata.
export const metadata: Metadata = {
  title: 'Moon Phase Calendar | Portal Astra',
  description:
    'Track the full lunar cycle with our interactive moon phase calendar. Phase meanings, upcoming events, astronomical data and more.',
}

export default function MoonPage() {
  return <MoonClient />
}
