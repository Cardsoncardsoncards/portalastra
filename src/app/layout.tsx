import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

// Replace with the real GA4 Measurement ID when available.
const GA_MEASUREMENT_ID = 'G-QMJ074E2JZ'

export const metadata: Metadata = {
  metadataBase: new URL('https://portalastra.com'),
  title: 'Portal Astra, Your daily cosmic guide',
  description: 'Space science meets celestial wisdom. Daily NASA imagery, horoscopes, moon phases, angel numbers and more.',
  keywords: [
    'moon phases', 'lunar calendar', 'astrology', 'horoscope', 'space weather', 'NASA',
    'tarot', 'angel numbers', 'moon phase calendar', 'life path number', 'cosmic guide',
  ],
  alternates: {
    canonical: 'https://portalastra.com',
  },
  openGraph: {
    title: 'Portal Astra',
    description: 'Where science meets the stars. Live NASA data meets ancient cosmic wisdom.',
    url: 'https://portalastra.com',
    siteName: 'Portal Astra',
    type: 'website',
    locale: 'en_AU',
    images: [
      {
        url: '/images/portalastralogohorizontal.png',
        width: 1200,
        height: 630,
        alt: 'Portal Astra, Astronomy. Guidance. Discovery.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@portalastra',
    title: 'Portal Astra',
    description: 'Your daily portal to the cosmos.',
    images: ['/images/portalastralogohorizontal.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/portalastraicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/portalastraicon.png" />
        <meta name="p:domain_verify" content="24dc89856b3a12b94ef001337ec74015"/>
      </head>
      <body>
        {children}

        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  )
}
