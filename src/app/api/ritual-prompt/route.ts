import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let ritualCache: { date: string; phase: string; prompt: string } | null = null

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const phase = searchParams.get('phase') || 'Full Moon'
    const today = new Date().toISOString().split('T')[0]

    if (ritualCache && ritualCache.date === today && ritualCache.phase === phase) {
      return NextResponse.json({ prompt: ritualCache.prompt })
    }

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Write a single daily ritual prompt for someone experiencing the ${phase} moon phase. 2-3 sentences max. Grounded, practical, mystical tone. No em dashes. No "eternal", "forever", "tapestry", or "dance". Sentences under 20 words. Return only the prompt text, nothing else.`
        }]
      })
    })

    const aiData = await aiRes.json()
    if (aiData.error) {
      console.error('[ritual-prompt] AI error:', aiData.error)
      return NextResponse.json({ prompt: '' })
    }

    const prompt = aiData.content?.[0]?.text?.trim() || ''
    ritualCache = { date: today, phase, prompt }
    return NextResponse.json({ prompt })
  } catch (err) {
    console.error('[ritual-prompt]', err)
    return NextResponse.json({ prompt: '' })
  }
}
