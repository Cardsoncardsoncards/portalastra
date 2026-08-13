import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getClientIp, rateLimit } from '@/lib/rateLimit'

const CACHE_TTL_HOURS = 24
const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'blasdigital-22'

// The complete set of queries the app actually issues. Found by searching src/
// for `searchQuery=`. Anything else is rejected: without this, /api/amazon-books
// was an open proxy that would run any keyword string a caller supplied against
// the Amazon Creators API under Portal Astra's credentials and associate tag,
// and cache the result in Supabase, one row per distinct query.
const ALLOWED_QUERIES = new Set([
  'moon phases astrology guide',   // src/app/moon/MoonClient.tsx
  'numerology life path guide',    // src/app/calendars/CalendarsClient.tsx
  'cosmic spiritual journal',      // src/app/pricing/page.tsx
])

const DEFAULT_COUNT = 3
const MAX_COUNT = 6

const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60 * 60 * 1000

interface AmazonProduct {
  asin: string
  title: string
  author: string
  price: string
  image: string
  url: string
}

// In-process token cache — avoids re-fetching on every request
let cachedToken: { value: string; expiresAt: number } | null = null

async function getAmazonToken(): Promise<string> {
  // Return cached token if still valid (with 60s safety buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value
  }

  // Creators API v3.3 (FE region) uses JSON body, not form-encoded
  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.AMAZON_CLIENT_ID!,
      client_secret: process.env.AMAZON_CLIENT_SECRET!,
      scope: 'creatorsapi::default',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Amazon auth failed ${res.status}: ${errText}`)
  }

  const data = await res.json()
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.value
}

async function fetchFromAmazon(query: string, count: number): Promise<AmazonProduct[]> {
  const token = await getAmazonToken()

  // Creators API endpoint — note the .amazon TLD and lowerCamelCase fields
  const res = await fetch('https://creatorsapi.amazon/catalog/v1/searchItems', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-marketplace': 'www.amazon.com.au',
    },
    body: JSON.stringify({
      keywords: query,
      searchIndex: 'Books',
      itemCount: count,
      partnerTag: ASSOCIATE_TAG,
      partnerType: 'Associates',
      marketplace: 'www.amazon.com.au',
      resources: [
        'images.primary.medium',
        'itemInfo.title',
        'itemInfo.byLineInfo',
        'offersV2.listings.price',
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Amazon search failed ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const items: Record<string, unknown>[] = data.searchResult?.items ?? []

  return items.map((item) => {
    const info = (item.itemInfo as Record<string, unknown>) ?? {}
    const titleData = (info.title as Record<string, unknown>) ?? {}
    const byLine = (info.byLineInfo as Record<string, unknown>) ?? {}
    const contributors = (byLine.contributors as Record<string, unknown>[]) ?? []
    const offersV2 = (item.offersV2 as Record<string, unknown>) ?? {}
    const listings = (offersV2.listings as Record<string, unknown>[]) ?? []
    const images = (item.images as Record<string, unknown>) ?? {}
    const primary = (images.primary as Record<string, unknown>) ?? {}
    const medium = (primary.medium as Record<string, unknown>) ?? {}

    const firstContributor = (contributors[0] as Record<string, unknown>) ?? {}
    const nameData = (firstContributor.name as Record<string, unknown>) ?? {}

    const firstListing = (listings[0] as Record<string, unknown>) ?? {}
    const priceData = (firstListing.price as Record<string, unknown>) ?? {}

    return {
      asin: (item.asin as string) ?? '',
      title: (titleData.displayValue as string) ?? 'Unknown title',
      author: (nameData.displayValue as string) ?? '',
      price: (priceData.displayAmount as string) ?? '',
      image: (medium.url as string) ?? '',
      url: `https://www.amazon.com.au/dp/${item.asin as string}?tag=${ASSOCIATE_TAG}`,
    }
  }).filter((p) => p.asin && p.image)
}

async function getCachedProducts(queryKey: string): Promise<{ products: AmazonProduct[]; cachedAt: string } | null> {
  const { data, error } = await getSupabase()
    .from('portal_astra_product_cache')
    .select('products, cached_at')
    .eq('query_key', queryKey)
    .maybeSingle()

  if (error || !data) return null

  const cachedAt = new Date(data.cached_at)
  const ageHours = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60)
  if (ageHours > CACHE_TTL_HOURS) return null

  return { products: data.products as AmazonProduct[], cachedAt: data.cached_at }
}

async function setCachedProducts(queryKey: string, products: AmazonProduct[]): Promise<void> {
  await getSupabase()
    .from('portal_astra_product_cache')
    .upsert(
      { query_key: queryKey, products, cached_at: new Date().toISOString(), hit_count: 0 },
      { onConflict: 'query_key' }
    )
}

/**
 * Parse the count parameter.
 *
 * `parseInt('abc', 10)` is NaN, and `Math.min(NaN, 6)` is NaN, so
 * `?count=abc` used to send `itemCount: NaN` straight through to the Amazon
 * API and poison the cache key with the string "NaN".
 */
function parseCount(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_COUNT
  return Math.min(parsed, MAX_COUNT)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get('q') ?? '').toLowerCase().trim()
  const count = parseCount(searchParams.get('count'))
  // The nightly warm job passes force=1 to bypass a still-fresh cache entry.
  const force = searchParams.get('force') === '1'

  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  if (!ALLOWED_QUERIES.has(query)) {
    return NextResponse.json({ error: 'Unrecognised query' }, { status: 400 })
  }

  const limited = rateLimit(`amazon-books:ip:${getClientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } },
    )
  }

  const queryKey = `${query}__${count}`

  try {
    if (!force) {
      const cached = await getCachedProducts(queryKey)
      if (cached) {
        return NextResponse.json({
          products: cached.products,
          source: 'cache',
          fetchedAt: cached.cachedAt,
        })
      }
    }

    const products = await fetchFromAmazon(query, count)
    await setCachedProducts(queryKey, products)

    return NextResponse.json({ products, source: 'api', fetchedAt: new Date().toISOString() })
  } catch (err) {
    // Log the detail, return a fixed string. The thrown messages here embed raw
    // Amazon response bodies, which can carry credential and account detail.
    console.error('[amazon-books] Error:', err instanceof Error ? err.message : 'Unknown error')
    // Still 200 with an empty list so the product row simply renders nothing
    // rather than breaking the page around it.
    return NextResponse.json(
      { products: [], error: 'Recommendations are temporarily unavailable.' },
      { status: 200 },
    )
  }
}
