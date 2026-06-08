import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

// Replace with the real GA4 Measurement ID when available.
const GA_MEASUREMENT_ID = 'G-QMJ074E2JZ'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.portalastra.com'),
  title: 'Portal Astra — Your daily cosmic guide',
  description: 'Space science meets celestial wisdom. Daily NASA imagery, horoscopes, moon phases, angel numbers and more.',
  openGraph: {
    title: 'Portal Astra',
    description: 'Where science meets the stars. Live NASA data meets ancient cosmic wisdom.',
    url: 'https://www.portalastra.com',
    siteName: 'Portal Astra',
    type: 'website',
    images: ['/images/portal-astra-logo-horizontal.png'],
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
        <link rel="icon" href="/images/portal-astra-icon-dark.png" type="image/png" />
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
