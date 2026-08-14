# Portal Astra — Full-Spectrum Read-Only Audit

**Repo path used:** `C:\Users\sgyim\Projects\PortalAstra`
(Remote: `https://github.com/Cardsoncardsoncards/portalastra.git`.)

**Step 0 — commit hash:** `a9a8ea8c92cd54d581a0061b55fa4b242340e515`
`git pull` → *Already up to date.* Branch `main`, tracking `origin/main`, working tree clean.
Commit date 2026-08-05 22:24:48 +1000 — *"chore: remove duplicate instructions file and mis-named .png.png images"*.

**Step 0.5 — secrets present in `.env.local`:**

| Key | Present in `.env.local`? |
|---|---|
| `STRIPE_SECRET_KEY` | **NO** |
| `MAILERLITE_API_KEY` | **NO** |

`.env.local` contains only `NASA_API_KEY` and `NEXT_PUBLIC_SITE_URL`. `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, `AMAZON_ASSOCIATE_TAG` and `MAILERLITE_GROUP_ID` are also absent locally. No values were read or printed, and no live Stripe/MailerLite/Anthropic/Amazon call was made from this session. All numeric verification below was done by re-implementing the repo's own pure functions in a scratch file outside the repo and running them offline.

**Audit date:** 13 August 2026. Nothing in the repo was edited, committed, pushed or installed.

**Note on scope vs. the brief:** two features named in the brief do not exist in this codebase — a **Stars tab birth forecast** (there is no paid AI birth forecast anywhere; see AI-008) and **Pinterest pin descriptions / a Pinterest API token** (only static share links and a `p:domain_verify` meta tag exist; there is no Pinterest API integration and therefore no token refresh step in this repo). Findings are recorded for both.

---

## Section AI: AI Output & Prompt Integrity

There are **five** places Claude generates content:

| Surface | File | Model | Trigger |
|---|---|---|---|
| APOD simplification | `src/app/api/apod-simple/route.ts` | `claude-haiku-4-5-20251001` | every homepage load |
| Daily ritual prompt (premium) | `src/app/api/ritual-prompt/route.ts` | `claude-haiku-4-5-20251001` | Sky tab, premium users |
| Weekly cosmic digest email | `scripts/generate-weekly-digest.js` | `claude-sonnet-4-5` | GH Actions cron, Sundays |
| Monthly cosmic forecast email | `scripts/generate-monthly-forecast.js` | `claude-haiku-4-5-20251001` | GH Actions cron, 1st of month |
| Eclipse/supermoon alert email | `scripts/check-eclipse-alerts.js` | `claude-haiku-4-5-20251001` | GH Actions cron, daily |

Horoscope readings are **not** AI-generated — `src/app/api/horoscope/route.ts:54` calls `horoscope-app-api.vercel.app` with a static per-sign fallback table. Tarot is fully deterministic (`src/lib/tarot.ts`). Both are correctly excluded from AI risk but introduce a third-party dependency (see UX-006).

---

- **ID:** AI-001
- **Title:** No AI output is validated for banned words, em dashes or en dashes before reaching a user or an email
- **Fact:** Every generator states the style rules *inside the prompt only* and ships whatever comes back. `src/app/api/ritual-prompt/route.ts:29` ("No em dashes. No \"eternal\", \"forever\", \"tapestry\", or \"dance\"."), `src/app/api/apod-simple/route.ts:35`, `scripts/generate-weekly-digest.js:234-236`, `scripts/generate-monthly-forecast.js:176-177`, `scripts/check-eclipse-alerts.js:136-138`. In every case the response is used directly: `ritual-prompt/route.ts:40` (`const prompt = aiData.content?.[0]?.text?.trim() || ''`), `apod-simple/route.ts:60`, `generate-weekly-digest.js:294-313` (`parseEmail`), `generate-monthly-forecast.js:232-238`, `check-eclipse-alerts.js:166-172`. There is no regex, no `includes()` check, no rejection path, and no retry-on-violation anywhere in the repo.
- **Control status:** **Confirmed absent.** Grep for banned words and dashes across `src/` and `scripts/` returns only prompt text and the site's own hardcoded copy — no validator.
- **Attack or failure scenario:** Not an attack — a reliability failure. Haiku ignores a negative constraint on some fraction of calls (negative instructions are the least reliably followed kind). A single violating generation goes straight into a scheduled MailerLite campaign to the whole list with no human in the loop. Blog posts get manual QA; these five surfaces get none.
- **Impact:** Brand-voice drift in the highest-visibility channel (email to paying subscribers). Unlike a blog post, a sent campaign cannot be edited. Compounded by AI-010: unescaped output means a violation can be a rendering fault, not just a stylistic one.
- **Recommendation:** Add one shared `validateAIOutput(text)` helper (used by all five call sites) that rejects `—`, `–`, and `/\b(eternal|forever|infinite|tapestry|dance)\b/i` — word-boundary anchored, because a naive substring check false-positives on *guidance*, *avoidance*, *abundance* (11 such false hits exist in `src/lib/posts.ts`). On failure: retry once, then fall back to static copy for the web routes and **abort the campaign** for the email scripts.
- **Verification / pass criterion:** Feed the validator a fixture string containing an em dash and one containing "guidance". First must fail, second must pass. Then confirm no campaign is created when the validator rejects twice.

---

- **ID:** AI-002
- **Title:** NASA APOD text is interpolated into two Claude prompts with no sanitisation or length bound
- **Fact:** `src/app/api/apod-simple/route.ts:37` — `Original: ${apod.explanation}` — the full, unbounded NASA explanation string is appended to the prompt. `scripts/generate-weekly-digest.js:210` does the same, truncated to 300 chars. Neither delimits the untrusted text, escapes it, or bounds it.
- **Control status:** **Confirmed.** No sanitisation between `nasaFetch` (`src/lib/nasa.ts:16`) and the prompt string.
- **Attack or failure scenario:** NASA APOD explanations are human-authored prose published daily by a third party. A prompt-injection string would have to appear in NASA's own feed, so the realistic risk is low but non-zero. The *probable* failure is cost and truncation: APOD explanations regularly exceed 2,000 characters, and `apod-simple` sets `max_tokens: 200` — a long input plus a low output cap produces a truncated mid-sentence "simplification" that is then cached for the rest of the UTC day (`apod-simple/route.ts:62`).
- **Impact:** Low security impact; moderate quality impact. A truncated simplification is the *default* text shown on the Space tab (`src/app/page.tsx:570`) — the full NASA text is behind a "Show original" toggle.
- **Recommendation:** Wrap the interpolated text in explicit delimiters with an instruction not to follow instructions inside them, and cap it: `apod.explanation.slice(0, 1200)`. Detect `stop_reason === 'max_tokens'` in the response and fall back to `apod.explanation` rather than caching a truncated string.
- **Verification / pass criterion:** Call `/api/apod-simple` on a day with a >2,000-character APOD explanation and confirm the returned `simple` ends in a full stop.

---

- **ID:** AI-003
- **Title:** `/api/ritual-prompt` interpolates an unauthenticated, unvalidated client query parameter directly into a paid Claude prompt
- **Fact:** `src/app/api/ritual-prompt/route.ts:10` — `const phase = searchParams.get('phase') || 'Full Moon'` — then line 29 interpolates it raw: `` `Write a single daily ritual prompt for someone experiencing the ${phase} moon phase. ...` ``. There is no allow-list against the eight known phase names, no length limit, no authentication, and no rate limit. The route is `export const dynamic = 'force-dynamic'` (line 3), so every request reaches Anthropic unless the single-slot cache happens to match.
- **Control status:** **Confirmed.** The only caller passes a real phase name (`src/app/page.tsx:351`), but the route is publicly reachable and the parameter is unconstrained.
- **Attack or failure scenario:** `GET /api/ritual-prompt?phase=<arbitrary text>` executes an attacker-authored prompt on the site's Anthropic key. Because `phase` is also the cache key (line 13), each distinct value forces a fresh paid API call. A trivial loop over random `phase` values bills the Anthropic account at request rate with no ceiling — and, per AI-005, simultaneously evicts the legitimate cache entry so real premium users also pay full price on every load.
- **Impact:** Direct, uncapped financial loss on a metered API. Secondary: the endpoint is a free arbitrary-prompt LLM proxy for anyone who finds it — the response body is returned verbatim to the caller.
- **Recommendation:** Validate against a `Set` of the eight phase names exactly as `/api/horoscope` already does for zodiac signs (`src/app/api/horoscope/route.ts:5-8,40-42`) — return 400 otherwise. Add per-IP rate limiting. Consider gating the route on a server-verified premium check rather than serving it to anyone.
- **Verification / pass criterion:** `GET /api/ritual-prompt?phase=ignore%20all%20previous%20instructions` returns HTTP 400 and makes no Anthropic call.

---

- **ID:** AI-004
- **Title:** A failed Claude call on the premium ritual prompt leaves the paying user staring at a loading skeleton forever
- **Fact:** `src/app/api/ritual-prompt/route.ts:35-46` returns `{ prompt: '' }` on both an API error and an exception. The client at `src/app/page.tsx:353` only sets state when the string is truthy: `.then(d => { if (d.prompt) setRitualPrompt(d.prompt) })`. `ritualPrompt` therefore stays `''`, and the render at `src/app/page.tsx:876-882` falls to the `else` branch: `<div className={styles.skeleton} style={{ height: '48px' }} />`.
- **Control status:** **Confirmed.** No error state, no retry button, no fallback text exists for this component.
- **Attack or failure scenario:** Anthropic returns 429/500, or `ANTHROPIC_API_KEY` is unset in the Netlify environment (it is absent from `.env.local`). Every premium user on the Sky tab sees a permanently animating grey box under the heading "Today's Ritual Prompt".
- **Impact:** The single headline premium feature — the pricing page CTA is literally *"Unlock daily ritual prompts — Astra Premium"* (`src/app/page.tsx:858`) — silently renders as a broken placeholder with no explanation. This is the worst possible failure mode for a paid feature: indistinguishable from an unfinished build.
- **Recommendation:** Return a static per-phase fallback prompt exactly as `/api/horoscope` does with `FALLBACK_READINGS` (`src/app/api/horoscope/route.ts:12-25`), flagged `fallback: true`. On the client, render an explicit "temporarily unavailable, try again" state with a retry control instead of an indefinite skeleton.
- **Verification / pass criterion:** Unset `ANTHROPIC_API_KEY` locally, load the Sky tab as a premium user, and confirm readable text (not a skeleton) appears.

---

- **ID:** AI-005
- **Title:** The ritual-prompt cache is a single-slot module variable, so it thrashes and can be evicted by any visitor
- **Fact:** `src/app/api/ritual-prompt/route.ts:5` — `let ritualCache: { date: string; phase: string; prompt: string } | null = null` — one object, not a map. Line 13 only serves it when both `date` **and** `phase` match; line 41 unconditionally overwrites it.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** (a) Any request with a different `phase` value overwrites the cached entry, so the next legitimate request pays for a fresh generation. (b) On Netlify's serverless runtime the variable lives per function instance and is destroyed on cold start, so even without abuse the "once per day" guarantee in the code's own comment does not hold. `apod-simple` has the identical single-slot pattern (`src/app/api/apod-simple/route.ts:16`).
- **Impact:** Anthropic spend scales with traffic and instance churn rather than with days, contradicting the stated design intent. At current traffic (17 sessions/28 days) the absolute cost is negligible; the exposure is that there is no ceiling if traffic or abuse grows.
- **Recommendation:** Move both caches to the Supabase table already used for the Amazon cache (`portal_astra_product_cache` pattern, `src/app/api/amazon-books/route.ts:118-141`) or any shared store, keyed by `date + phase`. Combined with AI-003's allow-list, the key space becomes at most 8 entries per day.
- **Verification / pass criterion:** Two requests for the same phase from two different function instances produce one Anthropic call, not two.

---

- **ID:** AI-006
- **Title:** No paid AI route has any rate limit; the only rate limiter in the codebase is on the free subscribe form
- **Fact:** `src/app/api/subscribe/route.ts:8-10,28-38` implements a 3-per-IP-per-hour in-memory limiter. No equivalent exists in `src/app/api/ritual-prompt/route.ts`, `src/app/api/apod-simple/route.ts`, `src/app/api/amazon-books/route.ts`, `src/app/api/checkout/route.ts`, `src/app/api/verify-premium/route.ts`, `src/app/api/horoscope/route.ts`, or any NASA route.
- **Control status:** **Confirmed absent.** The protection is inverted relative to cost: the free MailerLite call is limited, the metered Anthropic and Amazon calls are not.
- **Attack or failure scenario:** Unauthenticated flood of `/api/ritual-prompt` (Anthropic, per-call cost), `/api/apod-simple` (Anthropic + NASA), or `/api/amazon-books` with varying `q` (Amazon Creators API + a Supabase write per unique key, see SEC-009).
- **Impact:** Uncapped third-party API spend and a Supabase table that grows one row per attacker-chosen query string.
- **Recommendation:** Extract the subscribe limiter into `src/lib/rateLimit.ts` and apply it to every route that costs money per call, with tighter windows for the Anthropic routes. Note the limiter's own weaknesses first (SEC-011, SEC-012).
- **Verification / pass criterion:** 20 rapid requests to `/api/ritual-prompt` from one IP return 429 after the configured threshold.

---

- **ID:** AI-007
- **Title:** The weekly digest is generated with this week's data and scheduled to send **seven days later**
- **Fact:** `.github/workflows/weekly-digest.yml:6` — `cron: '0 9 * * 0'` — fires **Sunday** 09:00 UTC. `scripts/generate-weekly-digest.js:102-110`:
  ```js
  const day = now.getUTCDay()                      // 0 on Sunday
  const daysUntilSunday = day === 0 ? 7 : 7 - day  // → 7
  next.setUTCDate(now.getUTCDate() + daysUntilSunday)
  ```
  Run offline with the cron's own firing instant: **cron fires `2026-08-16T09:00:00Z` → campaign scheduled for `2026-08-23T09:00:00Z`.**
- **Control status:** **Confirmed** by executing the exact function against the exact cron instant.
- **Attack or failure scenario:** The `day === 0 ? 7` branch is written to find the *next* Sunday, but the job only ever runs *on* Sunday, so that branch always fires. Every digest is composed from Sunday's moon phase, Sunday's APOD image and Sunday's 7-day DONKI window, then delivered the following Sunday.
- **Impact:** Every weekly digest ever sent has been a week out of date. "This week's moon phase" is wrong by a full quarter-cycle (~7.4 days = roughly one phase boundary). The embedded NASA image (`generate-weekly-digest.js:367`, `<img src="${apod.hdurl || apod.url}">`) is last week's Picture of the Day, presented as current. The DONKI window covers days 14–7 before delivery. This is the single most damaging correctness defect in the repo, because it silently degrades the flagship recurring product.
- **Recommendation:** Either schedule for the same day (`next.setUTCHours(9,0,0,0)` on today's date, with a next-day rollover if already past — the pattern `generate-monthly-forecast.js:417-422` already uses correctly), or move the cron to Saturday and keep the "next Sunday" logic. Do not leave both.
- **Verification / pass criterion:** Trigger `workflow_dispatch` on a Sunday and confirm the logged `scheduleAt` is the same calendar day, not seven days out.

---

- **ID:** AI-008
- **Title:** The paid "Stars tab birth forecast" named in the audit brief does not exist in the codebase
- **Fact:** The Stars tab (`src/app/page.tsx:683-730`) contains only the third-party daily horoscope and a sign picker. The two birth-date inputs in the repo are the Life Path calculator on the **Sky** tab (`src/app/page.tsx:886-912`) and the Birth tab on `/calendars` (`src/app/calendars/CalendarsClient.tsx:352-443`). Both compute purely client-side from static lookup tables (`ANGEL_NUMBER_MEANINGS` in `src/lib/utils.ts:31`, `LIFE_PATHS` in `CalendarsClient.tsx:45`). Neither makes a network call. No route, script or component sends a birth date to Anthropic.
- **Control status:** **Confirmed absent.** Verified by reading every AI call site and every birth-date input.
- **Attack or failure scenario:** N/A — this is a scope correction. The question "does the birth forecast have its own rate limit" has no target.
- **Impact:** Positive for privacy (see PRIV-005: the privacy policy's claim that birth dates never leave the browser is **accurate**). Negative for the roadmap: if this feature is believed to exist, the premium value proposition is being over-counted.
- **Recommendation:** Confirm whether this was descoped or never built. If it is intended, treat AI-003 and AI-006 as prerequisites — it would be the first paid AI feature accepting free-text user PII.
- **Verification / pass criterion:** `grep -rn "birth" src/app/api/` returns nothing (it currently does).

---

- **ID:** AI-009
- **Title:** No entertainment-purpose disclaimer appears anywhere near the premium AI-generated life guidance, or in any of the three AI-generated emails
- **Fact:** Disclaimers exist in exactly four places, all free and all web: the tarot tab notice (`src/app/page.tsx:919-924`, dismissible, once per *session*), the tarot footnote (`src/app/page.tsx:956`), the site footer (`src/components/Footer.tsx:108`), and the privacy page (`src/app/privacy/page.tsx:95-98`). **Not** present on: the premium ritual prompt card (`src/app/page.tsx:865-884`), the weekly digest email (`scripts/generate-weekly-digest.js:317-424` — footer at 409-417 has no disclaimer), the monthly forecast email (`scripts/generate-monthly-forecast.js:243-378`), or the eclipse alert email (`scripts/check-eclipse-alerts.js:183-248`). `IntentionGuides.tsx:336-346` has a soft disclaimer ("not as spiritual prescription"), and `PlantingCalendar.tsx:376-387` has none.
- **Control status:** **Confirmed.** The `/about` page states editorial policy is "we say so plainly wherever they appear" (`src/app/about/page.tsx:82-89`) — code does not match that stated policy.
- **Attack or failure scenario:** A paying subscriber receives an unsolicited AI-authored email giving life guidance ("what it means energetically, plus one grounded thing to do", `check-eclipse-alerts.js:134`) with no framing at all. In Australia, unqualified predictive/advisory claims to paying customers engage ACL misleading-conduct considerations; several jurisdictions require an explicit "for entertainment purposes" label on paid divinatory services.
- **Impact:** Regulatory and reputational exposure concentrated precisely on the paid surface, where the standard is highest and the current coverage is zero. Also an internal-consistency failure against the site's own published editorial policy.
- **Recommendation:** Add a one-line disclaimer to the shared email footer in all three scripts, and to the premium ritual card. Make the tarot notice persist in `localStorage` rather than `sessionStorage` if the intent is one acknowledgement per person rather than per tab.
- **Verification / pass criterion:** Every generated email HTML contains the disclaimer string; the premium ritual card renders it.

---

- **ID:** AI-010
- **Title:** Claude output and NASA titles are interpolated into email HTML without escaping
- **Fact:** `scripts/generate-weekly-digest.js:326` (`${p.preheader}`), `:342` (`${p.greeting}`), `:351,368,378,388,404` (all body sections), `:367` (`alt="${apod.title}"` — an attribute context), `:323` (`<title>${p.subject}</title>`). Same pattern in `check-eclipse-alerts.js:187,196,209,211` and `generate-monthly-forecast.js:246,276,279,299`. No escaping function exists in any of the three scripts.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** Claude emits `<`, `>`, `&`, or a stray quote — entirely plausible in prose ("Earth & Moon", or an unclosed tag in a hallucinated fragment) — and the email HTML breaks. A double quote inside `apod.title` terminates the `alt` attribute early and can inject arbitrary attributes into the `<img>` tag. NASA APOD titles are third-party controlled and have contained quotation marks historically.
- **Impact:** Broken rendering in a sent campaign that cannot be recalled; a genuine (if low-likelihood) HTML injection path from a third-party feed into subscriber inboxes.
- **Recommendation:** Add a shared `esc(s)` helper escaping `& < > " '` and apply it to every interpolation in all three email builders. Attribute contexts (`alt`, `href`) especially.
- **Verification / pass criterion:** Build the email with `apod.title = 'A "Quoted" & <Tagged> Title'` and confirm the output HTML is well-formed.

