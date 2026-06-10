'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

// Reads the ?success / ?cancelled query params Stripe redirects back to.
// useSearchParams must be rendered inside a <Suspense> boundary (see page.tsx).
export function CheckoutBanners() {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  const isCancelled = searchParams.get('cancelled') === 'true'

  if (!isSuccess && !isCancelled) return null

  return (
    <>
      {isSuccess && (
        <div style={{ background: '#1a2a1a', border: '1px solid #60d090', borderRadius: '8px', padding: '16px', marginBottom: '24px', color: '#60d090', textAlign: 'center' }}>
          Welcome to Portal Astra Premium. Check your email for next steps.
        </div>
      )}
      {isCancelled && (
        <div style={{ background: '#2a1a1a', border: '1px solid #ff6060', borderRadius: '8px', padding: '16px', marginBottom: '24px', color: '#ff6060', textAlign: 'center' }}>
          Payment cancelled. You can try again whenever you are ready.
        </div>
      )}
    </>
  )
}

// Redirects to the Stripe Checkout session created by /api/checkout.
export function CheckoutButton() {
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckoutError('Something went wrong. Please try again.')
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    }
    setCheckoutLoading(false)
  }

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={checkoutLoading}
        style={{
          background: 'linear-gradient(135deg, #7B5EA7, #C9A84C)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          padding: '14px 32px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: checkoutLoading ? 'not-allowed' : 'pointer',
          width: '100%',
          letterSpacing: '0.05em',
        }}
      >
        {checkoutLoading ? 'Redirecting...' : 'Start Founder Membership — A$7.95/mo'}
      </button>
      {checkoutError && <p style={{ color: '#ff6060', fontSize: '0.85rem', marginTop: '8px' }}>{checkoutError}</p>}
    </>
  )
}
