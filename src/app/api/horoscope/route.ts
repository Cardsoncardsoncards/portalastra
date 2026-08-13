import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_SIGNS = new Set([
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
])

// Generic but sign-appropriate readings used when the upstream API is down,
// so the Stars tab always has something to show.
const FALLBACK_READINGS: Record<string, string> = {
  aries: 'Your pioneering energy runs high today, Aries. Channel that drive into one bold first step rather than scattering it, momentum, once started, will carry you further than force ever could.',
  taurus: 'Steadiness is your gift today, Taurus. Tend patiently to what you value and resist the urge to rush; the comforts and security you build now are made to last.',
  gemini: 'Curiosity opens doors today, Gemini. A conversation or idea sparks something new, stay flexible, share your thoughts freely, and let connection lead the way.',
  cancer: 'Your intuition is especially clear today, Cancer. Trust how you feel and nurture both yourself and those you love; emotional honesty brings the comfort you seek.',
  leo: 'Your warmth lights up the room today, Leo. Lead with generosity rather than pride, and let your natural confidence inspire others without overshadowing them.',
  virgo: 'Small, careful efforts add up today, Virgo. Bring order to one corner of your world and be as kind to yourself as you are precise, progress lives in the details.',
  libra: 'Balance is your compass today, Libra. Seek fairness in your relationships and trust your sense of harmony; a graceful choice restores peace where there was tension.',
  scorpio: 'Quiet intensity serves you well today, Scorpio. Look beneath the surface, honour what you truly feel, and let transformation happen in its own time.',
  sagittarius: 'Adventure calls today, Sagittarius. Follow your optimism toward something that widens your horizon, even a small leap of faith renews your sense of possibility.',
  capricorn: 'Discipline pays off today, Capricorn. Keep climbing steadily toward your goal and trust your own resolve; the foundations you lay now support real, lasting success.',
  aquarius: 'Original thinking sets you apart today, Aquarius. Embrace what makes your perspective unique and share it with your community, your vision can spark genuine change.',
  pisces: 'Imagination and compassion flow freely today, Pisces. Make space for rest, creativity, and kindness; your gentle intuition guides you exactly where you need to go.',
}

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

  const fallback = (note: string) =>
    NextResponse.json({
      sign,
      date: new Date().toISOString().slice(0, 10),
      reading: FALLBACK_READINGS[sign],
      fallback: true,
      note,
    })

  try {
    const url = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign}&day=TODAY`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      return fallback(`upstream responded ${res.status}`)
    }

    const json = (await res.json()) as HoroscopeApiResponse
    const reading = json.data?.horoscope

    if (!reading) {
      return fallback('no horoscope field in upstream response')
    }

    return NextResponse.json({ sign, date: json.data.date, reading })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return fallback(message)
  }
}
