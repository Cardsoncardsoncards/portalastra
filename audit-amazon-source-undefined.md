# Audit: Amazon refresh returns source="undefined" and 0 products

Date: 13 August 2026
Scope: diagnosis only. No code changed; working tree is clean apart from the
pre-existing untracked `deno.lock`.

**Headline:** `source="undefined"` is not a bug in how `source` is set. It is
the signature of the route's catch block, which returns a response that has no
`source` field at all. Something inside `fetchFromAmazon()` is throwing on every
call in production. The credentials are present and both Amazon endpoints are
reachable, so the remaining candidates are an invalid/unapproved credential or a
malformed search request — and distinguishing those requires one line from the
production log, which I could not retrieve from here (see AMZ-S03).

---

## AMZ-S01 — `source` is undefined because the error path omits it entirely

- **Fact:** `/api/amazon-books` has three return statements. Two set `source`;
  the third, the catch block, does not. A response with no `source` key
  deserialises to `data.source === undefined` in the caller.
- **Evidence:** `src/app/api/amazon-books/route.ts`

  ```
  199   return NextResponse.json({ products: cached.products, source: 'cache', fetchedAt: cached.cachedAt })
  210   return NextResponse.json({ products, source: 'api', fetchedAt: new Date().toISOString() })
  ...
  211   } catch (err) {
  214     console.error('[amazon-books] Error:', err instanceof Error ? err.message : 'Unknown error')
  217     return NextResponse.json(
  218       { products: [], error: 'Recommendations are temporarily unavailable.' },
  219       { status: 200 },
  220     )
  ```

  There is no fourth path. `products: []` **and** `source: undefined` together
  can only be produced by lines 217–220.
- **What is inside the `try`:** `getCachedProducts` (skipped when `force=1`),
  `fetchFromAmazon`, and `setCachedProducts`. Any throw from any of the three
  lands here. `fetchFromAmazon` throws explicitly at two points:
  - `route.ts:57` — `Amazon auth failed ${res.status}: ${errText}`
  - `route.ts:97` — `Amazon search failed ${res.status}: ${errText}`
- **Impact:** The real Amazon error is captured (line 214) but never surfaces in
  the response, so the warm job and the browser both see a successful-looking
  200 with an empty list. The symptom you are chasing is by design; the
  design just makes the cause invisible from outside.
- **Recommended fix:** Add `source: 'error'` to the catch response. It preserves
  the "degrade quietly" behaviour for the product row while letting the warm job
  and any future diagnostic distinguish "cache empty" from "call failed".

## AMZ-S02 — The warm job reports success on a total failure, so the workflow goes green

- **Fact:** `refreshQuery()` treats any non-`res.ok` as failure. The route
  returns **200** on the error path, so the job logs `[OK] … 0 products
  refreshed`, returns `true`, and the workflow exits 0.
- **Evidence:** `scripts/refresh-amazon-cache.js`

  ```
  41    if (!res.ok) {                                   // never true: the route returns 200
  42      console.error(`[FAIL] "${q}" responded ${res.status}`)
  43      return false
  44    }
  45    if (data.source !== 'api') {
  48      console.error(`[WARN] "${q}" returned source="${data.source}" despite force=1`)
  49    }                                                 // <- warns, then falls through
  50    console.log(`[OK] "${q}": ${data.products?.length ?? 0} products refreshed`)
  51    return true                                       // <- counted as success
  ```

  The `[WARN]` at line 48 is where your `source="undefined"` string is coming
  from — it interpolates the missing field directly.
- **Impact:** This is why "the workflow completes successfully" despite total
  failure. The exit-non-zero logic added at lines 68–70 specifically so a broken
  warm job would show red cannot fire, because `failures` never increments. The
  cache has been empty for every query and nothing has flagged it.
- **Recommended fix:** Make `data.source !== 'api'` a failure (`return false`),
  not a warning. Optionally also treat `data.products.length === 0` as failure,
  since a successful refresh that returns nothing is not a useful cache entry.

## AMZ-S03 — Could not capture the raw Amazon response: the credentials are not in this environment

- **Fact:** Step 2 of the brief could not be carried out as written. The Amazon
  credentials are not present locally, so running
  `node scripts/refresh-amazon-cache.js` here cannot exercise them, and adding
  temporary logging to the route would have captured nothing. **No temporary
  logging was added, and therefore none needed removing.**
- **Evidence:**
  - `.env.local` contains exactly two keys: `NASA_API_KEY` and
    `NEXT_PUBLIC_SITE_URL`. No `AMAZON_*`, no `SUPABASE_*`.
  - `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET` and `AMAZON_ASSOCIATE_TAG` are
    all empty in the shell environment.
  - `scripts/refresh-amazon-cache.js:13` defaults `SITE_URL` to
    `https://portalastra.com`, so running the script unmodified drives
    **production**, not local code, and would not exercise local logging anyway.
- **Where the raw response already is:** production is *already* logging exactly
  what was asked for. `route.ts:214` writes the full thrown message, and both
  throw sites embed the Amazon status code and raw body
  (`Amazon auth failed 401: {...}`). One line from the Netlify function log
  settles AMZ-S04 immediately.
- **How to get it:** `netlify logs:function` is interactive and prompts for a
  function name, so it cannot run from this session. Run it yourself with
  `! netlify logs:function`, or open
  https://app.netlify.com/projects/portal-astra/logs/functions and filter for
  `[amazon-books]`. Trigger a call first with:
  `curl "https://portalastra.com/api/amazon-books?q=cosmic%20spiritual%20journal&count=1"`

## AMZ-S04 — Credentials: present and correctly named; validity unconfirmed

