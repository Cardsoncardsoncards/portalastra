# Audit: share buttons, share accuracy, Amazon state

Date: 13 August 2026
Scope: read-only investigation. No code was changed.

---

## 1. Share button duplication

### SHARE-001 — There is no shared share-button component; five separate implementations exist

- **Fact:** The share row is copy-pasted, not imported. Five independent
  implementations render social share buttons, written separately and drifting
  from each other.
- **Evidence:**

  | Implementation | File | Line | Buttons |
  |---|---|---|---|
  | `Footer` share row | `src/components/Footer.tsx` | 28–91 | Facebook, X, WhatsApp, Reddit, Pinterest, Instagram, Copy Link |
  | `ShareButtons` (homepage-local) | `src/app/page.tsx` | 168–255 | Facebook, Post, WhatsApp, Reddit, Pinterest, Instagram, Copy Link |
  | `ShareRow` (calendars-local) | `src/app/calendars/CalendarsClient.tsx` | 51–67 | Facebook, X, WhatsApp, Reddit, Copy Link |
  | Blog "Pin it" | `src/app/blog/[slug]/page.tsx` | 131–141 | Pinterest only |
  | Moon "Pin this on Pinterest" | `src/app/moon/MoonClient.tsx` | 355–363 | Pinterest only |

  `src/components/Footer.tsx` is imported by 11 pages
  (`page.tsx:21`, `about`, `blog`, `blog/[slug]`, `calendars`, `moon`,
  `nasa-data`, `premium/confirm`, `pricing`, `privacy`, `terms`, `not-found`),
  so its share row renders on every page in the site.
- **Impact:** Any change to the share set has to be made in five places. The
  drift is already visible: the homepage labels the X button "Post" while the
  footer labels it "X"; the homepage opens Facebook and X in a 600×400 popup
  (`openSharePopup`, `page.tsx:161`) while the footer opens a full tab; the
  calendars row has no Pinterest or Instagram button; the "Copy Link" button is
  lilac `#b8a4ff` on the homepage and purple `#7B5EA7` in the footer.
- **Recommended fix:** Extract one `<ShareRow>` component taking `text`, `url`
  and an optional set of enabled platforms. Replace all five call sites. This is
  a refactor with no behaviour change if the union of current props is preserved.

### SHARE-002 — The doubled row Samuel observed: homepage renders its own share row *and* the footer's

- **Fact:** This is the cause of the duplicate. It is not one component
  rendered twice by accident, and it is not two different features that merely
  look alike. It is two different components that render a near-identical set of
  seven buttons, stacked about fifteen lines apart in the same tree.
- **Evidence:** `src/app/page.tsx`:

  ```
  1038   {/* Share row, reflects the active tab, rendered at the bottom of every panel */}
  1039   <ShareButtons text={shareTitle} url={shareUrl} />
  ...
  1054   <Footer />
  ```

  Resulting DOM on every homepage tab:

  ```
  <div class="shareRow">   ← page.tsx:1039, ShareButtons (page.tsx:168)
    Facebook · Post · WhatsApp · Reddit · Pinterest · Instagram · Copy Link
  </div>
  <footer class="footer">  ← page.tsx:1054, Footer (Footer.tsx:28)
    <div class="shareRow">
      Facebook · X · WhatsApp · Reddit · Pinterest · Instagram · Copy Link
    </div>
    ...
  </footer>
  ```

  Both rows carry the same seven platforms in the same order. The only visible
  differences are the X/Post label and the Copy Link shade.
- **Scope — which pages are affected:**
  - **Homepage, every tab including Sky and the APOD (`space`) tab:** two rows.
    `ShareButtons` at line 1039 sits outside every `{tab === '...'}` block, so it
    renders for all seven tabs, and `<Footer />` always renders below it.
  - **Homepage, Tarot tab after "Draw my cards":** **three** rows — a third
    `ShareButtons` renders inside the personal-draw block at `page.tsx:987`,
    then the tab row at 1039, then the footer row.
  - **Calendars, Birth tab after a life-path result:** two rows —
    `ShareRow` at `CalendarsClient.tsx:355` plus the footer row at 367.
  - **Blog post pages:** a Pinterest-only row at `blog/[slug]/page.tsx:131`
    plus the full footer row at 158. Less visually obvious, still two rows.
  - **Moon page:** a Pinterest-only block at `MoonClient.tsx:355` plus the
    footer row at 368.
