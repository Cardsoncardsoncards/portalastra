// Single source of truth for the displayed Astra Premium price.
//
// The pricing page card and the checkout button copy previously each carried
// their own hardcoded figure, so nothing stopped one being edited without the
// other. They now both read from here.
//
// IMPORTANT: this is a display constant, not a live read. Stripe is the system
// that actually charges, and the amount charged is set by the price object
// `PREMIUM_STRIPE_PRICE_ID` points at. Nothing in this repo verifies the two
// agree. Spot-check them against the Stripe dashboard periodically, and after
// any price change in Stripe.

/** The real, charged price. */
export const PREMIUM_PRICE_AMOUNT = '7.95'

/** Comparison price, shown struck through. Not charged. */
export const PREMIUM_PRICE_COMPARE_AT = '9.95'

export const PREMIUM_PRICE_CURRENCY = 'AUD'
export const PREMIUM_PRICE_SYMBOL = 'A$'
export const PREMIUM_PRICE_INTERVAL = 'month'

/** e.g. "AUD $7.95" — the large figure on the pricing card. */
export const PREMIUM_PRICE_DISPLAY = `${PREMIUM_PRICE_CURRENCY} $${PREMIUM_PRICE_AMOUNT}`

/** e.g. "A$7.95/mo" — the compact form used in button copy. */
export const PREMIUM_PRICE_SHORT = `${PREMIUM_PRICE_SYMBOL}${PREMIUM_PRICE_AMOUNT}/mo`

/** The Stripe price the checkout session is created against. */
export const PREMIUM_STRIPE_PRICE_ID = 'price_1Th5W3EzKt7FGdkFCQDVz6BM'
