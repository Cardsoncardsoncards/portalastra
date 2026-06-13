import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CACHE_TTL_HOURS = 24
const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG || 'blasdigital-22'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

async function getCachedProducts(queryKey: string): Promise<AmazonProduct[] | null> {
  const { data, error } = await supabase
    .from('portal_astra_product_cache')
    .select('products, cached_at')
    .eq('query_key', queryKey)
    .single()

  if (error || !data) return null

  const cachedAt = new Date(data.cached_at)
  const ageHours = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60)
  if (ageHours > CACHE_TTL_HOURS) return null

  return data.products as AmazonProduct[]
}

async function setCachedProducts(queryKey: string, products: AmazonProduct[]): Promise<void> {
  await supabase
    .from('portal_astra_product_cache')
    .upsert(
      { query_key: queryKey, products, cached_at: new Date().toISOString(), hit_count: 0 },
      { onConflict: 'query_key' }
    )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const countParam = searchParams.get('count')
  const count = Math.min(parseInt(countParam ?? '3', 10), 6)

  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  const queryKey = `${query.toLowerCase().trim()}__${count}`

  try {
    const cached = await getCachedProducts(queryKey)
    if (cached) {
      return NextResponse.json({ products: cached, source: 'cache' })
    }

    const products = await fetchFromAmazon(query, count)
    await setCachedProducts(queryKey, products)

    return NextResponse.json({ products, source: 'api' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[amazon-books] Error:', message)
    // Return empty rather than 500 so pages still render
    return NextResponse.json({ products: [], error: message }, { status: 200 })
  }
}
