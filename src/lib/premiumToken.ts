import { createHmac, timingSafeEqual } from 'crypto'

// Signed, expiring entitlement token.
//
// What this replaces: `localStorage.setItem('pa_premium_verified', ...)` with an
// unsigned `{ verified: true, expires }` blob and a 30-day life. Anyone could
// type that into a console and unlock every premium surface on the site,
// because the only check was that the object said `verified: true`.
//
// This token is signed server-side and can only be minted by the magic-link
// consume route. It is delivered as an httpOnly cookie, so page JavaScript
// cannot read it, forge it, or extend it. A full JWT library is overkill for a
// two-field payload; HMAC-SHA256 over base64url JSON is the same guarantee
// with no dependency.

/**
 * 7 days. Was 24 hours, and 30 days before that.
 *
 * The single source of truth for the entitlement lifetime: the token's `exp`
 * claim and the cookie's `Max-Age` are both derived from it, so they cannot
 * drift apart. Change it here and nowhere else.
 */
export const ENTITLEMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export const PREMIUM_COOKIE = 'pa_premium'

export interface Entitlement {
  /** Subscriber email the entitlement was issued to. */
  email: string
  /** Expiry, epoch milliseconds. */
  exp: number
}

function secret(): string {
  const value = process.env.PREMIUM_TOKEN_SECRET
  if (!value) {
    // Fail closed. A missing secret must never degrade to "everyone is
    // premium" or to an unsigned token.
    throw new Error('PREMIUM_TOKEN_SECRET is not set')
  }
  return value
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function sign(payload: string): string {
  return b64url(createHmac('sha256', secret()).update(payload).digest())
}

/** Mint a signed entitlement token for `email`, valid for ENTITLEMENT_TTL_MS. */
export function issueEntitlement(email: string, now = Date.now()): string {
  const claims: Entitlement = { email, exp: now + ENTITLEMENT_TTL_MS }
  const payload = b64url(JSON.stringify(claims))
  return `${payload}.${sign(payload)}`
}

/**
 * Verify a token. Returns the claims, or null if the token is malformed, the
 * signature does not match, or it has expired.
 *
 * Never throws on bad input: callers treat null as "not entitled".
 */
export function verifyEntitlement(token: string | undefined | null, now = Date.now()): Entitlement | null {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  if (!payload || !signature) return null

  let expected: string
  try {
    expected = sign(payload)
  } catch {
    // No secret configured. Fail closed rather than granting access.
    return null
  }

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  // Length check first: timingSafeEqual throws on a length mismatch.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let claims: Entitlement
  try {
    claims = JSON.parse(fromB64url(payload).toString('utf8'))
  } catch {
    return null
  }

  if (typeof claims?.email !== 'string' || typeof claims?.exp !== 'number') return null
  if (now >= claims.exp) return null

  return claims
}

/** Read and verify the entitlement cookie off an incoming request. */
export function entitlementFromRequest(req: Request): Entitlement | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== PREMIUM_COOKIE) continue
    return verifyEntitlement(decodeURIComponent(part.slice(eq + 1).trim()))
  }
  return null
}

/** `Set-Cookie` value for a freshly issued entitlement. */
export function entitlementCookie(token: string): string {
  const maxAgeSeconds = Math.floor(ENTITLEMENT_TTL_MS / 1000)
  return [
    `${PREMIUM_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ')
}

/** `Set-Cookie` value that clears the entitlement. */
export function clearEntitlementCookie(): string {
  return `${PREMIUM_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}
