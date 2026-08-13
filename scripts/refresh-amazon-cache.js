/**
 * refresh-amazon-cache.js
 * Pre-warms the Supabase cache so pages never cold-load against the Amazon API.
 *
 * Scheduled daily by .github/workflows/amazon-refresh.yml, matching the
 * 24-hour CACHE_TTL_HOURS in src/app/api/amazon-books/route.ts. It previously
 * described itself as nightly while actually running as a step inside the
 * weekly digest workflow, so the cache was refreshed once a week against a
 * 24-hour TTL and sat expired six days out of seven.
 */

const SITE_URL = process.env.SITE_URL || 'https://portalastra.com'

// Every query key actually used by an <AmazonProductRow> in the app, found by
// searching src/ for `searchQuery=`. This list previously carried nine entries;
// six of them ("lunar living ritual", "astrology self care zodiac", "space
// science NASA books", "tarot deck beginners", "astrology beginners guide",
// "mercury retrograde astrology") were not rendered anywhere, so the nightly
// job was paying for Amazon calls and filling Supabase rows nothing ever read.
//
// This list must stay in sync with ALLOWED_QUERIES in
// src/app/api/amazon-books/route.ts. Anything not on that allow-list is
// rejected with a 400.
const QUERIES = [
  { q: 'moon phases astrology guide', count: 3 }, // src/app/moon/MoonClient.tsx
  { q: 'numerology life path guide', count: 3 },  // src/app/calendars/CalendarsClient.tsx
  { q: 'cosmic spiritual journal', count: 1 },    // src/app/pricing/page.tsx
]

// force=1 is now implemented server-side (it was sent but ignored, so this job
// silently did nothing whenever the cache entry was still under 24h old, which
// on a nightly schedule is always).
async function refreshQuery(q, count) {
  const params = new URLSearchParams({ q, count: count.toString(), force: '1' })
  const url = `${SITE_URL}/api/amazon-books?${params}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) {
      console.error(`[FAIL] "${q}" responded ${res.status}`)
      return false
    }
    if (data.source !== 'api') {
      // With force=1 the route must go to the API. Anything else means the
      // parameter stopped working again.
      console.error(`[WARN] "${q}" returned source="${data.source}" despite force=1`)
    }
    console.log(`[OK] "${q}": ${data.products?.length ?? 0} products refreshed`)
    return true
  } catch (err) {
    console.error(`[FAIL] "${q}": ${err.message}`)
    return false
  }
}

async function main() {
  console.log(`Refreshing ${QUERIES.length} Amazon cache entries...`)
  let failures = 0
  for (const { q, count } of QUERIES) {
    const ok = await refreshQuery(q, count)
    if (!ok) failures++
    // Small delay to avoid hammering the API
    await new Promise(r => setTimeout(r, 500))
  }
  console.log(`Done. ${QUERIES.length - failures}/${QUERIES.length} refreshed.`)
  // Exit non-zero so a failing warm job shows as a red run rather than passing
  // quietly, which is how the broken force parameter went unnoticed.
  if (failures > 0) process.exit(1)
}

main()
