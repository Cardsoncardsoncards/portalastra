import { NextResponse } from 'next/server'
import { nasaFetch, todayISO } from '@/lib/nasa'

// Runs per request (never at build) so the module-level cache below works at
// runtime and the paid Anthropic call is only made when the cache is stale.
export const dynamic = 'force-dynamic'

interface ApodResponse {
  date: string
  title: string
  explanation: string
}

// Cache the simplified text for the day. This runs on every page load, so we
// only hit the (paid) Anthropic API once per UTC date per server instance.
let apodCache: { date: string; simple: string } | null = null

export async function GET() {
  try {
    const apod = await nasaFetch<ApodResponse>('/planetary/apod', {})
    const today = todayISO()

    // Serve the cached simplification if it is still for today.
    if (apodCache && apodCache.date === today) {
      return NextResponse.json({ simple: apodCache.simple, title: apod.title, date: apod.date })
    }

    const key = process.env.ANTHROPIC_API_KEY
    // Without a key we cannot simplify; fall back to the original text rather
    // than failing, so the Space tab still renders something useful.
    if (!key) {
      return NextResponse.json({ simple: apod.explanation, title: apod.title, date: apod.date })
    }

    const prompt = `Rewrite this NASA astronomy description for a general audience in 2-3 sentences. Keep it factual but accessible. No jargon. No em dashes. Sentences under 20 words each. Return only the rewritten text, nothing else.

Original: ${apod.explanation}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error(`[apod-simple] Anthropic error ${response.status}: ${detail.slice(0, 300)}`)
      return NextResponse.json({ simple: apod.explanation, title: apod.title, date: apod.date })
    }

    const data = await response.json()
    const simple: string = data?.content?.[0]?.text?.trim() || apod.explanation

    apodCache = { date: today, simple }

    return NextResponse.json({ simple, title: apod.title, date: apod.date })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