---

- **ID:** AI-011
- **Title:** The monthly forecast can only ever draw 12 of the 78 tarot cards, and draws the identical card every year
- **Fact:** `scripts/generate-monthly-forecast.js:468` — `const monthlyCard = TAROT_CARDS[new Date().getMonth() % TAROT_CARDS.length]`. `getMonth()` returns 0–11; `TAROT_CARDS.length` is 78; `0..11 % 78` is `0..11`. `TAROT_CARDS` is ordered Major Arcana first (`:16-38`), so the reachable set is The Fool … The Hanged Man. January is always The Fool; December is always The Hanged Man. Cards 12–77 (including every Minor Arcana card, all 56 of them) can never be selected.
- **Control status:** **Confirmed** by reading the index arithmetic and the deck ordering.
- **Attack or failure scenario:** Not an attack. A paying subscriber who stays for 13 months receives the same "card for the month" they received a year earlier, with a fresh Claude reading attached to it.
- **Impact:** The premium email's tarot section is deterministic and repetitive in a way that is obvious to any retained subscriber — the exact cohort the monthly forecast exists to retain.
- **Recommendation:** Seed from year *and* month, e.g. `hashSeed('month:' + year + '-' + month)` reusing the existing `hashSeed`/`rng` pair in `src/lib/tarot.ts:95-114`.
- **Verification / pass criterion:** Card selected for January 2026 differs from January 2027, and Minor Arcana cards appear across a 24-month simulation.

---

- **ID:** AI-012
- **Title:** The tarot card in the weekly digest is a different card from the one the site shows for the same week
- **Fact:** The site uses a seeded PRNG over an ISO-ish week bucket — `src/lib/tarot.ts:137-162` (`weekKey` → `hashSeed` → `mulberry32` → 3-card spread). The digest uses a completely unrelated index — `scripts/generate-weekly-digest.js:502-504`:
  ```js
  const startOfYear = new Date(new Date().getFullYear(), 0, 0)
  const weekNumber = Math.floor((Date.now() - startOfYear.getTime()) / (7*24*60*60*1000))
  const weeklyCard = TAROT_CARDS[weekNumber % TAROT_CARDS.length]
  ```
  `weekNumber` ranges 0–52, so only the first 53 of 78 cards are reachable here too. The deck itself is a **third** copy of the data, hand-duplicated at `generate-weekly-digest.js:14-76` and again at `generate-monthly-forecast.js:15-77`.
- **Control status:** **Confirmed.** Two independent algorithms over two independent copies of the deck; no shared source.
- **Attack or failure scenario:** A subscriber opens the email ("This week's tarot: *X*"), clicks through to the Weekly Spread on site, and sees three entirely different cards.
- **Impact:** Directly visible inconsistency at the email→site conversion moment, which is the one moment the digest exists to create. Triplicated deck data also guarantees future drift.
- **Recommendation:** Extract the deck and the draw functions into a single module the scripts import (or a generated JSON), and have the digest call `getWeeklySpread()` so email and site agree by construction.
- **Verification / pass criterion:** Digest card name equals `getWeeklySpread(today).present.name` for the same date.

---

- **ID:** AI-013
- **Title:** The APOD simplification cache can serve yesterday's summary attached to today's title and date
- **Fact:** `src/app/api/apod-simple/route.ts:20-26`:
  ```js
  const apod  = await nasaFetch<ApodResponse>('/planetary/apod', {})
  const today = todayISO()
  if (apodCache && apodCache.date === today) {
    return NextResponse.json({ simple: apodCache.simple, title: apod.title, date: apod.date })
  }
  ```
  The cache is keyed on the *server's* UTC date, but the returned `title` and `date` come from the *freshly fetched* APOD object. `todayISO()` (`src/lib/nasa.ts:53-55`) and `apod.date` are independent values.
