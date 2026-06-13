/**
 * refresh-amazon-cache.js
 * Run nightly via GitHub Actions to pre-warm the Supabase cache
 * so pages never cold-load against the Amazon API.
 *
 * Add to GitHub Actions workflow:
 *   - name: Refresh Amazon cache
 *     run: node scripts/refresh-amazon-cache.js
 *     env:
 *       SITE_URL: ${{ secrets.SITE_URL }}
 */

const SITE_URL = process.env.SITE_URL || 'https://portalastra.com'

// Every query key used in AmazonProductRow across the site
// Update this list if you add new placements
const QUERIES = [
  { q: 'moon phases astrology guide', count: 3 },
  { q: 'lunar living ritual', count: 3 },
  { q: 'numerology life path guide', count: 3 },
  { q: 'astrology self care zodiac', count: 3 },
  { q: 'space science NASA books', count: 3 },
  { q: 'tarot deck beginners', count: 3 },
  { q: 'astrology beginners guide', count: 3 },
  { q: 'mercury retrograde astrology', count: 3 },
  { q: 'cosmic spiritual journal', count: 1 },
]

async function refreshQuery(q, count) {
  const params = new URLSearchParams({ q, count: count.toString() })
  const url = `${SITE_URL}/api/amazon-books?${params}&force=1`

  try {
    const res = await fetch(url)
    const data = await res.json()
    const status = data.source === 'api' ? 'refreshed' : 'already fresh'
    console.log(`[OK] "${q}" — ${data.products?.length ?? 0} products (${status})`)
  } catch (err) {
    console.error(`[FAIL] "${q}" — ${err.message}`)
  }
}

async function main() {
  console.log(`Refreshing ${QUERIES.length} Amazon cache entries...`)
  for (const { q, count } of QUERIES) {
    await refreshQuery(q, count)
    // Small delay to avoid hammering the API
    await new Promise(r => setTimeout(r, 500))
  }
  console.log('Done.')
}

main()