- **Impact:** Visitors see the same seven buttons twice, once with tab-specific
  share text and once with generic text (see SHARE-004). On the Tarot tab they
  see them three times. It reads as a rendering bug rather than a feature.
- **Recommended fix:** Decide which row is canonical. The page-level rows carry
  accurate, context-specific text and the footer row does not, so the
  straightforward fix is to drop the share row from `Footer.tsx` and keep the
  page-level rows, adding one to the pages that would otherwise lose it
  (`about`, `nasa-data`, `pricing`, `privacy`, `terms`, `blog` index). The
  alternative — keep the footer row, delete the page rows — is less work but
  loses the per-tab share text.

---

## 2. Share popup accuracy

### SHARE-003 — Every non-blog page shares the same generic Open Graph card

- **Fact:** What Facebook, Pinterest and LinkedIn actually display in the
  preview card comes from the Open Graph tags at the shared URL, not from the
  parameters in the share intent. Only two files in the app define Open Graph
  data, so every page except a blog post shares an identical card: title
  "Portal Astra", the site logo, and a generic description.
- **Evidence:**
  - `src/app/layout.tsx:19–34` defines the only site-wide `openGraph` block:
    `title: 'Portal Astra'`, `description: 'Where science meets the stars...'`,
    `url: 'https://portalastra.com'`,
    `images: ['/images/portalastralogohorizontal.png']`.
  - `src/app/blog/[slug]/page.tsx:18–30` is the **only** page-level
    `generateMetadata` that sets `openGraph`. It sets `title`, `description`,
    `type` and `url` — but **no `images`**, so blog posts inherit the layout's
    logo.
  - `/moon`, `/calendars`, `/pricing`, `/privacy`, `/terms`, `/about`,
    `/nasa-data` each export a `metadata` object with `title` and `description`
    only, no `openGraph`. Next.js does not synthesise `og:title` from `title`,
    so these fall through to the layout values entirely.
  - `src/app/page.tsx:1` is `'use client'` and exports no metadata at all. The
    homepage therefore always serves the layout's Open Graph block regardless of
    which tab is active.
- **Impact:** A visitor on the Sky tab clicks Facebook. The intent carries
  `quote="Tonight is a Waxing Gibbous moon, Portal Astra"`, but the card
  Facebook renders is titled "Portal Astra" with the horizontal logo image and
  the description "Where science meets the stars." The share text and the share
  card disagree. The same is true of every tab, and of the moon, calendars and
  pricing pages. Blog posts get a correct title and description but the same
  logo image as everything else, so a feed of shared Portal Astra links is
  visually identical regardless of what was shared.
- **Secondary evidence — `og:url` is hardcoded:** `layout.tsx:22` sets
  `url: 'https://portalastra.com'` and `alternates.canonical` likewise
  (`layout.tsx:17`). Every page except a blog post therefore advertises the
  homepage as its canonical and Open Graph URL. Facebook attributes engagement
  to the homepage rather than the page actually shared.
- **Secondary evidence — Twitter card is fully static:** `layout.tsx:35–41`
  hardcodes `title: 'Portal Astra'`, a generic description and the logo image.
  No page, including blog posts, overrides it.
- **Recommended fix:** Add per-page `openGraph` (and `twitter`) blocks with a
  page-specific `title`, `description`, `url` and, where one exists, a relevant
  image. For the homepage, the tab state lives in a client component, so the
  card cannot vary per tab without either server-rendering the tab or accepting
  one static homepage card — the realistic target is one accurate homepage card
  rather than seven. For blog posts, add an `images` entry to the existing
  `generateMetadata`.

### SHARE-004 — Footer share text is the generic site title on most pages

- **Fact:** `Footer` shares `shareText || title`, and `title` defaults to
  `'Portal Astra'`. Three of the eleven call sites pass a meaningful value; the
  rest share the literal string "Portal Astra".
