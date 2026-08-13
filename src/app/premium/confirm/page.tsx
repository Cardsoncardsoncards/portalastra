import type { Metadata } from 'next'
import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ConfirmClient from './ConfirmClient'

// noindex: the URL carries a single-use unlock token. It should never be
// crawled, cached by a search engine, or surfaced in results.
export const metadata: Metadata = {
  title: 'Unlock Astra Premium | Portal Astra',
  description: 'Confirm your Astra Premium unlock on this device.',
  robots: { index: false, follow: false },
}

export default function PremiumConfirmPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e8e8f0' }}>
      <Navbar />

      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '0 1.25rem 4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            margin: '2.5rem 0 0.5rem',
            textAlign: 'center',
            fontSize: '2.2rem',
            fontWeight: 700,
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: '#ffffff',
          }}
        >
          Unlock Astra Premium
        </h1>
        <p
          style={{
            margin: '0 0 2.5rem',
            textAlign: 'center',
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          One more step, on this device.
        </p>

        {/* useSearchParams must sit inside a Suspense boundary. */}
        <Suspense fallback={null}>
          <ConfirmClient />
        </Suspense>
      </div>

      <Footer />
    </main>
  )
}
