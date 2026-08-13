import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PREMIUM_STRIPE_PRICE_ID } from '@/lib/pricing'

export const runtime = 'nodejs'

// Lazily initialise Stripe. `next build` imports this module during page-data
// collection, and a module-level `new Stripe(process.env.STRIPE_SECRET_KEY!)`
// throws "Neither apiKey nor config.authenticator provided" when the secret is
// a runtime-only env var, failing the build. apiVersion is pinned to the
// version the installed stripe SDK (v22) is built for.
let stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return stripe
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://portalastra.com').replace(/\/$/, '')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const raw = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const email = EMAIL_RE.test(raw) ? raw : ''

    // Carrying the email through to the success page lets the banner tell the
    // customer exactly which address unlocks their access, which is the single
    // most common way this flow goes wrong (paying with one address and trying
    // to unlock with another).
    const successParams = new URLSearchParams({ success: 'true' })
    if (email) successParams.set('email', email)

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [
        {
          price: PREMIUM_STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl()}/pricing?${successParams.toString()}`,
      cancel_url: `${siteUrl()}/pricing?cancelled=true`,
      metadata: {
        product: 'portal_astra_premium',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    // Log the real reason, return a fixed string. Stripe error messages can
    // name price ids, account state and other internals.
    console.error('[checkout] session creation failed:', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json(
      { error: 'Checkout is temporarily unavailable. Please try again shortly.' },
      { status: 502 },
    )
  }
}
