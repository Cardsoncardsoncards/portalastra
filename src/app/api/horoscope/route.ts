import { NextResponse } from 'next/server'

const VALID_SIGNS = new Set([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
])

interface HoroscopeApiResponse {
  data: {
    date: string
    period: string
    sign: string
    horoscope: string
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sign = (searchParams.get('sign') ?? '').toLowerCase()

  if (!VALID_SIGNS.has(sign)) {
    return NextResponse.json({ error: `unknown sign: ${sign}` }, { status: 400 })
  }

  try {
    const url = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign}&day=TODAY`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Horoscope API responded ${res.status}` },
        { status: 502 },
      )
    }

    const json = (await res.json()) as HoroscopeApiResponse
    const reading = json.data?.horoscope

    if (!reading) {
      return NextResponse.json(
        { error: 'no horoscope field in upstream response' },
        { status: 502 },
      )
    }

    return NextResponse.json({ sign, date: json.data.date, reading })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
