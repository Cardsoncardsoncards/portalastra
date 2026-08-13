# New Discoveries

Findings surfaced during the implementation run that were **not** part of the original
65-finding audit. Format matches the audit: ID, Title, Fact, Attack or failure scenario,
Impact, Recommendation, Verification.

---

## DISC-001: No verified eclipse data exists beyond 2026

**Fact.** The verified eclipse table added in `src/lib/shared/astronomy.js`
covers four NASA/USNO-sourced 2026 dates. The only pre-existing 2027 entry
(`2027-08-02`, Total Solar Eclipse) was carried in the Moon page array with no
provenance, alongside a `2026-02-06` entry that turned out to be wrong by
eleven days. It has been moved to an explicitly named `UNVERIFIED_ECLIPSES`
constant and is neither displayed nor alerted on.

**Failure scenario.** On 1 January 2027 the table is empty of future events.
The Moon page's "Upcoming Events" carousel silently drops its eclipse card, and
`check-eclipse-alerts.js` runs daily for a year and sends zero eclipse alerts,
while `/pricing` continues to list "Eclipse and supermoon email alerts 7 days
prior" as a premium feature. Nothing errors, so nothing surfaces the gap.

**Impact.** Medium. A silently-degrading paid feature, on a known deadline.

**Recommendation.** Before December 2026, add verified 2027 and 2028 eclipse
dates from the NASA eclipse catalogue (`eclipse.gsfc.nasa.gov`) to
`ECLIPSES` in `src/lib/shared/astronomy.js`. Consider adding a build-time or
test-time assertion that the table contains at least one date more than 90 days
in the future, so the gap fails loudly instead of quietly.

**Verification.** `ECLIPSES.filter(e => e.date > '2026-12-31')` returns `[]`.

---

## DISC-002: The alert script and the Moon page used different orbital epochs

**Fact.** `scripts/check-eclipse-alerts.js` defined its own orbital constants:
reference new moon at `Date.UTC(2000, 0, 6)` (midnight) and reference perigee at
`Date.UTC(2000, 0, 4)`. `MoonClient.tsx`, now `src/lib/shared/moon.js`, uses
`Date.UTC(2000, 0, 6, 18, 14)` and `Date.UTC(2024, 0, 13)`. The mean-motion
approximations drift apart over 24 years of elapsed time.

**Failure scenario.** Running the two supermoon models over 2026 with the old
constants produced supermoons on 2026-05-01, 2026-05-30 and 2026-06-29. With the
shared constants they fall on 2026-10-26, 2026-11-24 and 2026-12-24, which is
the correct late-year 2026 supermoon season. A subscriber would have received a
premium "Supermoon in 7 days" email in May pointing at an ordinary full moon,
while the Moon page's own "Next Supermoon" card showed a different date.

**Impact.** Medium. Premium subscribers get a wrong date, in an email they paid
for, contradicted by the site itself.

**Recommendation.** Fixed in this run: the script now imports `SYNODIC_MONTH`,
`KNOWN_NEW_MOON`, `ANOMALISTIC_MONTH` and `KNOWN_PERIGEE` from
`@/lib/shared` rather than restating them. No orbital constant should be
declared outside `src/lib/shared/moon.js`.

**Verification.** Offline sweep of every daily run across 2026 now yields
supermoon alerts on 2026-10-19, 2026-11-17 and 2026-12-17 (7 days ahead of
each), matching the real 2026 supermoon season.

---

## DISC-003: The lunar distance approximation overstates apogee by ~6,800 km

**Fact.** The anomalistic distance function promoted from `MoonClient.tsx:49-53`
into `src/lib/shared/moon.js` is `385000 - 28500 * cos(...)`, which spans
356,501 km to 413,499 km. Real lunar perigee and apogee are approximately
356,500 km and 406,700 km. Perigee is essentially exact; apogee overshoots by
about 6,800 km, roughly 1.7%.

The mean and amplitude that reproduce the real range are 381,600 ± 25,100 —
which are, notably, the exact constants the **old** `phaseDistanceKm` function
used. That function had the right magnitudes applied to the wrong cycle (the
29.53-day synodic cycle instead of the 27.55-day anomalistic one), so it made
distance a function of moon phase, which is why it was replaced.

