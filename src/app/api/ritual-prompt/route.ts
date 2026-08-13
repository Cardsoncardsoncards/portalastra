import { NextResponse } from 'next/server'
import { PHASE_NAMES, getTodayAEST, validateOutput, STYLE_RULES_PROMPT } from '@/lib/shared'
import { entitlementFromRequest } from '@/lib/premiumToken'
import { getClientIp, rateLimit } from '@/lib/rateLimit'
import { getCachedText, setCachedText } from '@/lib/textCache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Allow-list, same pattern /api/horoscope already uses for zodiac signs.
const VALID_PHASES = new Set(PHASE_NAMES)

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000

// Per-phase static text, so a failed or blocked Claude call still renders a
// readable card. The route previously returned `{ prompt: '' }` on failure and
// the premium card sat on a loading skeleton indefinitely.
const FALLBACK_PROMPTS: Record<string, string> = {
  'New Moon':
    'Write down one intention you are ready to begin. Keep it to a single sentence. Put the paper somewhere you will see it each morning this week.',
  'Waxing Crescent':
    'Take the smallest possible first step toward the intention you set. Ten minutes is enough. Momentum matters more than scale right now.',
  'First Quarter':
    'Name the obstacle standing between you and your intention. Write one action you can take this week to move through it, then do that action today.',
  'Waxing Gibbous':
    'Review what you began and adjust one thing. Refinement, not restarting. Ask what is nearly working and give it the last ten percent.',
  'Full Moon':
    'Sit somewhere you can see the sky. Name one thing you are grateful for and one thing you are ready to release. Say both out loud.',
  'Waning Gibbous':
    'Share something you have learned this cycle with one person. Teaching it is how you find out what you actually know.',
  'Last Quarter':
    'Clear one small space: a drawer, an inbox, a folder. As you do it, notice what you have been carrying that no longer belongs to you.',
  'Waning Crescent':
    'Rest deliberately. Cancel one optional thing this week and use the time for nothing in particular. The next cycle starts better from stillness.',
}

function fallback(phase: string) {
  return FALLBACK_PROMPTS[phase] || FALLBACK_PROMPTS['Full Moon']
}

async function generate(phase: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Write a single daily ritual prompt for someone experiencing the ${phase} moon phase. Two or three sentences at most. Grounded, practical, mystical tone.

${STYLE_RULES_PROMPT}
- Sentences under 20 words.

Return only the prompt text, nothing else.`,
        },
      ],
    }),
  })

  if (!res.ok) {
    // Status only. The upstream body is not logged and never reaches the client.
    console.error(`[ritual-prompt] Anthropic error ${res.status}`)
    return null
  }

  const data = await res.json()
  const text: string = data?.content?.[0]?.text?.trim() || ''
  return text || null
}

export async function GET(request: Request) {
  // Entitlement first. This route generates paid content and previously had no
  // check at all: anyone could hit /api/ritual-prompt directly and get the
  // premium output, and every hit cost an Anthropic call.
  const entitlement = entitlementFromRequest(request)
  if (!entitlement) {
    return NextResponse.json({ error: 'Astra Premium required.' }, { status: 401 })
  }

  const limited = rateLimit(`ritual-prompt:ip:${getClientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS)
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(limited.retryAfterMs / 1000)) } },
    )
  }

  const requested = new URL(request.url).searchParams.get('phase') || 'Full Moon'
  if (!VALID_PHASES.has(requested)) {
    return NextResponse.json({ error: 'Unknown moon phase.' }, { status: 400 })
  }
  const phase = requested
  const today = getTodayAEST()
  const cacheKey = `ritual:${today}:${phase}`

  try {
    const cached = await getCachedText(cacheKey)
    if (cached) {
      return NextResponse.json({ prompt: cached, phase, fetchedAt: today, source: 'cache' })
    }

    // One retry, then static copy. Both the generation failing and the output
    // failing the house-style validator land in the same place.
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await generate(phase)
      if (!text) continue

      const check = validateOutput(text)
      if (!check.ok) {
        console.error(`[ritual-prompt] output rejected (${check.problems.join('; ')}), attempt ${attempt + 1}`)
        continue
      }

      await setCachedText(cacheKey, text)
      return NextResponse.json({ prompt: text, phase, fetchedAt: new Date().toISOString(), source: 'ai' })
    }

    return NextResponse.json({
      prompt: fallback(phase),
      phase,
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
    })
  } catch (err) {
    console.error('[ritual-prompt]', err instanceof Error ? err.message : 'unknown error')
    return NextResponse.json({
      prompt: fallback(phase),
      phase,
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
    })
  }
}
