import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