**Failure scenario.** Around apogee, the Moon page's "Distance" card reads about
413,000 km. A reader checking against any almanac sees roughly 406,000 km. On a
site whose stated positioning is "where science meets the stars", a visibly
wrong astronomical figure is the kind of thing that costs credibility.

**Impact.** Low. Cosmetic accuracy on one data card. Nothing depends on the
value; the supermoon threshold check (`< 360000`) sits near perigee where the
approximation is accurate.

**Recommendation.** Change `getMoonDistanceKm` in `src/lib/shared/moon.js` to
`381600 - 25100 * cos((p / ANOMALISTIC_MONTH) * 2 * Math.PI)`. **Not done in
this run**: Section 2 instructed promoting the existing anomalistic function
as-is, and quietly changing its constants would be a different change from the
one that was asked for. It is a one-line edit with a test already in place.

**Verification.** `node -e "const s=require('./src/lib/shared'); ..."` sweeping
400 days reports `anomalistic range: 356501 - 413499`. The test
`moon distance: tracks the anomalistic cycle` in `tests/shared.test.js` asserts
the current envelope and carries a comment pointing here.

---

## DISC-004: The weekly tarot spread rolled over on Thursday, not Sunday

**Fact.** `weekKey()` bucketed dates with `Math.floor(dayNum / 7)`, where
`dayNum` is days since the Unix epoch. 1 January 1970 was a **Thursday**, so
every bucket boundary fell on a Thursday. The weekly digest is generated and
scheduled for a **Sunday**.

**Failure scenario.** The Sunday digest goes out quoting "this week's tarot".
The following Thursday, four days into the email's stated week, the site's
weekly spread silently changes to a different set of three cards. A subscriber
who clicks the email's "Draw your full reading" link any time from Thursday
onward sees a card that does not match the one they were just emailed. This
directly defeats the Section 2 goal of the email and the site agreeing by
construction: sharing the draw function is not enough if the two disagree about
when a week starts.

Confirmed concretely: `getWeeklySpread('2026-08-12').present` was
`The Fool` and `getWeeklySpread('2026-08-13').present` was `Three of Wands`,
across a Wednesday-to-Thursday boundary.

**Impact.** Medium. It silently undermined the fix that Section 2 was for, and
it is the kind of inconsistency a reader notices and a developer does not.

**Recommendation.** Fixed in this run: `weekKey` now uses
`Math.floor((dayNum + 4) / 7)`, moving the boundary to Sunday (1970-01-04,
`dayNum` 3, was a Sunday). Nothing depends on the historical card sequence, so
the reseeding has no downstream effect.

**Verification.** New test `tarot: week buckets roll over on Sunday, matching
the digest send day` walks 120 consecutive days and asserts that the spread only
ever changes on a day whose `getUTCDay()` is 0. Passing.

---

## DISC-005: Next.js 14 to 15/16 upgrade is required to clear the remaining advisories

**Fact.** `npm audit` reports 5 remaining high severity advisories after the
non-major patches were applied. All of them resolve only via the Next.js major
version bump:

| Package | Why it is stuck |
|---|---|
| `next` (14.2.35) | ~18 advisories: cache poisoning, SSRF via rewrites and WebSocket upgrades, request smuggling, XSS with CSP nonces, several DoS vectors |
| `postcss` | transitively pinned by `next` |
| `glob` | transitively pinned by `eslint-config-next` |

`npm audit fix --force` would install `next@16.3.0` and
`eslint-config-next@16.3.0`, both breaking changes.

Patched successfully in this run, no major bump needed: `nanoid` 3.3.16 →
3.3.18, `js-yaml` 4.3.0 → 4.3.1, `brace-expansion` → 1.1.18.

**Failure scenario.** Several of the outstanding Next.js advisories are
remotely reachable on a public site. The cache-poisoning ones are the most
relevant here: Portal Astra serves NASA-backed routes with
`stale-while-revalidate=86400`, so a poisoned entry would persist for a day.