- **Fact:** Every environment variable the code needs is set in the production
  context, with the names the code actually reads. The failure is therefore not
  a missing or misnamed variable.
- **Evidence** (values masked by the Netlify CLI; only the last four characters
  are shown, nothing sensitive was retrieved):

  | Variable | Production | Read at |
  |---|---|---|
  | `AMAZON_CLIENT_ID` | `****4d89` | `route.ts:49` |
  | `AMAZON_CLIENT_SECRET` | `****a125` | `route.ts:50` |
  | `AMAZON_ASSOCIATE_TAG` | `blasdigital-22` | `route.ts:6` |
  | `SUPABASE_URL` | `https://owaroeqchreuffbyakqx.supabase.co` | `supabase.ts:16` |
  | `SUPABASE_SERVICE_KEY` | `****tKn4` | `supabase.ts:17` |

  Note `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` are *not* set,
  but nothing reads them — `src/lib/supabase.ts:17` reads
  `SUPABASE_SERVICE_KEY`, which is set. **Supabase is correctly configured**, so
  a throw from `setCachedProducts` is ruled out as the cause.
- **The associate tag is plausible:** `blasdigital-22` carries the `-22` suffix
  used by the Australian marketplace, matching the
  `marketplace: 'www.amazon.com.au'` sent at `route.ts:85` and the
  `x-marketplace` header at `route.ts:77`. Nothing here looks wrong.
- **Impact:** Rules out the simplest explanations. Does not confirm the secret
  is still *valid* — an expired, rotated or unapproved credential presents
  identically from outside.

## AMZ-S05 — Both Amazon endpoints are reachable and behave correctly; the hostnames are not the problem

- **Fact:** I probed both endpoints directly with deliberately invalid
  credentials. Both resolve, both accept the request shape the code sends, and
  both return well-formed API errors rather than network failures. This rules
  out DNS, the unusual `.amazon` TLD, a wrong path, and any transport-level
  cause.
- **Evidence — real captured responses:**

  DNS:
  ```
  api.amazon.com      -> 98.82.161.183, 98.82.160.207, 98.82.161.168, 98.82.158.57
  creatorsapi.amazon  -> 18.65.244.6, 18.65.244.97, 18.65.244.28, 18.65.244.56
  ```

  Auth endpoint, POST with the exact JSON body shape from `route.ts:47–52` and
  a deliberately invalid client id/secret:
  ```
  HTTP 401
  {"error_description":"Client authentication failed","error":"invalid_client"}
  ```

  Search endpoint, POST with no bearer token:
  ```
  HTTP 401
  {"message":"The authentication token is invalid or malformed",
   "reason":"InvalidToken","type":"UnauthorizedException"}
  ```

  Production, all three allow-listed queries (`curl`, 13 August 2026):
  ```
  GET /api/amazon-books?q=moon%20phases%20astrology%20guide&count=3
  HTTP 200  {"products":[],"error":"Recommendations are temporarily unavailable."}

  GET /api/amazon-books?q=numerology%20life%20path%20guide&count=3
  HTTP 200  {"products":[],"error":"Recommendations are temporarily unavailable."}

  GET /api/amazon-books?q=cosmic%20spiritual%20journal&count=3
  HTTP 200  {"products":[],"error":"Recommendations are temporarily unavailable."}
  ```

  All three return the catch-block body with no `source` key, confirming AMZ-S01
  in production for every query, not just in the warm job.
- **Impact:** Narrows the cause to something that requires valid credentials to
  observe: either the credential itself, or the search request's shape.

## AMZ-S06 — Remaining candidates, in order of likelihood

With env vars present, Supabase healthy, endpoints reachable, the allow-list
correct and `force=1` honoured, the failure is one of:

1. **Invalid, rotated or expired `AMAZON_CLIENT_SECRET`** — produces
   `Amazon auth failed 401: {"error":"invalid_client"}`, exactly the body my
   probe returned with a bad secret. Most likely, and cheapest to test.
2. **Credentials valid but the app is not approved for the Creators API**, or
   the `creatorsapi::default` scope (`route.ts:51`) is not granted — typically a
   401/403 at the auth step or a 403 at search.
3. **Search request shape rejected** — auth succeeds, `searchItems` 400s. The
   request mixes what look like Product Advertising API field names
   (`searchIndex`, `partnerTag`, `partnerType`, the dotted `resources` array at
   `route.ts:86–91`) with a Creators API endpoint. If the Creators API expects a
   different schema this fails on every call regardless of credentials.
4. **Associate tag not linked to the AU marketplace for this account** — less
   likely given the `-22` suffix matches, but it would surface as a search-time
   rejection.

The production log line distinguishes these in one read: `Amazon auth failed`
means 1 or 2; `Amazon search failed` means 3 or 4, and the status code and body
name which.

---

## Summary

| ID | Finding | Status |
|---|---|---|
| AMZ-S01 | `source` undefined = the catch block, which omits the field | Confirmed |
| AMZ-S02 | Warm job counts a 200-with-empty-list as success, so CI stays green | Confirmed |
| AMZ-S03 | Raw Amazon response not capturable locally; no creds in this environment | Blocked, route documented |
| AMZ-S04 | All required env vars present and correctly named; Supabase healthy | Confirmed |
| AMZ-S05 | Both endpoints reachable, correct hostnames and request shape accepted | Confirmed |
| AMZ-S06 | Cause is credential validity or search-request schema; needs the prod log | Open |

**Nothing was fixed, per the brief.** The two changes I would make first, once
the log line identifies the root cause, are AMZ-S01 (`source: 'error'`) and
AMZ-S02 (fail the warm job on a non-`api` source) — both independent of whatever
the underlying Amazon fault turns out to be, and both are what let this sit
unnoticed.
