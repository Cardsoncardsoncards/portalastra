import { NextResponse } from 'next/server'
import { consumeMagicLink, peekMagicLink } from '@/lib/magicLink'
import { getPaidStatus } from '@/lib/mailerlite'
import { issueEntitlement, entitlementCookie } from '@/lib/premiumToken'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Two steps, because a single GET was not safe to treat as a click.
//
// Automated email security scanners (Outlook and Hotmail most visibly) fetch
// every link in a message to check it is safe. That GET burned the single-use
// token 30-45 seconds after the email was sent, so the subscriber's own click
// arrived at a link that had already been spent. Scanners issue GETs; they do
// not press buttons.
//
// GET  — read-only. Confirms the token exists, is unexpired and unused, then
//        hands it to /premium/confirm. Mutates nothing, so a scanner hitting
//        it costs nothing.
// POST — the real click. Burns the token, re-confirms the subscription is
//        still active, mints a signed 7-day entitlement and sets it as an
//        httpOnly cookie. The browser never sees the token value and page
//        JavaScript cannot read, forge or extend it.

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://portalastra.com').replace(/\/$/, '')
}

/** Map a token failure onto the state the confirm page renders. */
function stateFor(reason: 'not_found' | 'expired' | 'already_used' | 'unavailable'): string {
  return reason === 'unavailable' ? 'unavailable' : 'expired'
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || ''

  // Every outcome lands on /premium/confirm, including the failures. Sending
  // the failures there too means a dead link costs one hop rather than two.
  if (!token) return NextResponse.redirect(`${siteUrl()}/premium/confirm?state=invalid`, { status: 303 })

  let result
  try {
    result = await peekMagicLink(token)
  } catch (err) {
    console.error('[premium/consume] peek error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.redirect(`${siteUrl()}/premium/confirm?state=unavailable`, { status: 303 })
  }

  if (!result.ok) {
    // The reasons are collapsed for the visitor into two outcomes: "this link
    // no longer works" and "we could not check right now". There is no value
    // in telling a link-guesser which of not_found / expired / already_used
    // they hit.
    return NextResponse.redirect(`${siteUrl()}/premium/confirm?state=${stateFor(result.reason)}`, { status: 303 })
  }

  return NextResponse.redirect(
    `${siteUrl()}/premium/confirm?token=${encodeURIComponent(token)}`,
    { status: 303 },
  )
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token : ''

  if (!token) return NextResponse.json({ ok: false, state: 'invalid' }, { status: 400 })

  let result
  try {
    result = await consumeMagicLink(token)
  } catch (err) {
    console.error('[premium/consume] store error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ ok: false, state: 'unavailable' }, { status: 503 })
  }

  if (!result.ok) {
    if (result.reason === 'unavailable') {
      return NextResponse.json({ ok: false, state: 'unavailable' }, { status: 503 })
    }
    return NextResponse.json({ ok: false, state: 'expired' }, { status: 400 })
  }

  // Re-check entitlement at the moment of use, not only at the moment the link
  // was sent. A subscription cancelled in between should not still unlock.
  const status = await getPaidStatus(result.email)
  if (status === 'unavailable') return NextResponse.json({ ok: false, state: 'unavailable' }, { status: 503 })
  if (status !== 'paid') return NextResponse.json({ ok: false, state: 'expired' }, { status: 403 })

  let cookie: string
  try {
    cookie = entitlementCookie(issueEntitlement(result.email))
  } catch (err) {
    // PREMIUM_TOKEN_SECRET missing. Fail closed and say so in the logs.
    console.error('[premium/consume] cannot issue entitlement:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ ok: false, state: 'unavailable' }, { status: 503 })
  }

  // JSON rather than a 303, because this is called by fetch(). The cookie is
  // set on this response; the page then navigates itself to the redirect.
  const res = NextResponse.json({ ok: true, redirect: '/?unlock=success' })
  res.headers.set('Set-Cookie', cookie)
  return res
}