- **Control status:** **Confirmed.** The cache key is not derived from the content it caches.
- **Attack or failure scenario:** NASA publishes the new APOD partway through a UTC day (its publication is not exactly at 00:00 UTC, and `nasaFetch` layers a 3600s `revalidate` on top, `src/lib/nasa.ts:31`). An instance that cached the simplification before the switchover then serves the **old image's summary** under the **new image's title and date** for the remainder of the UTC day.
- **Impact:** The Space tab shows a plain-English description that does not describe the picture above it, with no visible cue that anything is wrong. This is the "stale data silently shown as current" pattern the brief asks about, and it is present.
- **Recommendation:** Key the cache on `apod.date` (the content's own identity), not on the server clock: `if (apodCache && apodCache.date === apod.date)`. One-line fix.
- **Verification / pass criterion:** Populate the cache, mutate the mock APOD's `date` and `explanation`, request again, and confirm a fresh simplification is generated.

---

- **ID:** AI-014
- **Title:** The weekly digest's solar-activity sentence prints a raw NASA class code where a plain-English label belongs
- **Fact:** `scripts/generate-weekly-digest.js:176` sets `intensity: ev.classType || ev.kpIndex || 'low'` — for an FLR that is a string like `"M1.5"` or `"X2.1"`. Line 186 then looks it up in a table keyed only on `low|moderate|high|extreme` (`:120-125`): `const label = INTENSITY_LABELS[top.intensity] || top.intensity` — the lookup always misses and falls through to the raw code. Line 188 emits: `` `${top.typeName} activity was detected this week — ${label}.` ``. For GST entries, `ev.kpIndex` does not exist on the DONKI GST schema (the field is `allKpIndex`, an array — cf. `src/app/api/donki/route.ts:23`), so those silently become `'low'`. Separately, `const top = all[0]` (`:185`) takes whichever CME the loop happened to push first, not the most significant event.
- **Control status:** **Confirmed** by comparing the field names against the correctly-implemented site route `src/app/api/donki/route.ts:43-63`, which does classify properly.
- **Attack or failure scenario:** Every digest with any solar activity reads: *"Solar Flare activity was detected this week — M1.5."* — and that sentence is also fed to Claude as ground truth at `:210` (`Solar activity: ${solar.summary}`), so the model then writes prose around an unexplained code.
- **Impact:** Jargon in a product whose stated purpose is *"plain English"* (`src/app/page.tsx:20`, `src/app/nasa-data/page.tsx:44`), plus a note that the "top" event is arbitrary rather than the strongest. Also emits an em dash directly (`:188`), violating the brand rule from AI-001 in *hardcoded* copy.
- **Recommendation:** Reuse the classification functions from `src/app/api/donki/route.ts:43-63` (`flrIntensity`, `cmeIntensity`, `gstIntensity`) rather than reading `classType` as if it were an intensity band. Sort by intensity before taking `[0]`. Replace the em dash with a full stop.
- **Verification / pass criterion:** With a mocked FLR of `classType: 'X2.1'`, the summary reads "…severe — potential disruptions…" (or the dash-free equivalent), not "…X2.1."

---

- **ID:** AI-015
- **Title:** Deep-link CTAs in the digest email land on the wrong tab
- **Fact:** `scripts/generate-weekly-digest.js:356` links to `https://portalastra.com/?tab=tarot` ("Draw your full reading →") and `:359` to `/?tab=sky`. `src/app/page.tsx:223` initialises `const [tab, setTab] = useState<Tab>('space')` and never reads a query parameter — there is no `useSearchParams` import in the file.
- **Control status:** **Confirmed.** Grep for `searchParams` in `src/app/page.tsx` returns nothing; the only `useSearchParams` usage is `src/app/pricing/CheckoutClient.tsx:9`.
- **Attack or failure scenario:** A subscriber clicks "Draw your full reading" and lands on the **Space** tab showing the NASA photo, with no tarot in sight.
- **Impact:** The email's two content-specific CTAs — the ones most likely to be clicked — fail to deliver the promised content. Every digest sent has had this defect.
- **Recommendation:** Read the parameter on mount (`useSearchParams()` inside a `<Suspense>` boundary, as `/pricing` already does) and initialise `tab` from it when it matches a known `Tab` value.
- **Verification / pass criterion:** `https://portalastra.com/?tab=tarot` opens with the Tarot tab active.

---

- **ID:** AI-016
- **Title:** Timezone: "today" is computed three different ways on a single page render
- **Fact:** Three independent notions of the current date coexist on the homepage:
  - `getTodayUTC()` (`src/lib/utils.ts:53-59`) — **UTC** — drives the header date (`page.tsx:479`), the tarot daily card (`page.tsx:290`), the weekly spread, and the Stars-tab sublabel.
  - `getAngelNumber()` (`src/lib/utils.ts:16-29`) — **local time** via `d.getDate()`, `d.getMonth()` — drives the angel-number strip (`page.tsx:490-493`) and the Sky-tab tile.
  - `new Date().toLocaleDateString('en-AU', …)` (`src/components/Navbar.tsx:45`) — **local time**, with `suppressHydrationWarning`.

  The intended AEST boundary appears nowhere in `src/`. The only correct AEST handling in the repo is `scripts/generate-weekly-digest.js:94-99` (`timeZone: 'Australia/Sydney'`).
- **Control status:** **Confirmed.** No `Australia/Sydney` or UTC+10/11 offset anywhere under `src/`.
- **Attack or failure scenario:** For an Australian visitor between 00:00 and 10:00 AEST (11:00 AEDT), the local date is one day ahead of UTC. The Navbar strip shows *Thursday 14 August 2026* while the header directly beneath shows *Aug 13, 2026*, and the angel number is computed for the 14th while the tarot card is drawn for the 13th. Additionally, server-side render (Netlify = UTC) and client render (AEST) compute different angel numbers, producing a hydration mismatch and a visible value flip. Only the Navbar carries `suppressHydrationWarning`; the angel strip does not.
- **Impact:** Two contradictory dates visible simultaneously, during the AEST morning — the site's primary audience and their peak usage window. The angel number, marketed as *"Today's number"*, is for a different day than the tarot card labelled with the same date.
- **Recommendation:** Add one `getTodayAEST()` helper using `Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' })` and route every "today" through it, including `getAngelNumber(date)` and the Navbar strip. This also removes the hydration mismatch, since the value becomes server/client independent.
- **Verification / pass criterion:** With the machine clock set to 02:00 AEST, the Navbar date, header date, angel number date and tarot date all agree.

---

## Section DATA: Data & Calculation Accuracy

---

- **ID:** DATA-001
- **Title:** Three separate moon-phase implementations disagree; the Navbar currently shows "Full Moon" on every page while the page body shows "New Moon"
- **Fact:** Three distinct algorithms with three different epochs and three different bucketing rules:

  | Implementation | Epoch | Cycle | Bucketing | Used by |
  |---|---|---|---|---|
  | `src/lib/utils.ts:1-14` | `new Date('2000-01-06')` = 00:00 UTC | `29.53` | 8 hardcoded thresholds | homepage badge, `IntentionGuides.tsx:303`, `PlantingCalendar.tsx:150`, `generate-weekly-digest.js:80-92` |
  | `MoonClient.tsx:35-43` & `CalendarsClient.tsx:20-28` | `Date.UTC(2000,0,6,18,14)` | `29.53059` | `floor(frac*8 + 0.5) % 8` | `/moon`, `/calendars` |
  | `Navbar.tsx:15-16` | day `10592.5` = 2000-01-06 **12:00** UTC | `29.53059` | `floor(frac*8)` — **no +0.5** | the Navbar strip on **every page** |

  Executed offline at `2026-08-13T00:05Z`:
  ```
  utils.ts / homepage / PlantingCalendar / digest : New Moon
  MoonClient + CalendarsClient                    : New Moon
  Navbar strip                                    : Full Moon
  Disagreement on 60/60 of the next 60 days.
    2026-08-13 | New Moon        | New Moon        | Full Moon
    2026-08-15 | Waxing Crescent | New Moon        | Full Moon
    2026-08-16 | Waxing Crescent | Waxing Crescent | Waning Gibbous
  ```
- **Control status:** **Confirmed** — the three functions were extracted verbatim and run side by side over the next 60 days. They never all agree on any of those 60 days.
- **Attack or failure scenario:** No attack. The Navbar omits the `+ 0.5` rounding term the other two use, shifting it half a bucket (~1.85 days), and its epoch is 6h 14m off from the `MoonClient` epoch and 12h off from the `utils.ts` epoch. The `utils.ts` epoch is additionally ~18h early (the actual January 2000 new moon was 6 Jan 18:14 UTC, which `MoonClient` uses correctly).
- **Impact:** The site's single most prominent recurring claim is self-contradictory on the same screen. Today a visitor sees "🌕 Full Moon" in the header strip of `/moon` and "🌑 New Moon" in the page body directly below it. The wrong phase also propagates into paid features: `PlantingCalendar.tsx:150` selects which crops to sow, and `IntentionGuides.tsx:303-305` selects which ritual to promote, both from the drifted `utils.ts` version.
- **Recommendation:** Delete `getMoonPhase` from `src/lib/utils.ts` and the inline copies in `Navbar.tsx` and `CalendarsClient.tsx`. Promote the `MoonClient.tsx:35-43` implementation (correct epoch, correct cycle, correct rounding) to `src/lib/moon.ts` and import it everywhere, including the three `scripts/`. Treat this as the highest-priority data fix.
- **Verification / pass criterion:** A test asserting all call sites return the identical phase name for 400 consecutive days.

---

- **ID:** DATA-002
- **Title:** Two Life Path calculators disagree on 13.6% of birth dates, and the homepage one contradicts the site's own published method
- **Fact:** Two implementations:
  - Homepage (`src/app/page.tsx:182-200`): reduces year, month and day to single digits *first* (`reduceToDigit`, which discards master numbers), sums the three, then reduces keeping masters.
  - `/calendars` (`CalendarsClient.tsx:38-42`): concatenates `${day}${month}${year}` and sums **all digits**, then reduces keeping masters.

  Exhaustive comparison over all dates 1920-01-01 → 2026-12-28 (35,952 dates): **4,901 disagree — 13.6%.** Examples: `1920-01-07` → homepage **11**, calendars **2**. `1920-01-09` → homepage **4**, calendars **22**. Both agree on the two textbook cases (4 Jul 1990 → 3; 25 Dec 1987 → 8), which is why the divergence is not obvious in casual testing.

  The site's own blog post `what-is-my-life-path-number` (`src/lib/posts.ts:1126`) documents the **digit-sum** method: *"Write out every digit. Add them all together."* — i.e. the `/calendars` method. The homepage method contradicts the published methodology.

  The two pages also attach different meaning tables to the same number: homepage uses `ANGEL_NUMBER_MEANINGS` (`src/lib/utils.ts:31`, angel-number themes), `/calendars` uses `LIFE_PATHS` (`CalendarsClient.tsx:45`, "The Leader", famous namesakes).
- **Control status:** **Confirmed** by exhaustive offline enumeration of both functions.
- **Attack or failure scenario:** A visitor enters their birth date on the homepage Sky tab, gets Life Path 11 with an angel-number theme; clicks the site's own link *"Discover your life path number →"* (`src/app/page.tsx:494`, which points at `/calendars#birth`), enters the same date, and gets Life Path 2 with a different description. The site actively routes users from one calculator to the other.
- **Impact:** For a numerology product, the core number being different on two pages of the same site — and different from the site's own explainer article — is a credibility failure, not a rounding detail. It affects roughly one in seven visitors.
- **Recommendation:** Delete `lifePathNumber`/`reduceToDigit` from `src/app/page.tsx` and import the `/calendars` implementation (which matches the published article). Consolidate on `LIFE_PATHS` for the meaning text in both places.
- **Verification / pass criterion:** A test asserting both call sites agree across all dates 1900–2030, and that `1920-01-09` returns 22 in both.

---

- **ID:** DATA-003
- **Title:** The angel number in the weekly email differs from the site's on 53 days a year
- **Fact:** `src/lib/utils.ts:16-29` preserves master numbers: `while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33)`. The digest reimplements it at `scripts/generate-weekly-digest.js:505-508` **without** the master-number guard: `while (angelNumber > 9) { … }`. Enumerated over calendar 2026: **53 of 365 days differ.** `2026-01-10` → site **22**, email **4**. `2026-01-17` → site **11**, email **2**. `2026-01-21` → site **33**, email **6**.
- **Control status:** **Confirmed** by running both reductions over every day of 2026.
- **Attack or failure scenario:** The email says *"This week's angel number: 4"* on a day the site's Sky tab tile says *"11 — Intuition and enlightenment"*. Worse, master numbers are the ones the product treats as significant ("A master number." — `utils.ts:41-43`), so the email systematically strips out exactly the days worth writing about. The meaning text alongside the number is written by Claude from the *wrong* number (`generate-weekly-digest.js:249`), so the email is internally consistent but externally wrong.
- **Impact:** ~1 in 7 digests carries a wrong headline number, and it is always a master number that gets flattened.
- **Recommendation:** Import (or copy verbatim) `getAngelNumber` from `src/lib/utils.ts` rather than reimplementing it inline. Same root cause as AI-012 and DATA-001: logic duplicated between `src/` and `scripts/` with no shared module.
- **Verification / pass criterion:** Both functions agree across all 365 days of a test year.

---

- **ID:** DATA-004
- **Title:** The hardcoded eclipse list on `/moon` is stale — three of its four dates are already in the past, and the next real eclipse is missing
- **Fact:** `src/app/moon/MoonClient.tsx:72-77`:
  ```js
  const ECLIPSES = [
    { date: '2026-08-12', label: 'Total Solar Eclipse' },
    { date: '2026-02-06', label: 'Annular Solar Eclipse' },
    { date: '2027-08-02', label: 'Total Solar Eclipse' },
    { date: '2025-09-07', label: 'Total Lunar Eclipse' },
  ]
  ```
  As of 13 August 2026, three dates have passed. `:148-151` filters to future dates and takes the earliest, so the "Upcoming Events" carousel now advertises the **2 August 2027** eclipse — 354 days out — as the next one.
- **Control status:** **Confirmed** for staleness (pure date arithmetic against today). **Inferred** for two content errors requiring an external check: (a) the 2026 annular solar eclipse is commonly published as **17 February 2026**, not 6 February; (b) there is a lunar eclipse on **28 August 2026** — 15 days from today — that is absent from the list entirely. Both need confirmation against NASA's eclipse catalogue before acting.
- **Attack or failure scenario:** No attack. A hardcoded list with no expiry mechanism and no owner.
- **Impact:** The "Upcoming Events" carousel — a headline feature of `/moon` — skips the eclipse two weeks away and promotes one a year out. It will keep degrading silently: after August 2027 the list is empty and the eclipse card disappears with no error.
- **Recommendation:** Replace with a maintained multi-year table sourced from NASA's eclipse catalogue, including lunar eclipses, and add a build-time assertion that at least one entry is within the next 12 months so staleness fails loudly. This is also the correct fix for DATA-005 — the alert cron should read the same table instead of computing eclipses.
- **Verification / pass criterion:** The card shows the 28 August 2026 lunar eclipse today; a CI check fails when no listed eclipse falls within 12 months.

---

- **ID:** DATA-005
- **Title:** The eclipse-alert cron's astronomy model is wrong — it misclassifies half of real eclipses and will detect nothing at all for the rest of 2026
- **Fact:** `scripts/check-eclipse-alerts.js:31-36,65-71` models eclipse seasons as "any syzygy within 18 days of a node crossing", with the node cycle anchored at `REF_NODE = Date.UTC(2000, 0, 6)` — the same date as the reference *new moon*, which is not a node crossing. The ±18-day window over a 173.31-day half-eclipse-year flags ~21% of all syzygies. Running the script's own functions offline:

  ```
  Events the script would announce over the next 12 months:
     2027-01-07 Solar Eclipse       2027-06-18 Supermoon
     2027-01-21 Lunar Eclipse       2027-07-03 Solar Eclipse
     2027-02-05 Solar Eclipse       2027-07-18 Supermoon Lunar Eclipse
                                    2027-08-01 Solar Eclipse
                                    2027-08-16 Supermoon

  Real eclipses vs the model's verdict:
     2026-02-17 Annular solar  -> inEclipseSeason = true
     2026-03-03 Total lunar    -> inEclipseSeason = false   ✗ missed
     2026-08-12 Total solar    -> inEclipseSeason = true
     2026-08-28 Partial lunar  -> inEclipseSeason = false   ✗ missed
     2027-02-06 Annular solar  -> inEclipseSeason = true
     2027-08-02 Total solar    -> inEclipseSeason = false   ✗ missed
  ```
  Three of six real eclipses are missed. **Zero events are detected between now and January 2027** — nearly five months of a paid daily cron producing nothing.
- **Control status:** **Confirmed** for the model's own behaviour (functions executed verbatim). The real-eclipse reference dates are **Inferred** from general astronomical knowledge and should be checked against NASA's catalogue — but the "zero detections for five months" result is independent of that and is confirmed outright.
- **Attack or failure scenario:** The model announces "Lunar Eclipse" for any full moon that happens to land inside a ±18-day window anchored to an arbitrary date. The comment at `:33-34` acknowledges this ("simplified seasonal model with an approximate reference node crossing… flagged as 'potential'"), but the emails carry no such hedge — `:208-211` renders `<h1>${event.name}</h1>` and `${event.dateLabel} · seven days away` as flat assertions, and the Claude prompt at `:132` instructs it to *"Announce the event and its date warmly."*
- **Impact:** A paid subscriber will receive an email confidently announcing a Lunar Eclipse on a date with no eclipse, and will receive nothing on the real eclipse dates. Since the alert content is generated per detected event, a false positive costs an Anthropic call *and* a wrong email to the entire paid list.
- **Recommendation:** Delete the seasonal model. Drive the alert from an explicit eclipse date table (the same one that fixes DATA-004) with real eclipse types. Keep the perigee-based supermoon detection (`:57-63`) but validate it against published supermoon dates. Until fixed, disable `.github/workflows/eclipse-alerts.yml` — it is currently an automated source of false claims to paying customers.
- **Verification / pass criterion:** For each of the six reference dates above, the detector's verdict matches the real eclipse table, and no non-eclipse date is flagged over a 3-year simulation.

---

- **ID:** DATA-006
- **Title:** Moon illumination is reported as a bucketed constant on the homepage and as a real calculation on `/moon`, producing two different percentages for the same day
- **Fact:** `src/lib/utils.ts:6-13` returns fixed values — `illumination: 0 | 25 | 50 | 75 | 100` — one per phase bucket. `MoonClient.tsx:40` and `CalendarsClient.tsx:25` compute `Math.round(((1 - Math.cos(frac * 2π)) / 2) * 100)`. The homepage renders the constant with a tilde: `~{moon.illumination}% illuminated` (`src/app/page.tsx:743`); `/calendars` renders the computed value with no tilde: `{moonInfo.illumination}% illuminated` (`CalendarsClient.tsx:247`).
- **Control status:** **Confirmed** by reading both formulas. Worked example: at moon age 4.0 days, `utils.ts` reports **25%** (Waxing Crescent bucket) while the cosine formula gives `(1 − cos(0.851 rad))/2 = 17%`. An 8-point discrepancy, larger near the quarters.
- **Attack or failure scenario:** No attack. The homepage figure is a category label dressed as a measurement.
- **Impact:** Two pages of the same site state different illumination for the same night. The `/moon` page presents its value in a card labelled "Today's Lunar Data" (`MoonClient.tsx:374-377`) with no tilde, implying precision the homepage figure does not have.
- **Recommendation:** Fold into DATA-001 — one shared moon module returning the computed illumination, used everywhere.
- **Verification / pass criterion:** Homepage and `/moon` report the same integer percentage on the same day.

---

- **ID:** DATA-007
- **Title:** The lunar distance displayed on `/moon` is derived from moon *phase*, which is astronomically incorrect
- **Fact:** `src/app/moon/MoonClient.tsx:45-47`:
  ```js
  function phaseDistanceKm(frac: number): number {
    return Math.round(381600 - 25100 * Math.cos(frac * 2 * Math.PI))
  }
  ```
  `frac` is the position in the **synodic** (phase) cycle. This is what is rendered in the "Distance" card (`:137`, `:383-385`). Lunar distance varies with the **anomalistic** month (27.55 days, perigee-to-perigee), which is a different and unsynchronised cycle. The file already contains a correct anomalistic implementation — `anomDistanceKm` (`:49-53`, epoch `KNOWN_PERIGEE`) — but it is used **only** for supermoon detection (`:145`), never for the displayed figure.
- **Control status:** **Confirmed** by reading the two functions and their call sites. The correct function exists and is not wired to the display.
- **Attack or failure scenario:** No attack. The formula produces a plausible-looking number in the right range (356,500–406,700 km) that tracks the wrong cycle, so it is never obviously wrong yet is essentially never right. It implies distance is minimum at new moon and maximum at full moon, which is false.
- **Impact:** A fabricated figure presented in a card headed "Today's Lunar Data", on a site whose `/nasa-data` page states *"Every number on Portal Astra comes from a real API. Here is exactly where."* (`src/app/nasa-data/page.tsx:44`). This number comes from no API and no valid model — it is the clearest case in the repo of a displayed value that cannot be substantiated.
- **Recommendation:** Swap the display to `anomDistanceKm(now)` (already present, one-word change at `:137`) and verify its `KNOWN_PERIGEE = Date.UTC(2024, 0, 13)` anchor against a published perigee table — the comment already calls it "approx". Alternatively remove the Distance card; "Moonrise: Varies by location" (`:388`) is already a placeholder in the same grid.
- **Verification / pass criterion:** The displayed distance reaches its minimum on a published perigee date and its maximum on a published apogee date, independent of the moon's phase.

---

- **ID:** DATA-008
- **Title:** NASA responses can be served up to 24 hours stale with no staleness indicator on any of the four endpoints
- **Fact:** All four NASA routes set `export const dynamic = 'force-dynamic'` yet return `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` (`apod/route.ts:17-19`, `epic/route.ts:14-16`, `donki/route.ts:118`, `asteroids/route.ts:43`). Underneath, `nasaFetch` adds a second, independent layer: `{ next: { revalidate } }` with `revalidate = 3600` (`src/lib/nasa.ts:19,31`). The `stale-while-revalidate=86400` directive explicitly authorises the CDN to serve content up to 24 hours past expiry while it refreshes in the background.
- **Control status:** **Confirmed** for the directives as written. **Inferred** for the observed behaviour on Netlify's CDN, which was not exercised in this read-only pass.
- **Attack or failure scenario:** NASA has a multi-hour outage. `nasaFetch` retries three times (`src/lib/nasa.ts:28-48`) then throws; the route returns 502; but the CDN, under `stale-while-revalidate`, keeps serving the previous body to visitors. The client (`src/app/page.tsx:325-329`) has no way to tell a fresh 200 from a stale one — there is no `generated_at` field or freshness flag in any of the four responses.
- **Impact:** Yesterday's NEO close-approach list, yesterday's space-weather events and yesterday's APOD can be shown as today's with full confidence. The NEOs tab derives its own heading date from the data (`src/app/page.tsx:1029`), so stale data even relabels the day. This is precisely the "stale data silently shown as current" case the brief targets.
- **Recommendation:** Add a `fetchedAt` timestamp to each route's response and render a "data as of …" line, or drop `stale-while-revalidate` for the time-sensitive endpoints (`asteroids`, `donki`) and accept a visible error state instead. The `/api/horoscope` route already models the right pattern with its `fallback: true` flag (`src/app/api/horoscope/route.ts:44-51`).
- **Verification / pass criterion:** Block `api.nasa.gov` at the network level and confirm the UI shows an explicit stale or error state rather than yesterday's data presented as current.

---

- **ID:** DATA-009
- **Title:** The Amazon cache TTL is enforced correctly, but the nightly refresh job cannot actually force a refresh, and a failed lookup renders as silence
- **Fact:** TTL enforcement is sound: `src/app/api/amazon-books/route.ts:127-129` computes age in hours and returns `null` past `CACHE_TTL_HOURS = 24` (`:4`), so no code path serves an object past its TTL. Two adjacent problems:
  1. `scripts/refresh-amazon-cache.js:31` requests `${SITE_URL}/api/amazon-books?${params}&force=1`, but the route reads only `q` and `count` (`:145-146`) — **`force` is never implemented**. The nightly job therefore returns the cached copy when it is under 24h old and logs "already fresh", never actually pre-warming. Since the job runs at a fixed daily time against a 24h TTL, whether a refresh happens is a coin flip on clock drift.
  2. On any Amazon failure the route returns `{ products: [], error: message }` with HTTP **200** (`:169`), and the component returns `null` when the list is empty (`AmazonProductRow.tsx:43`) — the entire section vanishes with no error and no logging visible to the operator.
- **Control status:** **Confirmed.** `grep force src/app/api/amazon-books/route.ts` returns nothing.
- **Attack or failure scenario:** Amazon credentials expire or the Creators API changes shape. Every affiliate row across `/pricing`, `/moon` and `/calendars` silently disappears. Nothing alerts; the pages look intentionally designed without them.
- **Impact:** Affiliate revenue drops to zero with no signal. The refresh job's success log is misleading, so the operator's only monitoring surface actively reports health during an outage.
- **Recommendation:** Implement `force` (skip `getCachedProducts` when present), or lower the TTL below the cron interval. Return a distinguishable error state to the component and log a non-empty-products assertion in the refresh script so the job fails loudly.
- **Verification / pass criterion:** Running `refresh-amazon-cache.js` twice in a row logs `source: 'api'` both times; a forced Amazon 401 produces a failed workflow run.

---

- **ID:** DATA-010
- **Title:** The $7.95 price is hardcoded in two components and defined a third time in Stripe
- **Fact:** Three independent sources of truth:
  1. `src/app/pricing/page.tsx:78` — `AUD $7.95<span…>/month</span>`
  2. `src/app/pricing/CheckoutClient.tsx:75` — `Start Founder Membership — A$7.95/mo`
  3. `src/app/api/checkout/route.ts:31` — `price: 'price_1Th5W3EzKt7FGdkFCQDVz6BM'` (the authoritative amount, in Stripe)

  Neither display value is derived from the Stripe price. Adjacent unverifiable claims: `pricing/page.tsx:80` — *"Usually AUD $9.95/month or $79/year"* — neither figure appears anywhere in code or corresponds to any Stripe price object referenced in the repo.
- **Control status:** **Confirmed.** (Per the brief, the live Stripe product/price is already screenshot-verified as correct; the risk here is the two hardcoded copies drifting from it, not the Stripe value itself.)
- **Attack or failure scenario:** The founder price is raised in the Stripe dashboard. The pricing page and the button keep saying $7.95 while checkout charges the new amount — a customer is billed a price different from the one displayed at the point of sale.
- **Impact:** Australian Consumer Law exposure on displayed-vs-charged price. The "Usually $9.95/month or $79/year" was-price claim is separately exposed under ACL's rules on comparative pricing if no such price has ever genuinely applied.
- **Recommendation:** Fetch the price from Stripe at build time (or expose it from a single server constant) and render both display sites from it. Remove the "Usually…" line unless the higher price has genuinely been charged for a reasonable prior period, and keep evidence if it has.
- **Verification / pass criterion:** Changing the amount on the Stripe price object changes both rendered strings without a code edit.

---

- **ID:** DATA-011
- **Title:** Sitemap covers every live route, but the canonical host is inconsistent between `sitemap.ts`, `robots.ts` and `layout.tsx`
- **Fact:** Route coverage is **correct**: `src/app/sitemap.ts` lists `/`, `/about`, `/blog`, `/moon`, `/nasa-data`, `/calendars`, `/pricing`, `/privacy` plus every blog post via `getAllPosts()`. Verified against the filesystem — the app has exactly those eight static routes plus `/blog/[slug]`. No orphans, no missing routes.

  The host is inconsistent:
  - `sitemap.ts:4` and `about/page.tsx:6` and `blog/[slug]/page.tsx:11` default to **`https://www.portalastra.com`**
  - `robots.ts:9` hardcodes **`https://portalastra.com/sitemap.xml`** (no www)
  - `layout.tsx:9,17,20` sets `metadataBase` and `alternates.canonical` to **`https://portalastra.com`** (no www)
  - `.env.local` sets `NEXT_PUBLIC_SITE_URL`, so local builds may differ from production depending on the Netlify environment variable
- **Control status:** **Confirmed** for the code. **Unverified** which host production actually resolves to — that requires a Netlify environment check.
- **Attack or failure scenario:** If `NEXT_PUBLIC_SITE_URL` is unset in Netlify, the sitemap advertises `www.` URLs while every canonical tag declares the apex domain. Search engines receive contradictory signals about the canonical host.
- **Impact:** Split indexing and diluted ranking signals across two hostnames — material for a site whose growth strategy is SEO-led (35 blog posts, JSON-LD, keyword metadata).
- **Recommendation:** Pick one host, set `NEXT_PUBLIC_SITE_URL` explicitly in Netlify, derive `robots.ts` and `layout.tsx` from the same constant, and add a 301 redirect from the other host.
- **Verification / pass criterion:** `curl` on `/sitemap.xml`, `/robots.txt` and the homepage `<link rel="canonical">` all report the same hostname.

---

- **ID:** DATA-012
- **Title:** The `/calendars` birth form accepts impossible dates such as 31 February
- **Fact:** `src/app/calendars/CalendarsClient.tsx:362-364` always renders 31 day options regardless of the selected month, and `calculate()` (`:147-162`) performs no validity check. `getSign(2, 31)` (`:69-73`) returns `'Pisces'` and `lifePath(31, 2, 1990)` returns a number. The homepage uses `<input type="date">` with `max={today}` (`src/app/page.tsx:891-898`) plus a future-date guard (`:293`, `:900-902`), so it does not share this defect.
- **Control status:** **Confirmed.** Zodiac boundaries themselves are correct — an exhaustive comparison of `getSign()` against the `SIGNS` date ranges displayed on the Stars tab (`src/lib/utils.ts:61-74`) found **no differences** on any day of the year.
- **Attack or failure scenario:** A user mis-selects and receives a confident numerological reading for a date that does not exist. There is no future-date guard either, so a 2026 birth year yields a "life path".
- **Impact:** Low, but it undermines the precision the feature implies, on the page the homepage explicitly directs users to.
- **Recommendation:** Derive the day options from the selected month and year, and reject future dates as the homepage already does.
- **Verification / pass criterion:** 31 February is not selectable; a future date shows an error rather than a result.

---

- **ID:** DATA-013
- **Title:** Mercury retrograde 2026 dates in the published blog post appear to be wrong, and contradict an earlier reviewed version of the same post
- **Fact:** `src/lib/posts.ts:1061` (`mercury-retrograde-2026`) states three retrograde windows: **15 March – 7 April (Aries)**, **18 July – 11 August (Leo)**, **9 – 29 November (Sagittarius)**, repeated in the summary. The repo's own review file quotes an earlier version of this post: `blog-roundtable-reviews.md:1362` — *"First retrograde: late February into March 2026…"* — which does not match the currently published "March 15 to April 7".
- **Control status:** **Inferred, needs external verification.** The internal contradiction between the post and its own review record is **Confirmed**; which set of dates is astronomically correct requires checking an ephemeris. My reading is that the 2026 retrogrades fall closer to late Feb–March, late June–July and late Oct–November, i.e. the *reviewed* version was right and the current text is shifted roughly two to three weeks late — but this must be confirmed against a real ephemeris before editing.
- **Attack or failure scenario:** No attack. Hardcoded astronomical dates in prose with no source citation and no verification step.
- **Impact:** "Mercury retrograde 2026" is called out in the repo's own SEO notes as a high-traffic seasonal query (`blog-expansion-instructions.md:37`). Publishing wrong dates on a high-intent query is the worst place to be wrong: the reader can check, and the site's whole differentiator is *"where science meets the stars"*.
- **Recommendation:** Verify all three windows against an ephemeris, correct the post, and add the source. Given the post is dated `2026-06-10`, the first two windows have already elapsed — correcting now still matters for the November window and for the post's credibility.
- **Verification / pass criterion:** Each of the three date ranges matches a published 2026 ephemeris to the day.

---

- **ID:** DATA-014
- **Title:** Em dashes appear in hardcoded site and blog copy despite the style rule enforced on AI output
- **Fact:** 80 occurrences of `—`/`–` in `src/` outside `posts.ts`, plus these in published blog fields: `posts.ts:23`, `:248`, `:464` (excerpts) and `:706`, `:938` (**titles** — *"What Is a Coronal Mass Ejection — And How Does It Affect You?"*, *"Angel Number 555: Change Is Coming — Here Is How to Work With It"*). Also in hardcoded email copy: `generate-weekly-digest.js:188`, `:121-124`.

  Banned-word check on hardcoded copy: **"forever"** appears twice in user-facing text — `src/app/pricing/page.tsx:12` (page description) and `:79` (*"Founder pricing, locked in forever"*) — and **"infinite"** once, `src/lib/utils.ts:39` (*"The infinite loop of the cosmos turns in your favour"*), which is rendered in the angel-number strip on the homepage. The 11 apparent "dance" hits in `posts.ts` are all false positives inside *guidance* / *avoidance* / *abundance*.
- **Control status:** **Confirmed** by grep with context inspection.
- **Attack or failure scenario:** No attack. The rules exist in five AI prompts but are applied nowhere to human-written copy, so the brand voice is inconsistent in the direction opposite to the one being policed.
- **Impact:** Minor on its own; relevant because it shows the rule is a prompt convention rather than a house standard, and it defines the false-positive trap any AI-output validator (AI-001) must avoid.
- **Recommendation:** Decide whether the rule applies to all copy or only AI output. If all, run the AI-001 validator over `posts.ts` and the hardcoded strings as a lint step, with word-boundary anchoring.
- **Verification / pass criterion:** The lint step passes on `posts.ts` without flagging "guidance".

---

## Section SEC: Security & Backend Data Capture

**POST route inventory** (four total):

| Route | Rate limited | Input validated | Auth |
|---|---|---|---|
| `/api/subscribe` | ✅ 3/IP/hr | ✅ regex + honeypot | none (public by design) |
| `/api/checkout` | ❌ | ❌ | none |
| `/api/verify-premium` | ❌ | partial (`includes('@')`) | none |
| `/api/stripe-webhook` | ❌ (n/a) | ✅ signature | ✅ HMAC |

GET routes `/api/amazon-books`, `/api/ritual-prompt`, `/api/apod-simple`, `/api/apod`, `/api/epic`, `/api/donki`, `/api/asteroids`, `/api/horoscope` have no rate limiting; only `/api/horoscope` validates its input.

---

- **ID:** SEC-001
- **Title:** The Stripe webhook **does** verify its signature correctly — the single most important check in this section passes
- **Fact:** `src/app/api/stripe-webhook/route.ts:21-35`:
  ```js
  const body = await request.text()                       // raw body, not parsed JSON
  const sig  = request.headers.get('stripe-signature')!
  event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  ```
  wrapped in try/catch returning HTTP 400 on failure. `export const runtime = 'nodejs'` (`:4`) is set, which is required for the crypto path. The raw body is read via `request.text()` before any parsing — the App Router equivalent of disabling the body parser — and the comment at `:69-72` shows this was a deliberate decision, not an accident.
- **Control status:** **Confirmed.** Verification precedes every use of the payload; no code path reads `event` before `constructEvent` returns.
- **Attack or failure scenario:** The forged-webhook attack (POST a fake `checkout.session.completed` with an attacker email to obtain a free Paid-group membership) **fails** — `constructEvent` throws and the handler returns 400 before touching MailerLite.
- **Impact:** The highest-severity plausible vulnerability in this application is not present. Note the two residual issues recorded separately: the error message is echoed to the caller (SEC-007), and the handler's MailerLite call is unchecked (SALES-001).
- **Recommendation:** No change to the signature logic. Confirm `STRIPE_WEBHOOK_SECRET` is set in Netlify and matches the live endpoint — the non-null assertion at `:31` means an unset value produces an opaque failure of *every* webhook rather than a clear error.
- **Verification / pass criterion:** `stripe trigger checkout.session.completed` succeeds; the same payload replayed with a mangled `stripe-signature` header returns 400.

---

- **ID:** SEC-002
- **Title:** `/api/verify-premium` is an unauthenticated oracle that discloses whether any given email address is a paying subscriber
- **Fact:** `src/app/api/verify-premium/route.ts:5-27`. Accepts any JSON `{ email }`, validated only by `email.includes('@')` (`:8`), and queries MailerLite for that subscriber (`:11-19`), returning `{ isPaid: true | false }` (`:26-27`). No authentication, no proof of email ownership, no rate limit, no logging of failed attempts.
- **Control status:** **Confirmed.** This is exactly the "one email's request reveals information about a different email's status" case in the brief — and it does.
- **Attack or failure scenario:** `POST /api/verify-premium {"email":"target@example.com"}` returns `isPaid: true` for a paying customer and `false` otherwise. Two consequences: (1) an attacker with a list of email addresses can enumerate which of them pay Portal Astra, an inferred-interest disclosure about identifiable individuals; (2) knowing a subscriber's email is *sufficient to obtain their premium access* — `handleVerifyPremium` (`src/app/page.tsx:424-450`, `CalendarsClient.tsx:182-208`) writes `pa_premium_verified` to localStorage on `isPaid: true`, so any third party who knows a paying customer's address unlocks the product for themselves.
- **Impact:** Simultaneously a privacy disclosure and a complete authentication bypass for the paid tier. Email is being used as a bearer credential while also being a public identifier. There is no rate limit, so enumeration is unbounded.
- **Recommendation:** Replace with a proof-of-possession flow: the user submits an email, the server emails a short-lived one-time link or code, and premium is granted only after the code is returned. Make the response uniform and rate-limited in the meantime, and add per-IP throttling immediately as a stopgap.
- **Verification / pass criterion:** Submitting a known paying customer's email from a browser that has never received a code does not unlock premium.

---

- **ID:** SEC-003
- **Title:** Premium entitlement is stored and enforced entirely in client-side localStorage
- **Fact:** Three components read the same unsigned client value and gate on it: `src/app/page.tsx:333-345`, `CalendarsClient.tsx:137-145`, `MoonClient.tsx:126-134` — each does `JSON.parse(localStorage.getItem('pa_premium_verified'))` and sets `isPremium` when `verified && Date.now() < expires`. It is written at `page.tsx:439-441` and `CalendarsClient.tsx:197-199`. No server-side check exists on any premium render path. `/api/ritual-prompt` — the paid AI feature — performs no entitlement check at all.
- **Control status:** **Confirmed.** No server-side authorisation exists anywhere in the codebase.
- **Attack or failure scenario:** In any browser console:
  ```js
  localStorage.setItem('pa_premium_verified', JSON.stringify({verified:true, expires:Date.now()+9e12}))
  ```
  This unlocks the planting calendar, the intention guides and the ritual prompt permanently, with no email and no payment. No network request required.
- **Impact:** The paid tier has no technical enforcement. Every premium web feature is bypassable in one line. (The email-only features — digest, forecast, alerts — are genuinely gated by MailerLite group membership and are not affected.)
- **Recommendation:** Issue a signed, expiring token (HMAC or JWT) from the server on successful verification, store that, and validate it server-side on every premium route and in the server render path. This depends on fixing SEC-002 first, since today the verification step itself is forgeable.
- **Verification / pass criterion:** A hand-crafted localStorage value does not unlock any premium feature; `/api/ritual-prompt` rejects requests without a valid token.

---

- **ID:** SEC-004
- **Title:** The subscribe honeypot **is** present and correctly implemented — but it is only wired into one of the three subscribe forms
- **Fact:** Contrary to the brief's "confirmed absent as of the last check", the honeypot now exists on both sides. Server: `src/app/api/subscribe/route.ts:19-22` reads `body.website` and, when non-empty, returns `{ ok: true }` **without** subscribing — correctly giving bots no signal. Client: `src/app/page.tsx:502-511` renders a `name="website"` input with `tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`, positioned off-screen, and submits it at `:395`.

  However, the other two subscribe forms do **not** send the field: `CalendarsClient.tsx:170-174` (planting waitlist) posts `{ email, source: 'planting-waitlist' }`, and `MoonClient.tsx:187-191` posts `{ email }` only. Note also that `source` is sent but the route ignores it entirely — waitlist signups are indistinguishable from newsletter signups in MailerLite.
- **Control status:** **Confirmed present** on the homepage; **confirmed absent** on `/moon` and `/calendars`.
- **Attack or failure scenario:** A bot targeting the `/moon` or `/calendars` form is never caught by the honeypot; only the IP rate limit applies, and that has its own weaknesses (SEC-011, SEC-012).
- **Impact:** Partial protection. The gap is small but the two unprotected forms are on the two most SEO-visible pages.
- **Recommendation:** Extract the subscribe form into a shared component so all three sites share the honeypot. Either implement `source` (map it to a MailerLite group or custom field) or drop it — sending a field the server ignores is misleading to a future reader.
- **Verification / pass criterion:** All three forms include the hidden field; a POST with `website` populated returns 200 and creates no MailerLite subscriber.

---

- **ID:** SEC-005
- **Title:** `/api/amazon-books` echoes raw upstream error text — including Amazon's response body — to any caller
- **Fact:** `src/app/api/amazon-books/route.ts:165-170`:
  ```js
  const message = err instanceof Error ? err.message : 'Unknown error'
  return NextResponse.json({ products: [], error: message }, { status: 200 })
  ```
  The thrown messages embed the upstream body verbatim: `:44` — `` throw new Error(`Amazon auth failed ${res.status}: ${errText}`) `` — and `:84` — `` throw new Error(`Amazon search failed ${res.status}: ${errText}`) ``. Supabase client errors reach the same handler.
- **Control status:** **Confirmed.** The error string travels unmodified from Amazon's response into the JSON returned to the browser.
- **Attack or failure scenario:** An attacker requests `/api/amazon-books?q=x` and reads Amazon OAuth error bodies (which name the client_id, the failing scope and the auth mode), Amazon API validation errors (which reveal the partner tag, marketplace and requested resource paths), or Supabase errors (which reveal the table name, column names and RLS/permission state). None of this is secret in the strict sense, but it maps the backend for free.
- **Impact:** Information disclosure that materially accelerates reconnaissance against the Amazon integration and the Supabase table. Compare `/api/subscribe`, which handles this correctly: it logs the detail server-side and returns a generic message (`subscribe/route.ts:61-70`).
- **Recommendation:** Log the detail with `console.error` and return a fixed generic message, exactly as `/api/subscribe` does. Apply the same treatment to the four NASA routes, which also echo `err.message` (`apod/route.ts:26-27`, `epic/route.ts:39-40`, `donki/route.ts:121-122`, `asteroids/route.ts:46-47`) — lower risk, since those messages are constructed locally rather than from an upstream body.
- **Verification / pass criterion:** With invalid Amazon credentials, the client response contains no upstream text.

---

- **ID:** SEC-006
- **Title:** `/api/checkout` returns raw Stripe error messages to the client and trusts a client-supplied email
- **Fact:** `src/app/api/checkout/route.ts:43-45` — `return NextResponse.json({ error: err.message }, { status: 500 })` — where `err` is a `Stripe.errors.StripeError`. Separately, `:23,28` take `email` from the request body and pass it as `customer_email`, with no validation. (The current caller sends `''` — `CheckoutClient.tsx:43` — so Stripe collects the address itself; the parameter is accepted anyway.)
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** A malformed request surfaces Stripe's own error text to the browser — messages that name the price ID, the API version, and the account's configuration state. Separately, an attacker can create checkout sessions pre-filled with an arbitrary victim address; low impact (no email is sent by session creation) but it costs nothing to close.
- **Impact:** Information disclosure about the payment configuration, on the one route that touches payments.
- **Recommendation:** Return a fixed generic error and log the detail. Validate `email` with the same `EMAIL_RE` used by `/api/subscribe` (`subscribe/route.ts:3`), or drop the parameter entirely since the client never populates it.
- **Verification / pass criterion:** Forcing a Stripe error returns `{"error":"Unable to start checkout."}` with the detail present only in server logs.

---

- **ID:** SEC-007
- **Title:** `/api/amazon-books` writes an attacker-controlled row into Supabase on every miss, using the service key, with no rate limit
- **Fact:** `q` is unvalidated and unbounded (`src/app/api/amazon-books/route.ts:145,149-153`); `queryKey` is derived directly from it (`:153`); on a cache miss the route calls Amazon then **writes** `{ query_key, products, cached_at, hit_count }` to `portal_astra_product_cache` via `upsert` (`:134-141`, `:162`). The Supabase client is constructed at module scope with `SUPABASE_SERVICE_KEY` (`:7-10`) — the service role key, which bypasses row-level security entirely — and the route is a public, unauthenticated GET.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** A loop over random `q` values causes one paid Amazon Creators API call **and** one Supabase row insert per request, unbounded. There is no allow-list of query strings even though the set of real queries is fixed and known — only three placements exist site-wide (see UX-004). The table grows without limit; no cleanup job exists.
- **Impact:** Metered third-party spend plus unbounded storage growth in a table written with the highest-privilege database credential available. The `count` parameter is at least bounded (`Math.min(parseInt(...), 6)`, `:147`) — though `parseInt('abc')` yields `NaN`, and `Math.min(NaN, 6)` is `NaN`, which is then sent to Amazon as `itemCount: null`.
- **Recommendation:** Allow-list `q` against the three query strings actually used in the app (or hash+bound it), add rate limiting, and default `count` safely when `parseInt` returns `NaN`. Move off the service key: this route only needs read/write on one table, so a scoped key with RLS is sufficient.
- **Verification / pass criterion:** `?q=<random>` returns 400 and writes no row; `?count=abc` sends a valid integer to Amazon.

---

- **ID:** SEC-008
- **Title:** The Supabase client is constructed at module scope with non-null assertions, so a missing env var breaks the route at import time
- **Fact:** `src/app/api/amazon-books/route.ts:7-10`:
  ```js
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  ```
  This runs when the module is imported. The Stripe routes explicitly avoid this pattern with a documented lazy initialiser and a comment explaining that module-level construction *"throws … failing the build"* (`checkout/route.ts:6-19`, `stripe-webhook/route.ts:6-19`) — the lesson was learned for Stripe and not applied to Supabase.
- **Control status:** **Confirmed.** Neither variable is present in `.env.local`.
- **Attack or failure scenario:** If either variable is missing or wrong in Netlify, the route fails at import rather than returning a handled error, and the failure surfaces as an opaque function crash rather than the graceful empty-products path the code intends (`:168-170`).
- **Impact:** Operational fragility on the affiliate-revenue path, plus loss of the designed graceful degradation exactly when it is needed.
- **Recommendation:** Apply the same lazy-getter pattern already used in both Stripe routes, and return the empty-products response when configuration is absent.
- **Verification / pass criterion:** With `SUPABASE_URL` unset, `/api/amazon-books?q=test` returns `{ products: [] }` with HTTP 200 rather than crashing.

---

- **ID:** SEC-009
- **Title:** The subscribe rate limiter is per-instance, unbounded in memory, and keyed on a spoofable header
- **Fact:** `src/app/api/subscribe/route.ts:10` — `const rateLimitMap = new Map<string, {count, resetAt}>()` — module-scoped, with entries written at `:33` and `:37` and **never deleted**; expired entries are overwritten only if the same IP returns. The key comes from `req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'` (`:29`) — the **first**, i.e. client-supplied, element of the chain.
- **Control status:** **Confirmed.** The code comment at `:5-7` is candid that this is best-effort, but the header-trust and unbounded-growth issues are not acknowledged.
- **Attack or failure scenario:** (a) `X-Forwarded-For: <random>` on each request defeats the limit entirely — on a proxied platform the trustworthy value is the *last* entry, not the first. (b) Every distinct spoofed value allocates a permanent Map entry, so a sustained attack grows the function's heap until the instance is recycled. (c) All requests from behind a shared NAT/corporate proxy collapse onto one key, so three legitimate colleagues exhaust the hourly quota for everyone.
- **Impact:** The one rate limit in the codebase is bypassable by design and is itself a slow memory-exhaustion vector.
- **Recommendation:** Use the platform-provided client IP (Netlify's `x-nf-client-connection-ip`) rather than the first `X-Forwarded-For` element. Evict expired entries on write, or cap the Map size. Prefer a shared store, since a per-instance limiter provides little protection on serverless.
- **Verification / pass criterion:** Rotating `X-Forwarded-For` values does not raise the effective request ceiling.

---

- **ID:** SEC-010
- **Title:** No admin, debug or test route is reachable in production — confirmed clean
- **Fact:** A grep for `admin`, `debug`, `/test` and `localhost` across `src/` and `scripts/` returns only two false positives inside blog prose (`posts.ts:1123` "life admin", `:2371` "administrative"). The API surface is exactly the twelve routes inventoried at the top of this section. Commit `91e2240` in the recent history is *"chore: remove amazon debug route"*, and that removal is complete — no residue remains.
- **Control status:** **Confirmed absent.**
- **Attack or failure scenario:** N/A.
- **Impact:** Positive. This class of exposure is closed.
- **Recommendation:** No action. Consider a CI grep to keep it that way.
- **Verification / pass criterion:** The grep above stays clean on `main`.

---

- **ID:** SEC-011
- **Title:** No security headers are configured — no CSP, HSTS, X-Frame-Options or Referrer-Policy
- **Fact:** `next.config.js` (13 lines) contains only an `images.remotePatterns` block and no `headers()` function. `netlify.toml` (7 lines) contains only build and plugin config, with no `[[headers]]` section. No `middleware.ts` exists anywhere in the repo.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** No CSP means any injected script executes freely — and the app has several injection-adjacent surfaces: `dangerouslySetInnerHTML` for JSON-LD on two pages (`about/page.tsx:37`, `blog/[slug]/page.tsx:109`), an inline GA4 script (`layout.tsx:64-71`), a regex-based HTML parser that constructs anchors from post body text (`blog/[slug]/page.tsx:33-52`), and pervasive inline styles. No `X-Frame-Options`/`frame-ancestors` means the site can be framed for clickjacking, which matters for the one-click "Unlock" button that grants premium.
- **Impact:** No defence in depth. Each individual surface is currently low risk (the blog corpus is repo-controlled), but the combination of "no CSP" and "hand-rolled HTML parsing of content" is the classic setup for a future XSS to become fully exploitable.
- **Recommendation:** Add a `headers()` block in `next.config.js` with a CSP (nonce-based or `strict-dynamic`; note GA4 needs `googletagmanager.com`), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` and HSTS. Start in report-only mode.
- **Verification / pass criterion:** `curl -I https://portalastra.com` returns all five headers.

---

- **ID:** SEC-012
- **Title:** Dependency scan — 8 high-severity advisories, 0 critical; the Next.js advisories have no fix within the 14.x line
- **Fact:** `npm audit` (read-only, no install) on the committed lockfile: **8 high, 0 critical, 0 moderate, 0 low.**

  | Package | Installed | Severity | Fix available |
  |---|---|---|---|
  | `next` | 14.2.35 | high | **16.3.0 (major)** |
  | `postcss` | (transitive) | high | via next 16.3.0 (major) |
  | `nanoid` | ≤3.3.16 | high | yes, non-major |
  | `js-yaml` | 4.0.0–4.3.0 | high | yes, non-major |
  | `brace-expansion`, `glob`, `@next/eslint-plugin-next`, `eslint-config-next` | dev only | high | yes |

  The `next` advisories are mostly DoS, cache-poisoning and SSRF classes affecting middleware, rewrites, Server Actions, the Image Optimizer and RSC cache. **Mitigating context specific to this app:** there is no `middleware.ts`, no rewrites in `next.config.js`, no Server Actions, no custom server, and no `next/image` usage (every image is a plain `<img>`), which removes the preconditions for most of the listed advisories. 14.2.35 is above the fixed versions for CVE-2025-29927 (middleware auth bypass, fixed 14.2.25) and the 14.2.30–14.2.32 cache-poisoning/SSRF fixes.
- **Control status:** **Confirmed** — audit output above. Per-advisory applicability to this app is **Inferred** from the absence of the relevant features.
- **Attack or failure scenario:** The realistic residual risk is the Image Optimizer and RSC-cache classes, which apply to any self-hosted/adapter-hosted Next.js app. On Netlify, `@netlify/plugin-nextjs` mediates these paths, which changes but does not eliminate exposure.
- **Impact:** Moderate. No critical vulnerability and no unpatched advisory whose preconditions this app meets. The pressure point is that staying on 14.x means new advisories will increasingly have no non-major fix.
- **Recommendation:** Apply the non-major fixes now (`nanoid`, `js-yaml`, dev-only chain) — zero risk. Plan the Next 15/16 upgrade as scheduled work rather than an emergency; the app is small (25 source files) and uses no removed APIs, so the migration should be modest. Add `npm audit --audit-level=critical` to CI.
- **Verification / pass criterion:** `npm audit` reports 0 critical and 0 non-dev high after the non-major fixes; the major upgrade is tracked as an issue.

---

## Section PRIV: Privacy, Data Capture & Compliance

**Email capture and flow map** (every point an email address is read or written):

| Capture point | File | Destination |
|---|---|---|
| Homepage newsletter form | `page.tsx:500-524` → `/api/subscribe` | MailerLite (Free group) |
| `/moon` subscribe form | `MoonClient.tsx:343-356` → `/api/subscribe` | MailerLite (Free group) |
| `/calendars` planting waitlist | `CalendarsClient.tsx:270-283` → `/api/subscribe` | MailerLite (Free group) |
| Premium unlock (Sky tab) | `page.tsx:795-813` → `/api/verify-premium` | MailerLite (read) |
| Premium unlock (`/calendars`) | `CalendarsClient.tsx:301-319` → `/api/verify-premium` | MailerLite (read) |
| Stripe Checkout | `CheckoutClient.tsx:40-44` → `/api/checkout` | **Stripe** |
| Stripe webhook | `stripe-webhook/route.ts:39-54` | **MailerLite (Paid group)** |

Downstream processors receiving personal data: **MailerLite** (Lithuania/EU + US), **Stripe** (US/Ireland), **Google Analytics 4** (US), and indirectly **Netlify** (US, server logs). **Anthropic**, **Supabase** and **Amazon** receive no personal data (verified: no email or birth date is passed to any of them).

---

- **ID:** PRIV-001
- **Title:** The privacy policy states the site uses no tracking cookies while GA4 loads unconditionally on every page
- **Fact:** `src/app/privacy/page.tsx:65-69`:
  > *"Portal Astra does not use advertising or cross-site tracking cookies. **The only browser storage we rely on is the local preference data described above.**"*

  `src/app/layout.tsx:59-71` loads `googletagmanager.com/gtag/js?id=G-QMJ074E2JZ` and runs `gtag('config', …)` in the root layout — on every page, for every visitor, with no consent gate, no opt-out and no cookie banner anywhere in the repo. GA4 sets the `_ga` and `_ga_<id>` first-party cookies. Additionally, `localStorage` holds `pa_sign` and `pa_premium_verified`, and `sessionStorage` holds `pa_tarot_notice` — the policy describes only "star sign and similar preferences".
- **Control status:** **Confirmed.** Direct, unambiguous contradiction between the published policy text and `layout.tsx`.
- **Attack or failure scenario:** No attack. A visitor reads an explicit assurance that is false as written.
- **Impact:** The most serious compliance issue found. A published privacy policy that misstates tracking is a misrepresentation under the Australian Privacy Act (APP 1 and APP 5 — open and transparent management, notification of collection) and, for any EU/UK visitor, a straightforward ePrivacy consent failure. This is materially worse than having no policy at all, because the false statement is affirmative.
- **Recommendation:** Either (a) disclose GA4 accurately — name the processor, the cookies, the retention, the purpose, and add a consent mechanism for EU/UK visitors; or (b) remove GA4. Given 17 sessions in 28 days, option (b) is worth genuine consideration: the analytics yield is near zero and it is currently the single largest compliance liability on the site. Also correct the browser-storage list to include `pa_premium_verified` and `pa_tarot_notice`.
- **Verification / pass criterion:** The cookies actually set on a fresh visit are exactly those the policy lists.

---

- **ID:** PRIV-002
- **Title:** Four of the five third-party processors are undisclosed in the privacy policy
- **Fact:** `src/app/privacy/page.tsx:54-63` names exactly **two**: MailerLite and NASA Open APIs (the latter receives no personal data). Undisclosed:
  - **Stripe** — receives name, email, and full payment details at checkout (`checkout/route.ts:25-40`)
  - **Google Analytics 4** — receives IP, device, page views, behaviour (`layout.tsx:60-71`)
  - **Amazon Associates** — affiliate links carrying `tag=blasdigital-22` (`amazon-books/route.ts:113`, `CalendarsClient.tsx:427`), which set Amazon's tracking on click
  - **Supabase** — product cache only, no personal data, but an undisclosed data store nonetheless
  - **Netlify** — hosting; server logs may contain email addresses (see PRIV-006)

  The policy also states *"We use your email address **solely** to deliver the newsletter"* (`:49-52`) — but the same address is also the credential for premium access (`verify-premium/route.ts`) and is transmitted to Stripe for billing.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** No attack. A customer paying by card has no disclosure that their data goes to Stripe, and the affiliate relationship is disclosed only in small print on the product component (`AmazonProductRow.tsx:91-93`), not in the policy.
- **Impact:** APP 5 requires notification of the purposes of collection and the types of entities to which data is disclosed. The "solely" claim is factually incorrect on two counts.
- **Recommendation:** Rewrite the third-party section to list every processor with its purpose and jurisdiction. Correct "solely" to reflect billing and premium verification. Add the affiliate disclosure to the policy, not only to the component.
- **Verification / pass criterion:** Every entity in the flow map at the head of this section appears in the policy.

---

- **ID:** PRIV-003
- **Title:** No cross-border disclosure at all, despite every processor being overseas
- **Fact:** `src/app/privacy/page.tsx` contains no mention of overseas transfer, offshore storage, or foreign jurisdiction. The site is unambiguously Australian-targeted: prices in AUD (`pricing/page.tsx:78`), `locale: 'en_AU'` (`layout.tsx:25`), `toLocaleString('en-AU')` throughout, and an `amazon.com.au` marketplace (`amazon-books/route.ts:64`). Every processor is offshore — Stripe (US/IE), MailerLite (EU/US), Google (US), Netlify (US), Supabase (US/EU).
- **Control status:** **Confirmed absent.**
- **Attack or failure scenario:** No attack. **APP 8** requires an APP entity to take reasonable steps to ensure an overseas recipient does not breach the APPs, and APP 5 requires disclosing the likelihood of overseas disclosure and the countries involved. Neither is present.
- **Impact:** A specific, named compliance gap under the Australian Privacy Act for an AU-facing paid service. (Whether the entity meets the small-business turnover threshold determines whether the APPs bind it — but as a paid service collecting personal information, planning to comply is the safer posture, and voluntary APP compliance is expected of consumer subscription products.)
- **Recommendation:** Add an "Overseas disclosure" section naming each recipient and its country. If EU/UK visitors are in scope, add the corresponding transfer-mechanism language.
- **Verification / pass criterion:** The policy names every recipient country.

---

- **ID:** PRIV-004
- **Title:** No double opt-in and no independent unsubscribe path exist in code
- **Fact:** `src/app/api/subscribe/route.ts:48-59` POSTs to MailerLite's `/api/subscribers` with `{ email, groups }` and no `status` field, so the subscriber's confirmation state is whatever the MailerLite group is configured to do. Nothing in code requests a confirmation email. Unsubscribe is delivered solely through MailerLite's `{$unsubscribe}` merge tag, present and correct in all three email templates (`generate-weekly-digest.js:415`, `check-eclipse-alerts.js:237`, `generate-monthly-forecast.js:367`). There is no unsubscribe page, no preference centre, and no route accepting an unsubscribe request. The Stripe webhook adds subscribers to the Paid group directly (`stripe-webhook/route.ts:50-53`), bypassing any opt-in step entirely.
- **Control status:** **Confirmed for code. Requires a MailerLite dashboard check** to determine whether double opt-in is enabled on the two groups (`189583616610666425` Free, `189884548570416247` Paid).
- **Attack or failure scenario:** Anyone can enter a third party's address in any of the three forms and, if double opt-in is off, subscribe them without consent. The rate limit permits 3 per IP per hour and is bypassable (SEC-009).
- **Impact:** Under the Spam Act 2003 (Cth), consent is required and the sender must be able to evidence it. Without double opt-in there is no consent record. The Paid-group addition is defensible (transactional, arising from a purchase), but the marketing digest to the Free group is not, absent confirmed opt-in.
- **Recommendation:** Confirm double opt-in is enabled on the Free group in the MailerLite dashboard; if not, enable it and set `status: 'unconfirmed'` explicitly in the API call so intent is visible in code. Consider a `/unsubscribe` page as a processor-independent path.
- **Verification / pass criterion:** Subscribing a fresh address produces a confirmation email and no campaign delivery until it is confirmed.

---

- **ID:** PRIV-005
- **Title:** The birth-date privacy claim is accurate — both calculators are entirely client-side (verified)
- **Fact:** `src/app/privacy/page.tsx:43-46` states birth dates are *"used only in your browser to compute a number and is never sent to or stored by us"*. Verified true for both inputs:
  - Homepage: `birthDate` state (`page.tsx:266`) → `lifePathNumber()` (`:182-200`, pure) → `ANGEL_NUMBER_MEANINGS` lookup (`:295`). No fetch.
  - `/calendars`: `day`/`month`/`year` state (`CalendarsClient.tsx:110-112`) → `lifePath()`, `getSign()` (`:38-73`, pure) → local tables. No fetch.

  No route, script or component transmits a birth date. There is no Supabase table for user data (the only table is `portal_astra_product_cache`). Confirmed by the parallel finding AI-008: no birth-date AI feature exists.
- **Control status:** **Confirmed accurate.**
- **Attack or failure scenario:** N/A.
- **Impact:** Positive — the most sensitive data type the site touches is genuinely never collected. Worth protecting deliberately if the birth-forecast feature is ever built.
- **Recommendation:** No change. If a server-side birth-date feature is added, the policy must be updated **in the same change**; consider a CI guard that fails if a birth-date value reaches a `fetch` call.
- **Verification / pass criterion:** Network tab shows no request containing the birth date when the calculator is used on either page.

---

- **ID:** PRIV-006
- **Title:** GA4 cannot capture an email or birth date as an event parameter — but MailerLite error responses may put emails in server logs
- **Fact:** GA4 is configured with a bare `gtag('config', GA_MEASUREMENT_ID)` (`layout.tsx:69`) and no custom `gtag('event', …)` call exists anywhere in the repo. Default GA4 collection captures `page_location` (the full URL). No email or birth date ever enters a URL: all three subscribe forms POST JSON bodies, both premium unlocks POST JSON, and both birth-date calculators are pure client state. Search terms on `/blog` are local state, not query parameters (`BlogIndex.tsx:23`).

  Server-side, however: `src/app/api/subscribe/route.ts:62-63` logs MailerLite's raw error body — `` console.error(`[subscribe] MailerLite error ${res.status}: ${detail}`) `` — and MailerLite 422 validation responses typically echo the submitted email. `stripe-webhook/route.ts:63` logs the entire Stripe subscription object (`console.log('Subscription cancelled:', event.data.object)`), which contains customer identifiers.
- **Control status:** **Confirmed** for GA4 (negative — no exposure). **Confirmed** for the logging paths.
- **Attack or failure scenario:** Email addresses accumulate in Netlify function logs, which have their own retention, access model and jurisdiction — and are not mentioned anywhere in the privacy policy.
- **Impact:** Low severity, but it is undisclosed personal-data processing in a third location, and log data is easy to forget in a deletion request.
- **Recommendation:** Log `res.status` only, or redact the email before logging. Log `event.data.object.id` rather than the whole Stripe object. Add hosting-provider logs to the policy.
- **Verification / pass criterion:** Trigger a MailerLite 422 and confirm no email appears in the function log.

---

- **ID:** PRIV-007
- **Title:** The privacy policy is stale, self-identified as boilerplate, and names no legal entity
- **Fact:** `src/app/privacy/page.tsx:24` — *"Last updated: 7 June 2026"* — predating the Stripe, Supabase, Amazon and premium-tier integrations. `:11-13` carries a source comment that is candid about its status:
  > `// NOTE: This is a sensible default policy reflecting what the site actually does … Replace the copy below with your own legally reviewed text if required.`

  The policy names no legal entity, no ABN and no postal address — only a Gmail address (`:92`). There is no stated retention period, no described deletion process beyond "contact us", no data-breach commitment, and no terms of service anywhere in the repo (no `/terms` route exists) despite a recurring subscription with a 30-day refund promise (`pricing/page.tsx:93-95`).
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** A subscriber requests deletion under APP 12/13 and there is no defined process; the operator must manually reconcile MailerLite, Stripe, GA4 and Netlify logs with no runbook.
- **Impact:** Compounds PRIV-001 through PRIV-004. A paid subscription product with a refund commitment and no terms of service is exposed on the contractual side as well as the privacy side.
- **Recommendation:** Have the policy reviewed against what the code now does (this section is a usable input), add the entity name and ABN, add retention and deletion sections, and publish terms of service covering the subscription, the refund promise and the entertainment-purposes framing (which links to AI-009).
- **Verification / pass criterion:** The policy's "Last updated" date is later than the most recent integration commit, and every claim in it is traceable to code.

---

## Section SALES: Monetization & Funnel Integrity

**Full chain trace** (Stripe → webhook → MailerLite → verify → unlock):

```
/pricing  CheckoutButton (CheckoutClient.tsx:36)
  → POST /api/checkout           ✅ creates Stripe session, price_1Th5W3EzKt7FGdkFCQDVz6BM
  → Stripe Checkout (hosted)     ✅ collects card + email
  → success_url /pricing?success=true                    ✅ banner renders (CheckoutClient.tsx:17-21)
  → webhook checkout.session.completed
      ├─ signature verified                              ✅ SEC-001
      ├─ email = customer_email ?? customer_details.email ✅
      └─ POST MailerLite → Paid group 189884548570416247 ⚠️  SALES-001 response never checked
                                                          ⚠️  SALES-002 Free group never added
  → user manually enters email on Sky tab or /calendars
  → POST /api/verify-premium → MailerLite group check    ⚠️  SEC-002 no proof of ownership
  → localStorage pa_premium_verified, 30-day expiry      ⚠️  SEC-003 forgeable
  → isPremium gates ritual prompt / planting / guides    ⚠️  SALES-006, SALES-007 still say "Coming Soon"
```

Every hop is wired to the next — there is **no dead end** in the happy path — but three hops have unhandled failure modes and the post-purchase handoff is entirely manual.

---

- **ID:** SALES-001
- **Title:** If the MailerLite call inside the Stripe webhook fails, the failure is silently discarded and the customer never gets access
- **Fact:** `src/app/api/stripe-webhook/route.ts:43-57`:
  ```js
  try {
    await fetch('https://connect.mailerlite.com/api/subscribers', { … })
  } catch (e) {
    console.error('MailerLite error:', e)
  }
  return NextResponse.json({ received: true })   // always 200
  ```
  The `fetch` response is **never inspected** — `res.ok` is not checked, the status is not read, the body is not parsed. `fetch` only rejects on network failure, so a MailerLite 401 (bad key), 422 (validation), 429 (rate limit) or 500 resolves normally and the handler proceeds as if it succeeded. Even in the `catch` branch it returns HTTP 200, so **Stripe never retries**. Contrast `/api/subscribe`, which checks `res.ok` correctly (`subscribe/route.ts:61`).
- **Control status:** **Confirmed.** This is exactly the brief's question, and the answer is: caught only for network errors, never retried, silently dropped in every other case.
- **Attack or failure scenario:** MailerLite has a brief outage or rate-limits the key at the moment a customer completes payment. The card is charged, Stripe records a successful subscription, the customer sees *"Welcome to Portal Astra Premium. Check your email for next steps."* (`CheckoutClient.tsx:19`) — and they are never added to the Paid group. When they later enter their email to unlock, `/api/verify-premium` returns `isPaid: false` and shows *"This email is not linked to an active Astra Premium subscription."* (`page.tsx:444`). They have paid and are told they have not.
- **Impact:** The highest-severity revenue defect: silent, unrecoverable-without-manual-intervention loss of a paying customer's access, with no alert to the operator. There is no reconciliation job comparing Stripe subscriptions against MailerLite Paid-group membership, so the failure is invisible until the customer complains or churns.
- **Recommendation:** Check `res.ok`; on failure return a non-2xx status so **Stripe's automatic retry** (up to 3 days) takes over — this is the mechanism the integration is currently declining to use. Add a reconciliation script comparing active Stripe subscriptions to the Paid group, run on the existing daily cron.
- **Verification / pass criterion:** With an invalid `MAILERLITE_API_KEY`, `stripe trigger checkout.session.completed` produces a non-2xx webhook response and appears in the Stripe dashboard as failed-and-retrying.

---

- **ID:** SALES-002
- **Title:** Paying customers never receive the weekly digest, which Premium promises as part of "Everything in Free"
- **Fact:** The Stripe webhook adds the customer to **only** the Paid group — `groups: ['189884548570416247']` (`stripe-webhook/route.ts:52`). The weekly digest campaign targets **only** the Free group — `GROUP_ID = '189583616610666425'` (`generate-weekly-digest.js:10`, used at `:445`). The pricing page lists *"Weekly cosmic digest email"* as a Free feature (`pricing/page.tsx:26`) and the Premium tier's first bullet is *"Everything in Free"* (`:32`).
- **Control status:** **Confirmed** by comparing the two group IDs and the campaign targeting.
- **Attack or failure scenario:** A visitor who subscribes to the newsletter first and *then* pays is in both groups and is fine. A visitor who goes straight to `/pricing` and pays is in the Paid group only — and never receives the weekly digest they were told they would get. The Stripe → premium path is the more likely one for a converting user.
- **Impact:** A stated Premium entitlement is not delivered to a subset of paying customers, determined by the order in which they happened to interact with the site. It also means those customers receive email from Portal Astra only monthly, weakening the retention loop the digest exists to create.
- **Recommendation:** Add both group IDs in the webhook (`groups: [FREE_GROUP_ID, PAID_GROUP_ID]`), or target the digest at both groups. Move the two hardcoded group IDs — currently repeated across `stripe-webhook/route.ts:52`, `verify-premium/route.ts:25`, `check-eclipse-alerts.js:17`, `generate-monthly-forecast.js:11` and `generate-weekly-digest.js:10` — into shared constants.
- **Verification / pass criterion:** A test purchase results in membership of both groups, and the next digest send includes that address.

---

- **ID:** SALES-003
- **Title:** No code path removes anyone from the Paid group on cancellation or refund, and the localStorage grant adds up to 30 more days
- **Fact:** `src/app/api/stripe-webhook/route.ts:61-64`:
  ```js
  if (event.type === 'customer.subscription.deleted') {
    // Future: remove from paid group on cancellation
    console.log('Subscription cancelled:', event.data.object)
  }
  ```
  A stub. No `charge.refunded`, `customer.subscription.updated` or `invoice.payment_failed` handler exists. No MailerLite `DELETE` or group-removal call appears anywhere in the repo. Compounding it: on successful verification the client writes a **30-day** grant (`page.tsx:439`, `CalendarsClient.tsx:197` — `Date.now() + 30 * 24 * 60 * 60 * 1000`) and the premium check reads only that local expiry (`page.tsx:333-345`) — it never re-verifies against the server.
- **Control status:** **Confirmed.** The brief asks whether such a path exists and whether it works: it exists as a comment and does nothing.
- **Attack or failure scenario:** A customer subscribes, unlocks, then cancels or requests the advertised 30-day refund (`pricing/page.tsx:93-95`). They remain in the MailerLite Paid group indefinitely, so they keep receiving premium monthly forecasts and eclipse alerts forever, and can re-unlock any browser at any time via `/api/verify-premium`. Even if removal were implemented today, their existing localStorage grant keeps web access for up to 30 more days.
- **Impact:** Paid entitlements are effectively permanent after a single payment. Combined with the full-refund offer, one payment plus one refund yields indefinite free premium — with the refund path actively advertised on the pricing page.
- **Recommendation:** Implement the `customer.subscription.deleted` and `charge.refunded` handlers to remove the subscriber from the Paid group. Shorten the localStorage grant to ~24 hours and re-verify against the server on load (this depends on fixing SEC-002/SEC-003, otherwise re-verification is itself forgeable).
- **Verification / pass criterion:** Cancelling a test subscription removes the address from the Paid group within one webhook delivery, and premium features lock within the grant window.

---

- **ID:** SALES-004
- **Title:** Eclipse alerts are marked "coming soon" on the pricing page but are live, sending, and producing false claims
- **Fact:** `src/app/pricing/page.tsx:36` — `{ label: 'Eclipse and supermoon email alerts 7 days prior', comingSoon: true }` — renders as *"(coming soon)"* (`:85-87`). Meanwhile `.github/workflows/eclipse-alerts.yml` runs **daily at 09:00 UTC** and `scripts/check-eclipse-alerts.js` creates and schedules real MailerLite campaigns to the Paid group (`:253-310`). The feature is shipped, unlabelled, and — per DATA-005 — astronomically wrong.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** A paying subscriber receives an email announcing a "Lunar Eclipse" for a feature the pricing page told them was not yet available, on a date with no eclipse.
- **Impact:** Two defects at once: the pricing page understates what is delivered, and what is delivered is incorrect. The unlabelled surprise makes the wrong content harder to explain.
- **Recommendation:** Disable the workflow until DATA-005 is fixed, then remove the `comingSoon` flag. Do not ship the flag removal before the astronomy fix.
- **Verification / pass criterion:** The workflow is disabled, or the pricing page and the cron agree on the feature's status and the detection matches a real eclipse table.

---

- **ID:** SALES-005
- **Title:** Two fully built premium features are still labelled "Coming Soon" to the paying members who have access to them
- **Fact:** Both features are complete and gated correctly, yet still advertised as unbuilt:
  - `src/app/moon/MoonClient.tsx:99-100` — the `GUIDE` carousel marks *"Daily Ritual Prompts"* and *"Planting Calendar"* with `locked: true`, and `renderGuideCard` (`:206-220`) renders the *"🔒 Coming Soon — Premium"* overlay **unconditionally** — it never consults `isPremium`, even though `isPremium` is already computed in the same component (`:111`, `:126-134`) and used correctly ten lines later to render `IntentionGuides` (`:328-333`).
  - `src/app/calendars/CalendarsClient.tsx:265` — the non-premium planting card reads *"Coming Soon — Astra Premium"* even though `PlantingCalendar` is fully implemented (391 lines) and rendered for premium users directly above at `:257-260`.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** A member who has paid, unlocked, and is actively using the planting calendar on `/calendars` navigates to `/moon` and is told the planting calendar is coming soon and locked.
- **Impact:** The paid experience actively contradicts itself, on the two pages the premium features live on. For a customer evaluating whether to keep paying in month two, this reads as an unfinished product.
- **Recommendation:** In `MoonClient.renderGuideCard`, render the unlocked variant when `isPremium` is true (the value is already in scope). On `/calendars`, change the pre-purchase copy from "Coming Soon" to a value proposition, since the feature ships today.
- **Verification / pass criterion:** With premium unlocked, no "Coming Soon" or lock icon appears on `/moon` or `/calendars`.

---

- **ID:** SALES-006
- **Title:** The success page promises a follow-up email that no code sends
- **Fact:** `src/app/pricing/CheckoutClient.tsx:19` — *"Welcome to Portal Astra Premium. **Check your email for next steps.**"* The webhook adds the address to a MailerLite group (`stripe-webhook/route.ts:44-54`) and nothing else. No welcome campaign, no automation trigger, and no transactional send exists in the repo. Whether a MailerLite automation fires on group entry is a **dashboard question, not a code one** — nothing in the repo configures it.
- **Control status:** **Confirmed in code. Requires a MailerLite dashboard check** for a group-entry automation on group `189884548570416247`.
- **Attack or failure scenario:** The customer waits for instructions that never arrive. The actual next step is buried in small print further down the same page — *"visit the Sky tab or Calendars page and enter your email to unlock"* (`pricing/page.tsx:107-111`) — which they have likely already scrolled past, and which is *below* the banner telling them to check their email.
- **Impact:** The highest-intent moment in the funnel, immediately post-payment, hands the customer an instruction that leads nowhere. Combined with SALES-001 (where the group addition may have silently failed), a customer can be paid-up, uninstructed, and locked out simultaneously.
- **Recommendation:** Either configure the MailerLite welcome automation and verify it fires, or change the banner to give the unlock instruction inline — it is two sentences and needs no email round trip. The inline option is strictly more reliable and removes a dependency.
- **Verification / pass criterion:** A test purchase either receives a welcome email within five minutes, or the success banner itself states the unlock steps.

---

- **ID:** SALES-007
- **Title:** The eclipse-alert cron's de-duplication state cannot persist, so every alert sends up to three times
- **Fact:** `scripts/check-eclipse-alerts.js:38` writes its sent-alert state to `path.join(__dirname, 'eclipse-alert-state.json')`, read at `:314-325` and written at `:327-329,376`. That file is **gitignored** — `.gitignore:44` — and the workflow does a fresh `actions/checkout@v4` on a clean ephemeral runner every day with no cache, artifact or commit step (`.github/workflows/eclipse-alerts.yml:12-24`). The state file therefore never exists at the start of a run: `loadState()` writes an empty object and returns `{}` every time. The send window is `daysAway >= 6 && daysAway <= 8` (`:353`), i.e. **three consecutive daily runs** match the same event.
- **Control status:** **Confirmed.** The de-duplication check at `:355` (`if (state[event.dateISO])`) can never be true.
- **Attack or failure scenario:** For any detected event, the daily cron creates and schedules a MailerLite campaign to the entire Paid group on three consecutive days — three near-identical (but independently AI-generated, so subtly different) emails announcing the same event.
- **Impact:** Triple-sending to paying subscribers is a direct unsubscribe and spam-complaint driver, and it triples the Anthropic and MailerLite cost per event. Currently masked only because DATA-005 means no events are detected until January 2027 — the two defects are hiding each other, and fixing detection without fixing state would immediately produce triple sends.
- **Recommendation:** Persist state outside the runner — Supabase (already in the stack), a GitHub Actions cache, or a committed file. Or make it stateless: narrow the window to exactly `daysAway === 7` so only one run can match. The narrowing is a one-character change and is the right immediate mitigation.
- **Verification / pass criterion:** Simulating three consecutive runs across the 6–8 day window creates exactly one campaign.

---

- **ID:** SALES-008
- **Title:** "Early access to new features" is a listed premium benefit with no mechanism behind it
- **Fact:** `src/app/pricing/page.tsx:38` lists *"Early access to new features"* as a Premium bullet, without a `comingSoon` flag. No feature-flag system, staged-rollout mechanism, or premium-only preview path exists in the repo. `isPremium` gates exactly three things: the ritual prompt (`page.tsx:865`), the planting calendar (`CalendarsClient.tsx:257`) and the intention guides (`MoonClient.tsx:328`) — all of which are separately listed benefits.
- **Control status:** **Confirmed absent.**
- **Attack or failure scenario:** No attack. An unfalsifiable benefit claim on a paid tier.
- **Impact:** Minor individually; it contributes to a pricing page where — counting SALES-004 and SALES-005 — three of seven Premium bullets are misaligned with what the code does.
- **Recommendation:** Remove the bullet, or define what it means operationally (e.g. premium users see new features one release before free users) and build the flag to support it.
- **Verification / pass criterion:** Every Premium bullet maps to a specific gated code path.

---

- **ID:** SALES-009
- **Title:** The email used to purchase and the email used to unlock are never reconciled
- **Fact:** `CheckoutClient.tsx:43` posts `{ email: '' }`, so `customer_email` is `undefined` (`checkout/route.ts:28`) and Stripe collects the address itself at checkout. The webhook then adds `session.customer_email || session.customer_details?.email` to the Paid group (`stripe-webhook/route.ts:39`). Later, the user types an address into the unlock box (`page.tsx:795-813`) which is matched against MailerLite. Nothing links the two, and nothing warns the user they must match.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** A customer pays with a personal address at Stripe (or lets a browser autofill pick a different one) and later types their work address into the unlock box. `/api/verify-premium` returns `isPaid: false` and they are told *"This email is not linked to an active Astra Premium subscription."* — with no hint that the fix is trying another address. The only recourse is the support Gmail (`pricing/page.tsx:123`).
- **Impact:** A support-load and churn driver at the activation step, entirely invisible to the operator because a failed unlock produces no log, no metric and no alert.
- **Recommendation:** Capture the email on the pricing page before checkout, pass it as `customer_email`, and show it in the success banner: *"Use name@example.com to unlock."* Change the failure message to name the likely cause: *"No subscription found for that address — try the email you used at checkout."*
- **Verification / pass criterion:** The success banner echoes the purchasing email, and a mismatched unlock attempt returns actionable guidance.

---

## Section UX: Complexity, Fragility & Untapped Opportunity

Context for every finding below: **17 sessions in the last 28 days.** That is roughly one visitor every other day, against three scheduled cron jobs, five external API integrations, a Supabase cache and 35 embedded blog posts.

---

- **ID:** UX-001
- **Title:** Core domain logic is copy-pasted across up to five locations, and every copy has already drifted
- **Fact:** Four distinct bodies of logic exist in multiple hand-maintained copies, and in **every** case the copies now disagree:

  | Logic | Copies | Drift |
  |---|---|---|
  | Moon phase | 4 (`utils.ts:1`, `MoonClient.tsx:35`, `CalendarsClient.tsx:20`, `Navbar.tsx:15`) + `generate-weekly-digest.js:80` | **DATA-001** — disagree on 60/60 days |
  | Life path | 2 (`page.tsx:197`, `CalendarsClient.tsx:38`) | **DATA-002** — 13.6% of dates |
  | Angel number | 2 (`utils.ts:16`, `generate-weekly-digest.js:505`) | **DATA-003** — 53 days/year |
  | 78-card tarot deck | 3 (`tarot.ts:21`, `generate-weekly-digest.js:14`, `generate-monthly-forecast.js:15`) | **AI-011, AI-012** — different selection algorithms |
  | DONKI type/intensity tables | 3 (`donki/route.ts:43`, `page.tsx:21-57`, `generate-weekly-digest.js:112-125`) | **AI-014** — script version misclassifies |
  | Premium localStorage read | 3 (`page.tsx:333`, `CalendarsClient.tsx:137`, `MoonClient.tsx:126`) | identical today |
  | MailerLite group IDs | 5 literals across routes and scripts | identical today |
- **Control status:** **Confirmed.** Every duplication was read and compared; five of seven have measurably diverged.
- **Attack or failure scenario:** No attack. The `scripts/` directory cannot import from `src/` (plain Node, no build step, no `tsconfig` path resolution), so duplication was a reasonable initial workaround. The cost has now been paid: it is the direct root cause of six separate confirmed data defects in this audit.
- **Impact:** This is the single highest-leverage structural finding in the report. Fixing DATA-001, DATA-002, DATA-003, AI-011, AI-012 and AI-014 individually is six patches that will drift again. Fixing the duplication fixes all six permanently.
- **Recommendation:** Create `shared/` as plain `.js` (or a small build step emitting JS from the TS sources) holding: moon phase, life path, angel number, the tarot deck with its draw functions, the DONKI tables, and the group-ID constants. Import from both `src/` and `scripts/`. Roughly a day's work; it retires six confirmed defects and prevents the next six.
- **Verification / pass criterion:** `grep -c "KNOWN_NEW_MOON\|new Date('2000-01-06')"` returns 1 across the repo; the same for the tarot deck definition.

---

- **ID:** UX-002
- **Title:** MailerLite is a single point of failure for premium access, all three email products, and every signup form
- **Fact:** One credential, `MAILERLITE_API_KEY`, is load-bearing for: `/api/subscribe` (all three signup forms), `/api/verify-premium` (**the only** premium authorisation check), the Stripe webhook's fulfilment step, and all three cron email jobs. `verify-premium/route.ts:20-22` treats any non-OK response as `isPaid: false` — it does not distinguish "not a subscriber" from "MailerLite is unreachable".
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** MailerLite has an outage or the key is rotated. Every paying customer whose 30-day localStorage grant has expired is told *"This email is not linked to an active Astra Premium subscription"* — the product tells its customers they have not paid. Simultaneously all signup forms 503 and all scheduled emails fail. Second-order: the outage-time fulfilment failures are silently dropped (SALES-001).

  Other single points of failure, in order of blast radius: `ANTHROPIC_API_KEY` (ritual prompt + APOD simplification + all three emails); `NASA_API_KEY` (Space, Earth, Solar and NEOs tabs — 4 of 7 tabs); `SUPABASE_SERVICE_KEY` (all affiliate rows, and the route crashes at import without it, SEC-008); `horoscope-app-api.vercel.app` (an unattributed third-party service backing the Stars tab, with static fallbacks — `horoscope/route.ts:12-25` — the best-handled dependency in the app).
- **Impact:** A third-party email marketing platform is the de facto identity provider for a paid product. That coupling is the structural risk, more than any individual outage.
- **Recommendation:** At minimum, distinguish "verification unavailable" from "not a subscriber" in `/api/verify-premium` and render a maintenance message instead of a denial — a small change that converts the worst failure mode into an acceptable one. Longer term, hold entitlement in the app's own store (Supabase is already provisioned) with MailerLite as a downstream sync rather than the source of truth.
- **Verification / pass criterion:** With MailerLite unreachable, the unlock UI says "temporarily unavailable", not "not a subscriber".

---

- **ID:** UX-003
- **Title:** Manual steps required to keep the system correct, beyond the Pinterest token named in the brief
- **Fact:** Five manual maintenance obligations, none documented in the repo:
  1. **Eclipse date list** — `MoonClient.tsx:72-77`, hand-maintained, currently stale (DATA-004), silently empties after Aug 2027.
  2. **Amazon cache query list** — `refresh-amazon-cache.js:17-27` must be kept in sync with `AmazonProductRow` placements by hand; the file's own comment says *"Update this list if you add new placements"*. It has **already drifted** — see UX-004.
  3. **Eclipse-alert state file** — must be persisted manually or alerts triple-send (SALES-007).
  4. **Stripe price ID and displayed prices** — three sources of truth requiring manual sync (DATA-010).
  5. **MailerLite group IDs** — five hardcoded literals across routes and scripts.

  On the Pinterest item specifically: **no Pinterest API integration exists in this repo.** There are static share links (`page.tsx:110`, `Footer.tsx:69`, `MoonClient.tsx:397-404`, `blog/[slug]/page.tsx:133`) and a `p:domain_verify` meta tag (`layout.tsx:54`), none of which need a token. If a Pinterest token refresh is a live manual step, it belongs to a system outside this repository.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** Each is a silent-degradation path — none fails loudly, and there is no runbook, no README and no `docs/`.
- **Impact:** For a solo-operated project, five undocumented recurring obligations is the mechanism by which the site quietly stops being correct.
- **Recommendation:** Add a `MAINTENANCE.md` listing each item, its cadence and its failure symptom. Then eliminate them in order of cost: (3) is a one-character fix, (2) can be derived from code, (1) needs a real eclipse table, (4) and (5) are constants extraction (UX-001).
- **Verification / pass criterion:** `MAINTENANCE.md` exists and each item either has an owner and cadence or has been automated away.

---

- **ID:** UX-004
- **Title:** Two thirds of the nightly Amazon cache warming is for queries no page ever requests
- **Fact:** `scripts/refresh-amazon-cache.js:17-27` warms **nine** query keys. The entire app contains **three** `AmazonProductRow` placements:
  - `pricing/page.tsx:69` — `"cosmic spiritual journal"`, count 1
  - `MoonClient.tsx:366` — `"moon phases astrology guide"`, count 3
  - `CalendarsClient.tsx:438` — `"numerology life path guide"`, count 3

  The other six — `lunar living ritual`, `astrology self care zodiac`, `space science NASA books`, `tarot deck beginners`, `astrology beginners guide`, `mercury retrograde astrology` — are requested by nothing. They are fetched from Amazon and written to Supabase nightly and never read.
- **Control status:** **Confirmed** by cross-referencing every `searchQuery=` usage against the warm list.
- **Attack or failure scenario:** No attack. Placements were removed or renamed and the refresh list was not updated — the exact drift UX-003 item 2 predicts.
- **Impact:** Two thirds of the nightly Amazon API budget and two thirds of the Supabase cache rows are waste. Minor in absolute terms, useful as evidence that the manual sync obligation is already failing.
- **Recommendation:** Trim to the three live queries. Better: export the placement list from a shared constant that both the components and the refresh script consume, so drift becomes impossible.
- **Verification / pass criterion:** The refresh script's query list is derived from, or asserted equal to, the set of `searchQuery` values in `src/`.

---

- **ID:** UX-005
- **Title:** Data fetched or computed but never displayed
- **Fact:**
  - `element_count` — `/api/asteroids` returns it (`asteroids/route.ts:42`) and the client destructures only `d.asteroids` (`page.tsx:329`). NASA's own total for the day is fetched and dropped, while the UI renders `asteroids.length`.
  - `moon.age` and `moon.frac` — computed in `MoonClient.tsx:42`; `age` is shown but `frac` feeds only the incorrect distance formula (DATA-007).
  - `anomDistanceKm` — a correct anomalistic-distance function (`MoonClient.tsx:49-53`) used only for supermoon detection, never displayed, while the wrong figure is shown instead (DATA-007).
  - `source: 'planting-waitlist'` — sent by `CalendarsClient.tsx:173`, ignored by `/api/subscribe`. Waitlist and newsletter signups are indistinguishable in MailerLite, so the planting waitlist cannot be segmented or converted.
  - `NASA_API_KEY` — imported by `check-eclipse-alerts.js:14` and never used (its own comment says "reserved").
  - `MAILERLITE_GROUP_ID` — read at `subscribe/route.ts:41` and optional (`:57`); absent from `.env.local`, so local signups land in no group at all.
  - 66 of 78 tarot cards are unreachable in the monthly email; 25 of 78 in the weekly (AI-011, AI-012).
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** No failure. Opportunity cost.
- **Impact:** The `source` field is the most valuable of these: a segmented planting waitlist is a ready-made launch list for the feature that is already built and shipping (SALES-005). It is being collected and discarded.
- **Recommendation:** Implement `source` as a MailerLite custom field or group — it is already being sent, so this is server-side only. Display `element_count` ("12 of 34 tracked today"). Wire `anomDistanceKm` to the distance card.
- **Verification / pass criterion:** Planting waitlist signups are distinguishable in MailerLite.

---

- **ID:** UX-006
- **Title:** Removal and simplification candidates for current traffic levels
- **Fact:** Ranked by maintenance cost against demonstrated value at 17 sessions/28 days:

  | Candidate | Evidence | Recommendation |
  |---|---|---|
  | **Eclipse-alert cron** | Wrong astronomy (DATA-005), triple-sends (SALES-007), advertised as "coming soon" (SALES-004), detects nothing until Jan 2027 | **Disable now.** Net-negative in its current state. |
  | **GA4** | 17 sessions/28 days; the single largest compliance liability (PRIV-001) | Remove, or disclose properly. Data yield does not justify the exposure. |
  | **Amazon + Supabase integration** | 3 live placements, 9 warmed queries, a service-key public write path (SEC-007), silent failure (DATA-009), an OAuth token cache and a nightly cron | Consider replacing with static affiliate links (`CalendarsClient.tsx:427` already uses one successfully). Removes a whole service, a credential and a cron. |
  | **Parallax star layer** | `page.tsx:359-367` — a scroll listener writing `transform` on every frame | Replace with CSS `background-attachment` or delete. |
  | **Auto-scrolling carousels** | `MoonClient.tsx:286-325` — two infinite carousels with duplicated arrays and pause buttons | A static grid is more accessible and simpler. |
  | **`personalDraw` unlimited redraw** | `page.tsx:204-220`, `:1006-1012` — redrawable without limit | Fine as-is; noted as the least essential of the three tarot features. |
  | **Root-level working docs** | `blog-expansion-instructions.md`, `blog-qa-audit.md`, `blog-roundtable-reviews.md` (~2,500 lines of internal editorial notes, publicly visible on GitHub) | Move to a `docs/` folder or a private location. |
- **Control status:** **Confirmed** for what each item costs; **Inferred** for the value judgement, which is the operator's call.
- **Attack or failure scenario:** No attack. Every item is a maintenance obligation on a system with one visitor every other day.
- **Impact:** The build is roughly one order of magnitude more complex than current traffic requires. That is a legitimate choice for a growth bet — but each of these carries a real defect this audit found, so the complexity is actively costing correctness rather than merely sitting idle.
- **Recommendation:** Disable the eclipse cron today (highest harm, lowest cost to stop). Decide on GA4 as part of the PRIV-001 fix. Treat the rest as an optional simplification pass after the DATA and SALES fixes land.
- **Verification / pass criterion:** The eclipse workflow is disabled or fixed; a decision on GA4 is recorded.

---

- **ID:** UX-007
- **Title:** No tests, no CI, and no error monitoring anywhere in the repo
- **Fact:** No test files (no `*.test.*`, no `*.spec.*`), no test runner in `package.json` (scripts are `dev`, `build`, `start`, `lint`), no CI workflow beyond the three cron jobs — none of which runs `npm run build` or `npm run lint`. No Sentry or equivalent. Every error path in the app terminates at `console.error`, which on Netlify means function logs nobody reads.
- **Control status:** **Confirmed.**
- **Attack or failure scenario:** Every silent failure in this report — the dropped MailerLite fulfilment (SALES-001), the empty Amazon rows (DATA-009), the blank ritual prompt (AI-004), the failed premium unlock (SALES-009) — is invisible to the operator by construction. That is why several have plausibly been live for some time without being noticed.
- **Impact:** The defects in this audit are not individually subtle; they are undetected because nothing is looking. Fixing them without adding detection means the next set will also go unnoticed.
- **Recommendation:** In priority order: (1) a `push` workflow running `npm run build` and `npm run lint`; (2) unit tests for the shared calculation module from UX-001 — moon phase, life path, angel number, tarot draw — which is where six confirmed defects live and where tests are cheapest; (3) error reporting on the revenue path (`stripe-webhook`, `verify-premium`, `checkout`) even if only an email on failure.
- **Verification / pass criterion:** CI runs on every push; a deliberately broken calculation fails the build.

---

## Summary

**Total findings: 61** — AI 16, DATA 14, SEC 12, PRIV 7, SALES 9, UX 7.

**Confirmed clean** (worth stating explicitly): the Stripe webhook signature verification is correct (SEC-001); no admin, debug or test route is reachable (SEC-010); the subscribe honeypot exists and works (SEC-004, contradicting the brief's prior finding); birth dates genuinely never leave the browser and the privacy policy's claim about them is accurate (PRIV-005); the sitemap covers every live route with no orphans (DATA-011); zodiac date boundaries are correct and consistent (DATA-012); the Amazon cache cannot serve past its TTL (DATA-009); no critical CVE applies (SEC-012).

**Highest priority, in order:**

1. **SALES-001** — paying customers can be silently denied access; return non-2xx so Stripe retries. *One-line fix, direct revenue impact.*
2. **DATA-001** — the Navbar shows a different moon phase from the page body on every page, every day.
3. **PRIV-001** — the privacy policy affirmatively denies tracking that is running.
4. **SEC-002 / SEC-003** — knowing a subscriber's email grants their premium access; localStorage entitlement is forgeable in one line.
5. **AI-007** — every weekly digest ever sent has been seven days stale.
6. **SALES-007 + DATA-005** — disable the eclipse-alert cron: wrong astronomy, and it will triple-send the moment detection is fixed.
7. **DATA-002** — the same birth date yields different Life Path numbers on two pages the site links between.
8. **UX-001** — the shared-module extraction that permanently retires six of the above.

**Verification that could not be done from this session** (needs a dashboard or live check, deliberately excluded per the brief): MailerLite double opt-in status on both groups (PRIV-004); whether a Paid-group welcome automation exists (SALES-006); which hostname production resolves to (DATA-011); real 2026 Mercury retrograde dates against an ephemeris (DATA-013); real eclipse dates against NASA's catalogue (DATA-004, DATA-005).
