import { NextResponse } from 'next/server'
import { entitlementFromRequest, clearEntitlementCookie } from '@/lib/premiumToken'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The single place the front end asks "am I premium?".
//
// Every premium gate on the site calls this on mount instead of reading a
// localStorage flag. The answer comes from verifying an HMAC signature over an
// httpOnly cookie server-side, so a visitor cannot grant it to themselves.
// That is what closes SEC-003.

export async function GET(req: Request) {
  const entitlement = entitlementFromRequest(req)

  if (!entitlement) {
    // Clear any stale or tampered cookie on the way out so the browser stops
    // sending it.
    const res = NextResponse.json({ premium: false })
    res.headers.set('Set-Cookie', clearEntitlementCookie())
    return res
  }

  return NextResponse.json({
    premium: true,
    email: entitlement.email,
    expiresAt: entitlement.exp,
  })
}

/** Sign out of premium on this device. */
export async function DELETE() {
  const res = NextResponse.json({ premium: false })
  res.headers.set('Set-Cookie', clearEntitlementCookie())
  return res
}
