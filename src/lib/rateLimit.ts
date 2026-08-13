// Shared in-memory rate limiter.
//
// Two things were wrong with the copy previously inlined in /api/subscribe:
//
//  1. It keyed on the first entry of `X-Forwarded-For`. That header is
//     client-suppliable. Anyone could send `X-Forwarded-For: <random>` on every
//     request and get an unlimited number of fresh buckets, which means the
//     limit did nothing against exactly the automated abuse it existed to stop.
//     Netlify sets `x-nf-client-connection-ip` from the actual TCP peer and it
//     cannot be spoofed by the client, so that is what we key on.
//
//  2. It never removed expired entries. The Map grew by one entry per unique
//     key forever, for the life of the server instance.
//
// Still best-effort: state is per server instance and resets on cold start.
// That is acceptable for blunting automated abuse; it is not a security
// boundary.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Evicting the whole map on every write would be O(n) per request. Sweeping
// only every so often keeps the amortised cost near zero while still bounding
// growth.
const SWEEP_INTERVAL_MS = 60_000
let lastSweep = 0

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  // forEach rather than for..of: the tsconfig target does not enable
  // downlevelIteration, so iterating a Map directly is a compile error.
  // Deleting during forEach is well defined for Map.
  buckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) buckets.delete(key)
  })
}

/**
 * The client's IP, from the platform rather than from the client.
 *
 * Order matters: `x-nf-client-connection-ip` is set by Netlify's edge and is
 * not forwarded from the request, so it wins. The `x-forwarded-for` fallback
 * only exists so local `next dev` still rate limits something rather than
 * putting every request in one shared bucket, and it should never be trusted
 * in production.
 */
export function getClientIp(req: Request): string {
  const platformIp = req.headers.get('x-nf-client-connection-ip')
  if (platformIp) return platformIp.trim()

  const vercelIp = req.headers.get('x-real-ip')
  if (vercelIp) return vercelIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || 'unknown'
}

export interface RateLimitResult {
  ok: boolean
  /** Milliseconds until the bucket resets. 0 when `ok` is true. */
  retryAfterMs: number
}

/**
 * Consume one unit against `key`. Expired entries are evicted on write.
 *
 * @param key     Namespaced bucket key, e.g. `magic-link:ip:1.2.3.4`.
 * @param limit   Requests permitted per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)

  if (!existing || now > existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterMs: 0 }
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  return { ok: true, retryAfterMs: 0 }
}

/** Test/diagnostic helper. Not used by request handling. */
export function _resetRateLimits(): void {
  buckets.clear()
  lastSweep = 0
}
