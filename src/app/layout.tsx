import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Portal Astra — Your daily cosmic guide',
  description: 'Space science meets celestial wisdom. Daily NASA imagery, horoscopes, moon phases, angel numbers and more.',
  openGraph: {
    title: 'Portal Astra',
    description: 'Your daily portal to the cosmos. NASA imagery, horoscopes, moon phases and angel numbers.',
    url: 'https://www.portalastra.com',
    siteName: 'Portal Astra',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portal Astra',
    description: 'Your daily portal to the cosmos.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
