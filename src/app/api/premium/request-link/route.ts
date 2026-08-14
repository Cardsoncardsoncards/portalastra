import { NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { getPaidStatus } from '@/lib/mailerlite'
import { createMagicLink, pruneExpiredLinks } from '@/lib/magicLink'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Roughly one request per 5 minutes per key, limited on BOTH axes at once:
// per IP (stops one machine walking a list) and per email address (stops a
// distributed set of machines hammering one victim's inbox).
const LIMIT = 1
const WINDOW_MS = 5 * 60 * 1000

// The single response every well-formed request receives, whether or not the
// email belongs to a subscriber. This is what closes SEC-002: previously
// /api/verify-premium answered "not linked to an active subscription" for
// non-subscribers and unlocked for subscribers, which let anyone test whether
// an arbitrary email address had paid.
//
// The hint about the checkout email is safe to include precisely because it is
// shown to everyone.
const UNIFORM_RESPONSE = {
  ok: true,
  message:
    'If that email has an active subscription, an unlock link is on its way. ' +
    'Use the email address you paid with at checkout, and check your spam folder.',
}

function uniform() {
  return NextResponse.json(UNIFORM_RESPONSE)
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://portalastra.com').replace(/\/$/, '')
}

function linkEmailHTML(link: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#04060f;font-family:'DM Mono','Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#04060f;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 24px 0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.07);">
          <img src="https://www.portalastra.com/images/portalastralogohorizontal.png" alt="Portal Astra" width="220" style="display:block;margin:0 auto 12px;" />
        </td></tr>
        <tr><td style="padding:28px 0 16px 0;">
          <p style="margin:0;font-size:15px;color:rgba(232,224,255,0.85);line-height:1.8;">
            Here is your Astra Premium unlock link. Click it, then confirm on the page that opens, to unlock premium on this device.
          </p>
        </td></tr>
        <tr><td style="padding:0 0 24px 0;text-align:center;">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7B5EA7,#9b8aff);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:14px;letter-spacing:0.06em;">Unlock Astra Premium</a>
        </td></tr>
        <tr><td style="padding:0 0 32px 0;">
          <p style="margin:0;font-size:12px;color:rgba(232,224,255,0.45);line-height:1.7;">
            This link works once and expires in 20 minutes. If you did not request it, you can ignore this email. Nothing has changed on your account.
          </p>
        </td></tr>
        <tr><td style="padding:20px 0 0 0;border-top:1px solid rgba(255,255,255,0.07);text-align:center;">
          <p style="margin:0 0 6px 0;font-size:10px;color:rgba(232,224,255,0.25);">
            <a href="${siteUrl()}" style="color:#9b8aff;text-decoration:none;">portalastra.com</a>
          </p>
          <p style="margin:0;font-size:10px;color:rgba(232,224,255,0.25);">
            Portal Astra is operated by Voxsanity Pty Ltd, ABN 82 700 348 867.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    // Honeypot. Exactly the field name and semantics the homepage subscribe
    // form already uses: a hidden `pa_hp_field` input real users never fill.
    // Silently no-op so bots get no signal that they were caught.
    //
    // `website` is the old name, still read so that bots scraping a cached
    // copy of the previous form are still caught. It was renamed because
    // password managers recognised it and autofilled it with the visitor's
    // email, tripping the honeypot on legitimate submissions.
    const hp = body?.pa_hp_field ?? body?.website
    const honeypot = typeof hp === 'string' ? hp.trim() : ''
    if (honeypot) return uniform()

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, message: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Both limiters are consumed. Checking the IP first means a flood from one
    // machine cannot burn through a victim's per-email budget.
    const byIp = rateLimit(`magic-link:ip:${getClientIp(req)}`, LIMIT, WINDOW_MS)
    const byEmail = rateLimit(`magic-link:email:${email}`, LIMIT, WINDOW_MS)

    if (!byIp.ok || !byEmail.ok) {
      const retryMs = Math.max(byIp.retryAfterMs, byEmail.retryAfterMs)
      return NextResponse.json(
        { ok: false, message: 'A link was requested recently. Please wait a few minutes and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(retryMs / 1000)) } },
      )
    }

    const status = await getPaidStatus(email)

    // "Unavailable" is the one case that is allowed to differ, because it says
    // nothing about the email: it says something about MailerLite. Collapsing
    // it into the uniform response would tell a real subscriber their link is
    // coming when it is not.
    if (status === 'unavailable') {
      return NextResponse.json(
        {
          ok: false,
          unavailable: true,
          message:
            'Subscription checks are temporarily unavailable. This is a problem on our side, not with your account. Please try again shortly.',
        },
        { status: 503 },
      )
    }

    if (status === 'paid') {
      try {
        const token = await createMagicLink(email)
        const link = `${siteUrl()}/api/premium/consume?token=${encodeURIComponent(token)}`
        await sendEmail({
          to: email,
          subject: 'Your Astra Premium unlock link',
          html: linkEmailHTML(link),
          text: `Your Astra Premium unlock link: ${link}\n\nOpen it, then confirm on the page that appears, to unlock premium on this device.\n\nThis link works once and expires in 20 minutes.\n\nPortal Astra is operated by Voxsanity Pty Ltd, ABN 82 700 348 867.`,
        })
        // Fire and forget; a prune failure must not affect the response.
        void pruneExpiredLinks()
      } catch (err) {
        // Log, but still return the uniform response. Any deviation here would
        // reintroduce the oracle: "an error occurred" would mean "subscriber".
        console.error('[request-link] issue failed:', err instanceof Error ? err.message : 'unknown')
      }
    }

    return uniform()
  } catch (err) {
    console.error('[request-link] unexpected error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ ok: false, message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
