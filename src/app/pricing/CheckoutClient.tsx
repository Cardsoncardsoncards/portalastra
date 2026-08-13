'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PREMIUM_PRICE_SHORT } from '@/lib/pricing'

const bannerBase: React.CSSProperties = {
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
  textAlign: 'center',
  lineHeight: 1.7,
  fontSize: '14px',
}

// Reads the ?success / ?cancelled query params Stripe redirects back to, plus
// the ?unlock state the magic-link consume route redirects here with.
// useSearchParams must be rendered inside a <Suspense> boundary (see page.tsx).
export function CheckoutBanners() {
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get('success') === 'true'
  const isCancelled = searchParams.get('cancelled') === 'true'
  const unlock = searchParams.get('unlock')
  // Echoed back from the checkout session so the customer knows precisely which
  // address unlocks their access. Rendered as React text, so it is escaped.
  const paidEmail = searchParams.get('email')

  if (!isSuccess && !isCancelled && !unlock) return null

  return (
    <>
      {isSuccess && (
        <div style={{ ...bannerBase, background: '#1a2a1a', border: '1px solid #60d090', color: '#60d090' }}>
          Welcome to Portal Astra Premium. To switch premium on, open the Sky tab or
          the Calendars page, enter{' '}
          {paidEmail ? <strong>{paidEmail}</strong> : 'the email you just paid with'} in
          the unlock box, and click the one-time link we send you.
        </div>
      )}
      {isCancelled && (
        <div style={{ ...bannerBase, background: '#2a1a1a', border: '1px solid #ff6060', color: '#ff6060' }}>
          Payment cancelled. You can try again whenever you are ready.
        </div>
      )}
      {unlock === 'expired' && (
        <div style={{ ...bannerBase, background: '#2a1a1a', border: '1px solid #ff6060', color: '#ff6060' }}>
          That unlock link no longer works. Links can be used once and expire after 20
          minutes. Request a fresh one and it will arrive in a moment.
        </div>
      )}
      {unlock === 'invalid' && (
        <div style={{ ...bannerBase, background: '#2a1a1a', border: '1px solid #ff6060', color: '#ff6060' }}>
          That unlock link was not readable. Request a new one and open it directly
          from the email rather than copying part of the address.
        </div>
      )}
      {unlock === 'unavailable' && (
        <div style={{ ...bannerBase, background: '#2a2415', border: '1px solid #ffd700', color: '#ffd700' }}>
          We could not check your subscription just now. This is a problem on our side,
          not with your account. Please try the link again shortly.
        </div>
      )}
    </>
  )
}

// Captures the customer's email, then redirects to the Stripe Checkout session
// created by /api/checkout.
//
// The email used to be sent as an empty string, so Stripe collected it itself
// and the site never learned which address had paid. That is the address the
// unlock flow keys on, so capturing it here lets the success banner name it.
export function CheckoutButton() {
  const [email, setEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const handleCheckout = async () => {
    if (checkoutLoading) return
    if (!email.includes('@')) {
      setCheckoutError('Enter the email address you want your subscription linked to.')
      return
    }
    setCheckoutLoading(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setCheckoutError(data.error || 'Something went wrong. Please try again.')
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    }
    setCheckoutLoading(false)
  }

  return (
    <>
      <input
        type="email"
        placeholder="you@example.com"
        aria-label="Email address for your subscription"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCheckout()}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(155,138,255,0.25)',
          borderRadius: '8px',
          padding: '12px 14px',
          color: '#e8e0ff',
          fontSize: '0.95rem',
          fontFamily: 'inherit',
          outline: 'none',
          marginBottom: '10px',
        }}
      />
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
        {checkoutLoading ? 'Redirecting...' : `Start Founder Membership, ${PREMIUM_PRICE_SHORT}`}
      </button>
      <p style={{ fontSize: '11px', color: 'rgba(232,224,255,0.4)', marginTop: '8px', lineHeight: 1.6, textAlign: 'center' }}>
        Use an address you can receive email at. Premium unlocks via a link sent to it.
      </p>
      {checkoutError && <p style={{ color: '#ff6060', fontSize: '0.85rem', marginTop: '8px' }}>{checkoutError}</p>}
    </>
  )
}
