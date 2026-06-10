import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Simple in-memory rate limiting: max 3 submissions per IP per 60 minutes.
// Best-effort only (per server instance, resets on cold start), but enough to
// blunt automated abuse of the subscribe endpoint.
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    // Honeypot: real users never fill this hidden field. If it's populated,
    // silently accept (so bots get no signal) but do not subscribe.
    const honeypot = typeof body?.website === 'string' ? body.website.trim() : ''
    if (honeypot) {
      return NextResponse.json({ ok: true })
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Rate limit per IP before doing any MailerLite work.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const now = Date.now()
    const entry = rateLimitMap.get(ip)
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    } else if (entry.count >= RATE_LIMIT) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    } else {
      entry.count += 1
    }

    const apiKey = process.env.MAILERLITE_API_KEY
    const groupId = process.env.MAILERLITE_GROUP_ID

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
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[subscribe] MailerLite error ${res.status}: ${detail}`)
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
