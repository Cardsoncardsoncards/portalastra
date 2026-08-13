import { FREE_GROUP_ID, PAID_GROUP_ID } from '@/lib/shared'

// Server-side MailerLite helpers. Nothing here is exposed directly to a
// client: the paid-status answer is deliberately never returned to the browser,
// because "is this email a subscriber" is the enumeration oracle that SEC-002
// was about.

const API = 'https://connect.mailerlite.com/api'

export type PaidStatus =
  /** MailerLite answered and the email is in the Paid group. */
  | 'paid'
  /** MailerLite answered and the email is not in the Paid group (or unknown). */
  | 'not_paid'
  /** MailerLite could not be reached or errored. Status is unknown. */
  | 'unavailable'

/**
 * Whether `email` holds an active Astra Premium subscription.
 *
 * The three-way return matters: "unavailable" is not "not_paid". Collapsing
 * them shows a real subscriber a flat denial whenever MailerLite has a bad
 * minute, which reads as "your subscription was cancelled".
 */
export async function getPaidStatus(email: string): Promise<PaidStatus> {
  const apiKey = process.env.MAILERLITE_API_KEY
  if (!apiKey) {
    console.error('[mailerlite] MAILERLITE_API_KEY is not set')
    return 'unavailable'
  }

  let res: Response
  try {
    res = await fetch(`${API}/subscribers/${encodeURIComponent(email)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    console.error('[mailerlite] subscriber lookup threw:', err instanceof Error ? err.message : 'unknown')
    return 'unavailable'
  }

  // A 404 is a definitive "no such subscriber", not an outage.
  if (res.status === 404) return 'not_paid'

  if (!res.ok) {
    console.error(`[mailerlite] subscriber lookup failed: ${res.status}`)
    return 'unavailable'
  }

  try {
    const data = await res.json()
    const groups: Array<{ id?: string | number }> = data?.data?.groups || []
    return groups.some((g) => String(g.id) === PAID_GROUP_ID) ? 'paid' : 'not_paid'
  } catch {
    return 'unavailable'
  }
}

/**
 * Remove `email` from the Paid group, leaving Free membership intact.
 * Used when a subscription is cancelled or a charge is refunded.
 */
export async function removeFromPaidGroup(email: string): Promise<boolean> {
  const apiKey = process.env.MAILERLITE_API_KEY
  if (!apiKey) {
    console.error('[mailerlite] MAILERLITE_API_KEY is not set')
    return false
  }

  try {
    // MailerLite's group-detach endpoint takes the subscriber id, so look the
    // subscriber up first.
    const lookup = await fetch(`${API}/subscribers/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    })

    if (!lookup.ok) {
      console.error(`[mailerlite] cannot resolve subscriber to detach: ${lookup.status}`)
      return false
    }

    const subscriberId = (await lookup.json())?.data?.id
    if (!subscriberId) return false

    const res = await fetch(
      `${API}/subscribers/${encodeURIComponent(String(subscriberId))}/groups/${PAID_GROUP_ID}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      },
    )

    if (!res.ok) {
      console.error(`[mailerlite] detach from paid group failed: ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[mailerlite] detach threw:', err instanceof Error ? err.message : 'unknown')
    return false
  }
}

export { FREE_GROUP_ID, PAID_GROUP_ID }
