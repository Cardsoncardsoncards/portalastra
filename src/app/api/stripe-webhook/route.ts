import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { FREE_GROUP_ID, PAID_GROUP_ID } from '@/lib/shared'
import { removeFromPaidGroup } from '@/lib/mailerlite'

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
      // Add to BOTH MailerLite groups. Paid unlocks the premium emails; Free is
      // what the weekly digest actually sends to, and the digest is listed as
      // included in the subscription. A customer who paid without subscribing
      // to the newsletter first was previously never sent it.
      // A failure here means a paying customer never lands in the group, so it
      // must not be swallowed: return a non-2xx and let Stripe's automatic
      // retry schedule take over. Detail is logged server-side only.
      try {
        const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          },
          body: JSON.stringify({
            email,
            groups: [PAID_GROUP_ID, FREE_GROUP_ID],
          }),
        })

        if (!res.ok) {
          console.error(`[stripe-webhook] MailerLite subscribe failed: ${res.status}`)
          return NextResponse.json(
            { error: 'Downstream provider error' },
            { status: 502 }
          )
        }
      } catch (e) {
        console.error(
          '[stripe-webhook] MailerLite request threw:',
          e instanceof Error ? e.message : 'unknown error'
        )
        return NextResponse.json(
          { error: 'Downstream provider error' },
          { status: 502 }
        )
      }
    }
  }

  // Access revocation. Both of these used to be either a no-op or absent
  // entirely, so a cancelled or refunded customer stayed in the Paid group and
  // kept receiving premium email indefinitely.
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    // Log the object id only. The full subscription object contains customer
    // identifiers and is not something to leave sitting in function logs.
    console.log(`[stripe-webhook] subscription deleted: ${subscription.id}`)

    const email = await emailForCustomer(subscription.customer)
    if (email) {
      const removed = await removeFromPaidGroup(email)
      if (!removed) {
        console.error(`[stripe-webhook] could not revoke paid access for subscription ${subscription.id}`)
        return NextResponse.json({ error: 'Downstream provider error' }, { status: 502 })
      }
    } else {
      console.error(`[stripe-webhook] no email resolved for subscription ${subscription.id}`)
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    console.log(`[stripe-webhook] charge refunded: ${charge.id}`)

    const email = charge.billing_details?.email || (await emailForCustomer(charge.customer))
    if (email) {
      const removed = await removeFromPaidGroup(email)
      if (!removed) {
        console.error(`[stripe-webhook] could not revoke paid access for charge ${charge.id}`)
        return NextResponse.json({ error: 'Downstream provider error' }, { status: 502 })
      }
    } else {
      console.error(`[stripe-webhook] no email resolved for charge ${charge.id}`)
    }
  }

  return NextResponse.json({ received: true })
}

/**
 * Resolve a Stripe customer reference to an email address.
 *
 * Subscription and charge events carry a customer id rather than an email, so
 * this expands it. Deleted customers have no email; that is not an error.
 */
async function emailForCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  if (!customer) return null

  if (typeof customer !== 'string') {
    return 'deleted' in customer && customer.deleted ? null : (customer as Stripe.Customer).email ?? null
  }

  try {
    const fetched = await getStripe().customers.retrieve(customer)
    if ('deleted' in fetched && fetched.deleted) return null
    return (fetched as Stripe.Customer).email ?? null
  } catch (err) {
    console.error('[stripe-webhook] customer lookup failed:', err instanceof Error ? err.message : 'unknown')
    return null
  }
}

// Note: the raw request body is read via request.text() above, which is what
// Stripe signature verification needs. The Pages-Router
// `export const config = { api: { bodyParser: false } }` does not apply in the
// App Router (and is a build error), so it is intentionally omitted.
