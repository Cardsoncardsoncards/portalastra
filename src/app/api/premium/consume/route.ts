import { NextResponse } from 'next/server'
import { consumeMagicLink } from '@/lib/magicLink'
import { getPaidStatus } from '@/lib/mailerlite'
import { issueEntitlement, entitlementCookie } from '@/lib/premiumToken'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET, because this is the URL in the email that the subscriber clicks.
//
// On success it burns the single-use token, re-confirms the subscription is
// still active, mints a signed 24-hour entitlement, sets it as an httpOnly
// cookie and redirects to the site. The browser never sees the token value and
// page JavaScript cannot read, forge or extend it.

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://portalastra.com').replace(/\/$/, '')
}

function redirectWith(path: string, cookie?: string) {
  const res = NextResponse.redirect(`${siteUrl()}${path}`, { status: 303 })
  if (cookie) res.headers.set('Set-Cookie', cookie)
  return res
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || ''

  if (!token) return redirectWith('/pricing?unlock=invalid')

  let result
  try {
    result = await consumeMagicLink(token)
  } catch (err) {
    console.error('[premium/consume] store error:', err instanceof Error ? err.message : 'unknown')
    return redirectWith('/pricing?unlock=unavailable')
  }

  if (!result.ok) {
    // The reasons are collapsed for the visitor into two outcomes: "this link
    // no longer works" and "we could not check right now". There is no value
    // in telling a link-guesser which of not_found / expired / already_used
    // they hit.
    if (result.reason === 'unavailable') return redirectWith('/pricing?unlock=unavailable')
    return redirectWith('/pricing?unlock=expired')
  }

  // Re-check entitlement at the moment of use, not only at the moment the link
  // was sent. A subscription cancelled in between should not still unlock.
  const status = await getPaidStatus(result.email)
  if (status === 'unavailable') return redirectWith('/pricing?unlock=unavailable')
  if (status !== 'paid') return redirectWith('/pricing?unlock=expired')

  let cookie: string
  try {
    cookie = entitlementCookie(issueEntitlement(result.email))
  } catch (err) {
    // PREMIUM_TOKEN_SECRET missing. Fail closed and say so in the logs.
    console.error('[premium/consume] cannot issue entitlement:', err instanceof Error ? err.message : 'unknown')
    return redirectWith('/pricing?unlock=unavailable')
  }

  return redirectWith('/?unlock=success', cookie)
}