- **Evidence:**
  - `src/components/Footer.tsx:8` — `{ title = 'Portal Astra', shareText }`,
    and `:12` — `const text = shareText || title`.
  - Call sites that pass something useful:
    `blog/[slug]/page.tsx:158` (`shareText={`${post.title}, portalastra.com`}`),
    `calendars/CalendarsClient.tsx:367` (`title="Cosmic Calendars"`),
    `moon/MoonClient.tsx:368` (`title="Moon Phase Calendar"`).
  - Call sites that pass nothing or only the default:
    `page.tsx:1054` (`<Footer />` — bare), `privacy`, `terms`, `pricing`,
    `about`, `nasa-data`, `premium/confirm`, `blog` index, `not-found`.
- **Impact:** On the homepage the two stacked share rows carry *different* text:
  the page row says "Tonight is a Waxing Gibbous moon, Portal Astra" and the
  footer row directly beneath it says "Portal Astra". Two adjacent buttons with
  the same label produce different tweets.
- **Recommended fix:** Resolved automatically by consolidating to one share row
  (SHARE-002). If the footer row is kept, pass a real `shareText` from every
  page.

### SHARE-005 — Calendars share row hardcodes the URL

- **Fact:** The calendars share row shares a hardcoded production URL rather
  than the page's actual location.
- **Evidence:** `src/app/calendars/CalendarsClient.tsx:49` —
  `const CALENDARS_URL = 'https://portalastra.com/calendars'`, used as the share
  URL at `:54` and copied to the clipboard at `:56`. Compare
  `page.tsx:328–329` and `Footer.tsx:15–17`, which both read
  `window.location.href`.
- **Impact:** Correct in production by coincidence. On a Netlify deploy preview
  or `localhost` the button silently shares the live site instead of the page
  the user is on, and any query string or `#birth` hash is dropped, so a shared
  life-path result links to the top of the calendars page.
- **Recommended fix:** Read `window.location.href` in an effect, as the other
  two implementations already do.

### Share targets — what each button actually sends

Traced from `src/app/page.tsx:170–252` (homepage row) and
`src/components/Footer.tsx:30–90` (footer row):

| Button | URL param | Text param | Card content comes from |
|---|---|---|---|
| Facebook | `u=` shared URL | `quote=` (homepage only) | Open Graph tags at the URL — see SHARE-003 |
| X / Post | homepage: text only, URL appended to text; footer: `url=` + `text=` | yes | `twitter:*` tags — static, SHARE-003 |
| WhatsApp | appended to `text=` | yes | Unfurled from Open Graph |
| Reddit | `url=` | `title=` | Open Graph |
| Pinterest | `url=` | `description=` | Open Graph `og:image` — always the logo |
| Instagram | none — hardcoded profile link `https://www.instagram.com/portalastra` | none | n/a: this is not a share button |
| Copy Link | `window.location.href` in both implementations | n/a | n/a — accurate |

Note the Instagram button (`page.tsx:240`, `Footer.tsx:78`) does not share the
page at all; it opens the Portal Astra profile. It sits in a row of share
buttons and looks like one.

---

## 3. Amazon state confirmation

Verified against the current working tree. **The three placements, the
allow-list and the server-side `force` handling are all correctly in place.**
One documentation/scheduling mismatch is flagged below.

### AMZ-001 — Three placements: confirmed correct

- **Fact:** Exactly three `<AmazonProductRow>` instances exist, and each matches
  the allow-list entry and the warm-job entry that names it.
- **Evidence:**

  | Page | File | Line | `searchQuery` | `count` |
  |---|---|---|---|---|
  | Moon | `src/app/moon/MoonClient.tsx` | 324–327 | `moon phases astrology guide` | default 3 |
  | Calendars | `src/app/calendars/CalendarsClient.tsx` | 357–360 | `numerology life path guide` | default 3 |
  | Pricing | `src/app/pricing/page.tsx` | 74–77 | `cosmic spiritual journal` | `1` |

  `grep -rn "searchQuery" src/` returns no fourth call site.
- **Impact:** None. Correct.

### AMZ-002 — Allow-list: confirmed correct and in sync

- **Fact:** `ALLOWED_QUERIES` contains exactly the three queries above, its
  inline comments name the correct source files, and the warm job's list matches
  including the per-query counts.
