'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

// The second half of the two-step unlock.
//
// /api/premium/consume has already checked (read-only) that the token is real,
// unexpired and unused, and redirected here with either the token or a failure
// state. Nothing has been burned yet. The button below is the first thing in
// the flow that mutates anything, which is the entire point: an email security
// scanner will have followed the link to get here and stopped.

const panelStyle: React.CSSProperties = {
  background: 'rgba(155,138,255,0.06)',
  border: '1px solid rgba(155,138,255,0.2)',
  borderRadius: '12px',
  padding: '28px 24px',
  maxWidth: '480px',
  width: '100%',
  textAlign: 'center',
}

const bannerBase: React.CSSProperties = {
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center',
  lineHeight: 1.7,
  fontSize: '13px',
}

const headingStyle: React.CSSProperties = {
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#9b8aff',
  marginBottom: '10px',
}

const footnoteStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(232,224,255,0.35)',
  marginTop: '16px',
  lineHeight: 1.7,
}

function buttonStyle(busy: boolean): React.CSSProperties {
  return {
    background: 'linear-gradient(135deg, #7B5EA7, #C9A84C)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '13px 28px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: busy ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.04em',
    marginTop: '4px',
  }
}

function RequestAnother() {
  return (
    <p style={footnoteStyle}>
      Request a fresh link from the{' '}
      <Link href="/pricing" style={{ color: '#9b8aff' }}>
        pricing page
      </Link>
      , or the unlock box on the Sky tab.
    </p>
  )
}

export default function ConfirmClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const initialState = searchParams.get('state') || ''

  const [state, setState] = useState(initialState)
  const [busy, setBusy] = useState(false)

  const unlock = async () => {
    if (busy) return
    setBusy(true)
    setState('')
    try {
      const res = await fetch('/api/premium/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data?.ok) {
        // Full navigation rather than a router push: the entitlement cookie was
        // just set, and every premium gate re-asks the server on mount.
        window.location.href = data.redirect || '/?unlock=success'
        return
      }
      setState(data?.state || 'expired')
    } catch {
      setState('network')
    }
    setBusy(false)
  }

  // Order matters: an 'unavailable' or 'invalid' redirect carries no token, so
  // the explicit states have to be tested before the missing-token case.
  //
  // Wording is deliberately identical to the pricing-page banners, so a visitor
  // who has seen one recognises the other.

  if (state === 'unavailable' || state === 'network') {
    return (
      <div style={panelStyle}>
        <p style={headingStyle}>Astra Premium</p>
        <div style={{ ...bannerBase, background: '#2a2415', border: '1px solid #ffd700', color: '#ffd700' }}>
          {state === 'network'
            ? 'Network error. Your link has not been used, so you can try again.'
            : 'We could not check your subscription just now. This is a problem on our side, not with your account. Please try the link again shortly.'}
        </div>
        {token ? (
          <button onClick={unlock} disabled={busy} style={buttonStyle(busy)}>
            {busy ? 'Unlocking...' : 'Try again'}
          </button>
        ) : (
          <RequestAnother />
        )}
      </div>
    )
  }

  if (state === 'expired') {
    return (
      <div style={panelStyle}>
        <p style={headingStyle}>Astra Premium</p>
        <div style={{ ...bannerBase, background: '#2a1a1a', border: '1px solid #ff6060', color: '#ff6060' }}>
          That unlock link no longer works. Links can be used once and expire after 20
          minutes. Request a fresh one and it will arrive in a moment.
        </div>
        <RequestAnother />
      </div>
    )
  }

  if (state === 'invalid' || !token) {
    return (
      <div style={panelStyle}>
        <p style={headingStyle}>Astra Premium</p>
        <div style={{ ...bannerBase, background: '#2a1a1a', border: '1px solid #ff6060', color: '#ff6060' }}>
          That unlock link was not readable. Request a new one and open it directly from
          the email rather than copying part of the address.
        </div>
        <RequestAnother />
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <p style={headingStyle}>Astra Premium</p>
      <p style={{ fontSize: '14px', color: 'rgba(232,224,255,0.75)', marginBottom: '20px', lineHeight: 1.7 }}>
        Click below to unlock Astra Premium on this device.
      </p>

      <button onClick={unlock} disabled={busy} style={buttonStyle(busy)}>
        {busy ? 'Unlocking...' : 'Unlock Astra Premium'}
      </button>

      <p style={footnoteStyle}>This link works once and expires 20 minutes after it was sent.</p>
    </div>
  )
}
