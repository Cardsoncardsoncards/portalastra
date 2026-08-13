import { NextResponse } from 'next/server'
import { nasaFetch } from '@/lib/nasa'
import { validateOutput, STYLE_RULES_PROMPT } from '@/lib/shared'
import { getCachedText, setCachedText } from '@/lib/textCache'

// Runs per request (never at build) so the paid Anthropic call is only made
// when the cache is stale.
export const dynamic = 'force-dynamic'

interface ApodResponse {
  date: string
  title: string
  explanation: string
}

async function simplify(explanation: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  const prompt = `Rewrite this NASA astronomy description for a general audience in two or three sentences. Keep it factual but accessible. No jargon.

${STYLE_RULES_PROMPT}
- Sentences under 20 words each.

Return only the rewritten text, nothing else.

Original: ${explanation}`

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
    console.error(`[apod-simple] Anthropic error ${response.status}`)
    return null
  }

  const data = await response.json()
  const text: string = data?.content?.[0]?.text?.trim() || ''
  return text || null
}

export async function GET() {
  try {
    const apod = await nasaFetch<ApodResponse>('/planetary/apod', {})
    const fetchedAt = new Date().toISOString()

    // Keyed on the APOD's own date, the content's identity, not on the server's
    // idea of "today". Backed by Supabase rather than a single module-level
    // slot, so a cold start does not re-pay for a simplification we already
    // have.
    const cacheKey = `apod-simple:${apod.date}`

    const cached = await getCachedText(cacheKey)
    if (cached) {
      return NextResponse.json({
        simple: cached,
        title: apod.title,
        date: apod.date,
        fetchedAt,
        source: 'cache',
      })
    }

    // Without a key we cannot simplify; fall back to the original text rather
    // than failing, so the Space tab still renders something useful.
    // Same fallback on a failed call or output that breaks house style: one
    // retry, then NASA's own words, which are always publishable.
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await simplify(apod.explanation)
      if (!text) break

      const check = validateOutput(text)
      if (!check.ok) {
        console.error(`[apod-simple] output rejected (${check.problems.join('; ')}), attempt ${attempt + 1}`)
        continue
      }

      await setCachedText(cacheKey, text)
      return NextResponse.json({
        simple: text,
        title: apod.title,
        date: apod.date,
        fetchedAt,
        source: 'ai',
      })
    }

    return NextResponse.json({
      simple: apod.explanation,
      title: apod.title,
      date: apod.date,
      fetchedAt,
      source: 'fallback',
    })
  } catch (err) {
    console.error('[apod-simple]', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({ error: 'Could not load the picture of the day.' }, { status: 502 })
  }
}
