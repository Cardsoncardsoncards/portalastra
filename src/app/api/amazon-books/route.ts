import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CACHE_TTL_HOURS = 24

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

async function getAmazonToken(): Promise<string> {
  // Amazon Creators API uses OAuth2 client credentials
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AMAZON_CLIENT_ID!,
    client_secret: process.env.AMAZON_CLIENT_SECRET!,
  })

  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    throw new Error(`Amazon auth failed: ${res.status}`)
  }

  const data = await res.json()
  return data.access_token
}

async function fetchFromAmazon(query: string, count: number): Promise<AmazonProduct[]> {
  const token = await getAmazonToken()

  const payload = {
    Keywords: query,
    SearchIndex: 'Books',
    ItemCount: count,
    PartnerTag: process.env.AMAZON_ASSOCIATE_TAG || 'blasdigital-22',
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com.au',
    Resources: [
      'Images.Primary.Medium',
      'ItemInfo.Title',
      'ItemInfo.ByLineInfo',
      'Offers.Listings.Price',
    ],
  }

  const res = await fetch('https://webservices.amazon.com.au/paapi5/searchitems', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-amz-access-token': token,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Amazon API error ${res.status}: ${errorText}`)
  }

  const data = await res.json()
  const items = data.SearchResult?.Items ?? []

  return items.map((item: Record<string, unknown>) => {
    const info = item.ItemInfo as Record<string, unknown> ?? {}
    const titleData = info.Title as Record<string, unknown> ?? {}
    const byLine = info.ByLineInfo as Record<string, unknown> ?? {}
    const contributors = byLine.Contributors as Record<string, unknown>[] ?? []
    const offers = item.Offers as Record<string, unknown> ?? {}
    const listings = offers.Listings as Record<string, unknown>[] ?? []
    const images = item.Images as Record<string, unknown> ?? {}
    const primary = images.Primary as Record<string, unknown> ?? {}
    const medium = primary.Medium as Record<string, unknown> ?? {}

    const firstContributor = contributors[0] ?? {}
    const nameData = firstContributor.Name as Record<string, unknown> ?? {}

    const firstListing = listings[0] ?? {}
    const priceData = firstListing.Price as Record<string, unknown> ?? {}
    const displayAmount = priceData.DisplayAmount as string ?? ''

    return {
      asin: item.ASIN as string ?? '',
      title: titleData.DisplayValue as string ?? 'Unknown title',
      author: nameData.DisplayValue as string ?? '',
      price: displayAmount,
      image: medium.URL as string ?? '',
      url: `https://www.amazon.com.au/dp/${item.ASIN as string}?tag=${process.env.AMAZON_ASSOCIATE_TAG || 'blasdigital-22'}`,
    }
  }).filter((p: AmazonProduct) => p.asin && p.image)
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

  // Increment hit counter (fire and forget — don't await)
  supabase
    .from('portal_astra_product_cache')
    .update({ hit_count: (data as Record<string, unknown> & { hit_count?: number }).hit_count ?? 0 + 1 })
    .eq('query_key', queryKey)

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
    // Try cache first
    const cached = await getCachedProducts(queryKey)
    if (cached) {
      return NextResponse.json({ products: cached, source: 'cache' })
    }

    // Cache miss — fetch from Amazon
    const products = await fetchFromAmazon(query, count)

    // Store result
    await setCachedProducts(queryKey, products)

    return NextResponse.json({ products, source: 'api' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[amazon-books] Error:', message)

    // Return empty array rather than 500 so the page still renders
    return NextResponse.json({ products: [], error: message }, { status: 200 })
  }
}
