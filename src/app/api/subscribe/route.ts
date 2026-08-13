import { NextResponse } from 'next/server'
import { FREE_GROUP_ID } from '@/lib/shared'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Signup origins the site actually sends. Anything else is recorded as a plain
// newsletter signup rather than trusted.
const ALLOWED_SOURCES = new Set(['newsletter', 'planting-waitlist'])

// Max 3 submissions per client IP per 60 minutes, via the shared limiter.
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    // The planting waitlist form in CalendarsClient has always sent
    // `source: 'planting-waitlist'`, and this route has always thrown it away,
    // so waitlist signups landed in MailerLite indistinguishable from ordinary
    // newsletter signups. Allow-listed rather than passed through, so an
    // arbitrary caller cannot write arbitrary fields onto a subscriber record.
    const rawSource = typeof body?.source === 'string' ? body.source.trim() : ''
    const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'newsletter'

    // Honeypot: real users never fill this hidden field. If it's populated,
    // silently accept (so bots get no signal) but do not subscribe.
    const honeypot = typeof body?.website === 'string' ? body.website.trim() : ''
    if (honeypot) {
      return NextResponse.json({ ok: true })
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Rate limit per platform-provided client IP before doing any MailerLite work.
    const limited = rateLimit(`subscribe:ip:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } },
      )
    }

    const apiKey = process.env.MAILERLITE_API_KEY
    const groupId = process.env.MAILERLITE_GROUP_ID || FREE_GROUP_ID

    if (!apiKey) {
      console.error('[subscribe] MAILERLITE_API_KEY is not set')
      return NextResponse.json({ error: 'Subscriptions are temporarily unavailable.' }, { status: 503 })
    }

    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        ...(groupId ? { groups: [groupId] } : {}),
        // Segmentable in MailerLite: `signup_source` distinguishes a planting
        // waitlist signup from a newsletter signup.
        fields: { signup_source: source },
      }),
    })

    if (!res.ok) {
      // Status code only. MailerLite's error body quotes the submitted address
      // back at you (`"email": "..." is invalid`), which would write every
      // failed signup's email address into the function logs, where it is
      // retained and readable by anyone with dashboard access.
      console.error(`[subscribe] MailerLite error ${res.status}`)
      // 422 from MailerLite typically means the email already exists / is invalid.
      const msg =
        res.status === 422
          ? "That email couldn't be added — it may already be subscribed."
          : 'Could not complete your subscription. Please try again later.'
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('[subscribe] unexpected error:', message)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
