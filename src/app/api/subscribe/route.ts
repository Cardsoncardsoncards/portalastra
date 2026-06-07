import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // TODO: wire up MailerLite — add `email` to the weekly cosmos group.
    // POST https://connect.mailerlite.com/api/subscribers
    //   { email, groups: [process.env.MAILERLITE_GROUP_ID] }
    //   Authorization: Bearer ${process.env.MAILERLITE_API_KEY}
    // For now we just log the capture.
    console.log(`[subscribe] new signup → MailerLite group (pending): ${email}`)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
