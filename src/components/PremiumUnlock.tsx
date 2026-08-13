'use client'

import { useEffect, useState } from 'react'

// Premium access, client side.
//
// The old pattern, repeated in three files, was:
//
//   const { verified, expires } = JSON.parse(localStorage.getItem('pa_premium_verified'))
//   if (verified && Date.now() < expires) setIsPremium(true)
//
// which trusted a value the visitor could type into a console, for 30 days.
//
// Now: the entitlement is an httpOnly, HMAC-signed, 7-day cookie that only
// the magic-link consume route can mint, and every gate asks the server on
// mount. Nothing about the answer lives in a place page JavaScript can write.

export type PremiumStatus = 'loading' | 'premium' | 'guest'

export interface PremiumState {
  status: PremiumStatus
  email?: string
}

/** Legacy key from the localStorage era. Removed on sight. */
const LEGACY_KEY = 'pa_premium_verified'

export function usePremium(): PremiumState {
  const [state, setState] = useState<PremiumState>({ status: 'loading' })

  useEffect(() => {
    // Anything still holding the old flag is holding something meaningless.
    try {
      localStorage.removeItem(LEGACY_KEY)
    } catch {}

    let cancelled = false

    // `no-store`: this is the entitlement check, it must not be served from a
    // stale cache after a subscription ends.
    fetch('/api/premium/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setState(d?.premium ? { status: 'premium', email: d.email } : { status: 'guest' })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'guest' })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(155,138,255,0.06)',
  border: '1px solid rgba(155,138,255,0.2)',
  borderRadius: '12px',
  padding: '20px',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: '200px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(155,138,255,0.25)',
  borderRadius: '8px',
  padding: '10px 14px',
  color: '#e8e0ff',
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
}

/**
 * The unlock form. Asks for an email, requests a magic link, and shows the same
 * confirmation whatever the answer was.
 */
export default function PremiumUnlock({
  heading = 'Astra Premium',
  blurb = 'Enter the email you subscribed with and we will send you an unlock link.',
}: {
  heading?: string
  blurb?: string
}) {
  const [email, setEmail] = useState('')
  // Honeypot. Same field name, same hidden treatment as the homepage subscribe
  // form, deliberately not a second invented pattern.
  //
  // The name is deliberately meaningless. It used to be `website`, which is a
  // field name password managers recognise and helpfully fill in — with the
  // visitor's email, which tripped the honeypot on every real submission.
  const [hpField, setHpField] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ tone: 'ok' | 'warn' | 'err'; msg: string } | null>(null)

  const request = async () => {
    if (busy) return
    if (!email.includes('@')) {
      setNote({ tone: 'err', msg: 'Please enter a valid email address.' })
      return
    }
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/premium/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pa_hp_field: hpField }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setNote({ tone: 'ok', msg: data.message || 'Check your email for the unlock link.' })
        setEmail('')
      } else if (res.status === 503 || data?.unavailable) {
        // Explicitly not "you are not a subscriber". This is our problem.
        setNote({
          tone: 'warn',
          msg:
            data.message ||
            'Subscription checks are temporarily unavailable. This is a problem on our side, not with your account. Please try again shortly.',
        })
      } else {
        setNote({ tone: 'err', msg: data.message || 'Something went wrong. Please try again.' })
      }
    } catch {
      setNote({ tone: 'err', msg: 'Network error. Please try again.' })
    }
    setBusy(false)
  }

  const toneColour = note?.tone === 'ok' ? '#60d090' : note?.tone === 'warn' ? '#ffd700' : '#ff8080'

  return (
    <div style={panelStyle}>
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9b8aff', marginBottom: '8px' }}>
        {heading}
      </p>
      <p style={{ fontSize: '13px', color: 'rgba(232,224,255,0.6)', marginBottom: '14px', lineHeight: '1.6' }}>
        {blurb}
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Named and typed so autofill has an obvious correct target. It comes
            first in DOM order for the same reason. */}
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="your@email.com"
          aria-label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && request()}
          style={inputStyle}
        />
        <button
          onClick={request}
          disabled={busy}
          style={{
            background: 'linear-gradient(135deg, #7B5EA7, #C9A84C)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {busy ? 'Sending...' : 'Email me a link'}
        </button>
      </div>

      {/* Honeypot, hidden from real users, catches bots. Last in DOM order and
          `new-password` so password managers leave it alone. */}
      <input
        type="text"
        name="pa_hp_field"
        tabIndex={-1}
        autoComplete="new-password"
        aria-hidden="true"
        value={hpField}
        onChange={(e) => setHpField(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      {note && <p style={{ color: toneColour, fontSize: '12px', marginTop: '10px', lineHeight: 1.6 }}>{note.msg}</p>}

      <p style={{ fontSize: '11px', color: 'rgba(232,224,255,0.25)', marginTop: '10px' }}>
        Not a member yet? <a href="/pricing" style={{ color: '#9b8aff' }}>View Astra Premium</a>
      </p>
    </div>
  )
}
