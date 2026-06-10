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
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_email || session.customer_details?.email

    if (email) {
      // Add to MailerLite Portal Astra - Paid group
      try {
        await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          },
          body: JSON.stringify({
            email,
            groups: ['189884548570416247'],
          }),
        })
      } catch (e) {
        console.error('MailerLite error:', e)
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Future: remove from paid group on cancellation
    console.log('Subscription cancelled:', event.data.object)
  }

  return NextResponse.json({ received: true })
}

// Note: the raw request body is read via request.text() above, which is what
// Stripe signature verification needs. The Pages-Router
// `export const config = { api: { bodyParser: false } }` does not apply in the
// App Router (and is a build error), so it is intentionally omitted.
