# Maintenance

Manual obligations that remain after the hardening run. Everything here is
something a deploy does **not** do for you.

---

## Blocking: required before the premium unlock flow works

These three are hard prerequisites. Until all three are done, a subscriber who
enters their email on the Sky tab or the Calendars page will see the "unlock
link on its way" confirmation and no email will arrive.

### 1. Apply the Supabase migrations

`supabase/migrations/` holds two SQL files. Neither is applied automatically.
Run both in the Supabase SQL editor, or via `supabase db push`:

| File | Table | Used by |
|---|---|---|
| `0001_magic_links.sql` | `portal_astra_magic_links` | premium unlock links |
| `0002_text_cache.sql` | `portal_astra_text_cache` | ritual prompts, simplified APOD copy |

Without `0001`, unlock link creation throws and the flow silently does nothing
(deliberately: the route returns the same response either way so it cannot be
used to test whether an email is a subscriber). Without `0002`, the generated
text caches fall back to in-process memory, which still works but re-pays for
Anthropic calls on every cold start.

The pre-existing `portal_astra_product_cache` table is already live.

### 2. Verify the Resend sending domain

Magic-link emails send from `noreply@portalastra.com` by default (override with
the `RESEND_FROM` env var). Resend will not deliver from a domain it has not
verified.

1. In the Resend dashboard, add `portalastra.com` as a domain.
2. Add the DKIM and SPF records Resend gives you to the DNS for
   `portalastra.com`.
3. Wait for Resend to show the domain as verified.
4. Send one test email to yourself before telling anyone the flow works.

### 3. Set the new environment variables in Netlify

Two variables are new in this run and have no fallback:

- **`RESEND_API_KEY`** — from the Resend dashboard.
- **`PREMIUM_TOKEN_SECRET`** — the HMAC key for the signed entitlement cookie.
  Generate with:
  ```
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
  If this is unset, premium **fails closed**: nobody is granted access and
  `/api/premium/consume` logs the reason. That is intentional.

  Rotating this value immediately signs every visitor out of premium on every
  device. That is the emergency lever if an entitlement is ever abused.

Also confirm `NEXT_PUBLIC_SITE_URL` is set to `https://portalastra.com` (apex,
no www). It is used for canonical URLs, Stripe redirect URLs and the magic-link
URLs inside outgoing email.

See `.env.local.example` for the full list.

---

## Recurring checks

### Spot-check the displayed price against Stripe

`src/lib/pricing.ts` is a **display constant, not a live Stripe read**. Stripe
was not connected during the run that created it, and nothing in the repo
verifies that the displayed figure matches what the Stripe price object
actually charges.

- Displayed: `PREMIUM_PRICE_AMOUNT` = `7.95` AUD/month
- Charged: whatever `PREMIUM_STRIPE_PRICE_ID`
  (`price_1Th5W3EzKt7FGdkFCQDVz6BM`) is set to in Stripe

**Check these against each other periodically, and immediately after any price
change in Stripe.** A mismatch means the site advertises one price and charges
another.

### Verify eclipse dates for 2027 and beyond

`src/lib/shared/astronomy.js` currently covers **2026 only**. On 1 January 2027
the table has no future events: the Moon page's eclipse card silently
disappears and the alert cron sends nothing, while `/pricing` still lists
"Eclipse and supermoon email alerts 7 days prior" as a premium feature.

**Before December 2026**, add verified 2027 and 2028 dates from the NASA
eclipse catalogue at `eclipse.gsfc.nasa.gov`. Do not add a date you have not
checked against a primary source; the table's whole value is that everything in
it is known-good. Tracked as DISC-001 in `audit-new-discoveries.md`.

There is also an unverified `2027-08-02` entry sitting in
`UNVERIFIED_ECLIPSES` in the same file. Verify or delete it during that pass.

### Watch the CSP report-only violations

`next.config.js` ships the Content Security Policy as
`Content-Security-Policy-Report-Only`. It is **not enforcing**. Open the live
site with the browser console visible and click through every page and tab,
watching for `Content-Security-Policy-Report-Only` violation messages.

Once it is quiet, rename the header key in `next.config.js` from
`Content-Security-Policy-Report-Only` to `Content-Security-Policy` to enforce
it. Until then it provides no protection, only telemetry.

### Keep the Amazon query allow-list in sync

`ALLOWED_QUERIES` in `src/app/api/amazon-books/route.ts` and `QUERIES` in
`scripts/refresh-amazon-cache.js` must match. Adding an `<AmazonProductRow>`
with a new `searchQuery` without adding it to both means the route returns a
400 and the row renders nothing.

Find the live set with: `grep -rn "searchQuery=" src/`

### Pinterest token refresh

**Status: unconfirmed.** The audit flagged a Pinterest token refresh as a
possible recurring obligation. What actually exists in the repo is:

- a `p:domain_verify` meta tag in `src/app/layout.tsx`
- static "Pin this" share links on the Moon page, blog posts and in the footer

None of those use an API token, and none of them expire. **No Pinterest API
integration exists in this codebase.** If Samuel is running a Pinterest
automation somewhere outside this repo, that is where the token lives and this
file cannot speak to it. Confirm one way or the other and then either delete
this section or replace it with the real refresh procedure.

---

## Deferred work

### Next.js 14 to 15/16 major upgrade

Deliberately not attempted in the hardening run. `npm audit` still reports high
severity advisories against `next` and its bundled `postcss` and `glob`, and
every one of them requires the major version bump. The non-major patches
(`nanoid`, `js-yaml`, `brace-expansion`) were applied.

Tracked as DISC-005 in `audit-new-discoveries.md`. Treat it as its own task
with its own testing pass, not as a drive-by.

### Privacy policy rewrite

Out of scope for the hardening run: it needs Samuel's ABN and a registered
legal entity name. Only the code-level logging changes were made (server logs no
longer echo subscriber email addresses or full Stripe objects).

---

## Useful commands

```
npm run lint         # eslint via next lint
npm test             # node:test unit tests, no framework dependency
npm run build        # production build
node scripts/lint-copy.js         # report em dashes and banned words in copy
node scripts/lint-copy.js --fix   # rewrite dashes, report banned words
```

`node scripts/lint-copy.js` exits non-zero when it finds anything, so it can be
wired into CI later if the copy stays clean.
