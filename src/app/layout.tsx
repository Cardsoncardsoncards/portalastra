import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

// Replace with the real GA4 Measurement ID when available.
const GA_MEASUREMENT_ID = 'G-PLACEHOLDER'

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
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
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
