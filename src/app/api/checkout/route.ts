import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [
        {
          price: 'price_1Th5W3EzKt7FGdkFCQDVz6BM',
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing?cancelled=true`,
      metadata: {
        product: 'portal_astra_premium',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