**Impact.** High severity by CVSS, but mitigated in practice: the app has no
custom server, no middleware, no Server Actions, and no `next/image`
optimization on user-supplied URLs, which is where most of these advisories
land.

**Recommendation.** Schedule the Next.js 14 → 16 upgrade as its own task with
its own testing pass. It touches the App Router's async request APIs
(`params`, `searchParams`, `cookies()` and `headers()` all became async in 15),
which affects `blog/[slug]/page.tsx`, every route handler added in this run, and
the `Suspense`-wrapped `useSearchParams` consumers. Not a drive-by change, which
is why it was explicitly left out of this run.

**Verification.** `npm audit` after `npm audit fix`: "5 high severity
vulnerabilities ... To address all issues (including breaking changes), run
npm audit fix --force. Will install next@16.3.0, which is a breaking change."

---

## DISC-006: The Pinterest token refresh obligation appears not to exist

**Fact.** The audit listed a recurring Pinterest token refresh as a manual
maintenance obligation. Searching the repository for any Pinterest integration
turns up only:

- a static `p:domain_verify` meta tag in `src/app/layout.tsx`
- hardcoded `pinterest.com/pin/create/button/` share links in `MoonClient.tsx`,
  `Footer.tsx`, `page.tsx` and the blog post template

None of those authenticate. None involve an API token. There is no Pinterest
API client, no `PINTEREST_*` environment variable referenced anywhere in
`src/` or `scripts/`, and no scheduled job that touches Pinterest.

**Failure scenario.** The inverse of the usual one: a maintenance burden gets
documented, diarised and periodically worried about when there is nothing
behind it. Or, worse, a real integration exists **outside this repository** and
documenting it here as "handled" hides that.

**Impact.** Low, but worth resolving because it is cheap to resolve and
currently costs attention every time the maintenance list is read.

**Recommendation.** Samuel to confirm whether any Pinterest automation exists
outside this repo. If yes, document where the token lives and how it is
refreshed. If no, delete the Pinterest section from MAINTENANCE.md. It is
currently written up as explicitly unconfirmed rather than as a real task.

**Verification.** `grep -rin "pinterest" src/ scripts/` returns only static
share URLs and the domain-verify meta tag.

---

## DISC-007: `npm run lint` had never run, because ESLint was never configured

**Fact.** `package.json` has had a `"lint": "next lint"` script since the
project was created, but the repository contained no `.eslintrc*` file. With no
config present, `next lint` does not lint: it drops into an **interactive
setup wizard** ("How would you like to configure ESLint? Strict / Base /
Cancel") and waits on stdin.

**Failure scenario.** Anyone running `npm run lint` locally sees a prompt, not a
result. In a non-interactive context (CI, a pre-commit hook, an agent) the
command hangs until it is killed or reads EOF and fails with an error that looks
like a tooling problem rather than a missing config. The practical effect is
that the project has shipped with **zero lint coverage for its entire life**,
while appearing to have a lint step.

The moment a config was added, four genuine pre-existing `react/no-unescaped-entities`
errors surfaced immediately, in `IntentionGuides.tsx:295` and
`PlantingCalendar.tsx:323` (raw `"` characters in JSX text). Both were live on
the site.

This also would have silently broken the new CI workflow added in Section 7,
which runs `npm run lint` on every push.

**Impact.** Medium. Not a runtime bug in itself, but it disabled a whole class
of checks, and it is the kind of gap that stays invisible precisely because the
script exists and nobody reads its output closely.

**Recommendation.** Fixed in this run: added `.eslintrc.json` extending
`next/core-web-vitals`, with `scripts/` and `tests/` ignored (both are plain
CommonJS Node, not Next.js code). The four surfaced errors were fixed
(`&ldquo;` / `&rdquo;`), plus one `react-hooks/exhaustive-deps` warning in
`page.tsx` that the same pass revealed.

**Verification.** `npm run lint` now exits 0 with only pre-existing
`@next/next/no-img-element` warnings (4, all in `page.tsx`, all deliberate:
these are NASA and Amazon remote images, and `next/image` optimisation on them
would incur provider cost).
