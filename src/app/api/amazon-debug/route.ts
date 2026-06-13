import { NextResponse } from 'next/server'

let cachedToken: { value: string; expiresAt: number } | null = null

async function getToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value
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
  const data = await res.json()
  if (!res.ok) return JSON.stringify({ authError: data })
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

export async function GET() {
  try {
    const token = await getToken()
    if (token.startsWith('{')) return NextResponse.json(JSON.parse(token))

    const res = await fetch('https://creatorsapi.amazon/catalog/v1/searchItems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-marketplace': 'www.amazon.com.au',
      },
      body: JSON.stringify({
        keywords: 'astrology guide',
        searchIndex: 'Books',
        itemCount: 1,
        partnerTag: 'blasdigital-22',
        partnerType: 'Associates',
        marketplace: 'www.amazon.com.au',
        resources: ['images.primary.medium', 'itemInfo.title', 'offersV2.listings.price'],
      }),
    })

    const raw = await res.json()
    return NextResponse.json({ status: res.status, raw })
  } catch (err) {
    return NextResponse.json({ error: String(err) })
  }
}