- **Evidence:**
  - `src/app/api/amazon-books/route.ts:13–17` — the three-entry `Set`, each with
    a comment naming its source file. Rejection at `:180–182` returns 400
    "Unrecognised query".
  - `scripts/refresh-amazon-cache.js:25–29` — the same three queries with counts
    `3`, `3`, `1`. Because the cache key is `${query}__${count}`
    (`route.ts:192`), the pricing entry's `count: 1` matters: it produces
    `cosmic spiritual journal__1`, which is the key the pricing page requests.
    The counts match; there is no key mismatch.
  - The `parseCount` hardening is present (`route.ts:163–167`), so `?count=abc`
    no longer sends `NaN` to Amazon or poisons the cache key.
- **Impact:** None. Correct.

### AMZ-003 — `force=1`: confirmed implemented server-side

- **Fact:** The `force` parameter is read and honoured by the route. The
  previously-reported bug (the warm job sent `force=1` and the route ignored it)
  is fixed.
- **Evidence:** `route.ts:174` — `const force = searchParams.get('force') === '1'`;
  `route.ts:195` — `if (!force) { ...return cached... }`, so a forced request
  falls through to `fetchFromAmazon` and then `setCachedProducts`. The warm job
  sends it at `scripts/refresh-amazon-cache.js:35` and warns if the response
  still reports `source !== 'api'` (`:45–49`).
- **Impact:** None. Correct.

### AMZ-004 — MISMATCH: the "nightly" warm job runs weekly, against a 24-hour cache TTL

- **Fact:** Both the route and the script describe the warm job as nightly. It
  is not scheduled nightly, or independently at all — it is the last step of the
  weekly digest workflow, which runs once a week. The cache expires after 24
  hours.
- **Evidence:**
  - `scripts/refresh-amazon-cache.js:3` — "Run nightly via GitHub Actions".
  - `src/app/api/amazon-books/route.ts:173` — "The nightly warm job passes
    force=1".
  - `.github/workflows/weekly-digest.yml:6` — `cron: '0 9 * * 0'`, i.e. Sundays
    only. Lines 37–40 run `node scripts/refresh-amazon-cache.js` as the final
    step of that job.
  - No other workflow references the script:
    `grep -rn "amazon" .github/workflows/` matches only `weekly-digest.yml:40`.
    There is no `amazon-refresh.yml`.
  - `route.ts:5` — `CACHE_TTL_HOURS = 24`, enforced at `:141–142`.
- **Impact:** The cache is warmed on Sunday and expires on Monday. For roughly
  six days out of seven, the first visitor to the moon, calendars or pricing
  page triggers a live, uncached Amazon API call and waits for it. The stated
  purpose of the script — "so pages never cold-load against the Amazon API"
  (`refresh-amazon-cache.js:4`) — is not achieved. This is a performance and
  API-quota issue, not a correctness or security one; the route degrades safely
  (`route.ts:216–219` returns 200 with an empty list).
- **Secondary point:** because the refresh is a step inside `send-digest`
  rather than its own job, a failure in the digest script at
  `weekly-digest.yml:35` aborts the job and the Amazon refresh never runs at
  all. The two are unrelated concerns sharing a failure path.
- **Recommended fix:** Either (a) move the step into its own workflow with
  `cron: '0 9 * * *'` to match the 24-hour TTL and the documented intent, or
  (b) if weekly refreshes are actually the intent, raise `CACHE_TTL_HOURS` to
  ~168 and correct the word "nightly" in both files. Option (a) matches what the
  code says it does.

---

## Summary

| ID | Area | Severity | Status |
|---|---|---|---|
| SHARE-001 | Five copy-pasted share implementations, no shared component | Medium | Confirmed |
| SHARE-002 | Homepage renders two share rows (three on Tarot after a draw) | Medium | Confirmed — this is the reported bug |
| SHARE-003 | All non-blog pages share one generic Open Graph card; blog posts share the generic image | Medium | Confirmed |
| SHARE-004 | Footer share text is "Portal Astra" on 8 of 11 pages | Low | Confirmed |
| SHARE-005 | Calendars share row hardcodes the production URL | Low | Confirmed |
| AMZ-001 | Three placements | — | Correct, no action |
| AMZ-002 | Allow-list and warm-job list in sync, counts match | — | Correct, no action |
| AMZ-003 | `force=1` honoured server-side | — | Correct, no action |
| AMZ-004 | "Nightly" warm job is scheduled weekly against a 24h TTL | Low | Mismatch |
