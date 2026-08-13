// Resend transactional email.
//
// RESEND_API_KEY is a Netlify environment variable, referenced the same way the
// Stripe and MailerLite integrations reference theirs. It is deliberately not
// read at module scope, so a missing key fails the one send rather than the
// import.
//
// The sending domain has to be verified in Resend before any of this delivers.
// That is a manual step; see MAINTENANCE.md.

const RESEND_API = 'https://api.resend.com/emails'

/** Verified sender. Override with RESEND_FROM once the domain is set up. */
function fromAddress(): string {
  return process.env.RESEND_FROM || 'Portal Astra <noreply@portalastra.com>'
}

export interface SendResult {
  ok: boolean
  /** Only ever logged server-side, never returned to a browser. */
  detail?: string
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[resend] RESEND_API_KEY is not set')
    return { ok: false, detail: 'missing api key' }
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
    })

    if (!res.ok) {
      // Status only. The body can echo the recipient address back into the
      // function logs.
      console.error(`[resend] send failed: ${res.status}`)
      return { ok: false, detail: `status ${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    console.error('[resend] send threw:', err instanceof Error ? err.message : 'unknown')
    return { ok: false, detail: 'network error' }
  }
}
