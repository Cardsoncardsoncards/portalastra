'use strict'

// MailerLite group IDs, in one place.
//
// These two literals were previously hardcoded in five separate spots
// (the Stripe webhook, /api/verify-premium, the weekly digest, the monthly
// forecast and the eclipse alert script). Changing a group in MailerLite meant
// finding all five.

/** Portal Astra - Free. Everyone who subscribes to the newsletter. */
const FREE_GROUP_ID = '189583616610666425'

/** Portal Astra - Paid. Active Astra Premium subscribers. */
const PAID_GROUP_ID = '189884548570416247'

module.exports = {
  FREE_GROUP_ID,
  PAID_GROUP_ID,
}
