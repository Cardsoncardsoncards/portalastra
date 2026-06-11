import { NextResponse } from 'next/server'
import { nasaFetch, todayISO } from '@/lib/nasa'

export const dynamic = 'force-dynamic'

interface FlrEntry {
  flrID: string
  beginTime: string
  classType: string
  sourceLocation?: string
}

interface CmeEntry {
  activityID: string
  startTime: string
  note?: string
  cmeAnalyses?: Array<{ speed?: number; type?: string; isMostAccurate?: boolean }>
}

interface GstEntry {
  gstID: string
  startTime: string
  allKpIndex?: Array<{ kpIndex: number; observedTime: string; source: string }>
}

type Intensity = 'extreme' | 'high' | 'moderate' | 'low'

interface Event {
  type: string
  class: string
  emoji: string
  intensity: Intensity
  description: string
  time: string
}

function daysAgoISO(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function flrIntensity(classType: string): Intensity {
  const letter = classType.charAt(0).toUpperCase()
  if (letter === 'X') return 'extreme'
  if (letter === 'M') return 'high'
  if (letter === 'C') return 'moderate'
  return 'low'
}

function cmeIntensity(speed?: number): Intensity {
  if (!speed) return 'low'
  if (speed > 1500) return 'high'
  if (speed > 1000) return 'moderate'
  return 'low'
}

function gstIntensity(maxKp: number): Intensity {
  if (maxKp >= 9) return 'extreme'
  if (maxKp >= 7) return 'high'
  if (maxKp >= 5) return 'moderate'
  return 'low'
}

export async function GET() {
  const startDate = daysAgoISO(7)
  const endDate = todayISO()

  try {
    const [flrs, cmes, gsts] = await Promise.all([
      nasaFetch<FlrEntry[]>('/DONKI/FLR', { startDate, endDate }).catch(() => []),
      nasaFetch<CmeEntry[]>('/DONKI/CME', { startDate, endDate }).catch(() => []),
      nasaFetch<GstEntry[]>('/DONKI/GST', { startDate, endDate }).catch(() => []),
    ])

    const events: Event[] = []

    for (const f of flrs) {
      events.push({
        type: 'Solar Flare',
        class: f.classType,
        emoji: '⚡',
        intensity: flrIntensity(f.classType),
        description: `Class ${f.classType} solar flare${f.sourceLocation ? ` from active region at ${f.sourceLocation}` : ''}.`,
        time: f.beginTime,
      })
    }

    for (const c of cmes) {
      const best = c.cmeAnalyses?.find((a) => a.isMostAccurate) ?? c.cmeAnalyses?.[0]
      const speed = best?.speed
      events.push({
        type: 'Coronal Mass Ejection',
        class: speed ? `${Math.round(speed)} km/s` : '—',
        emoji: '💨',
        intensity: cmeIntensity(speed),
        description: c.note?.split('\n')[0]?.slice(0, 220) || 'A burst of plasma and magnetic field from the sun.',
        time: c.startTime,
      })
    }

    for (const g of gsts) {
      const maxKp = Math.max(0, ...(g.allKpIndex ?? []).map((k) => k.kpIndex))
      events.push({
        type: 'Geomagnetic Storm',
        class: maxKp > 0 ? `Kp ${maxKp}` : '—',
        emoji: '🌌',
        intensity: gstIntensity(maxKp),
        description: `Geomagnetic disturbance with peak Kp index of ${maxKp}. Possible aurora at lower latitudes.`,
        time: g.startTime,
      })
    }

    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return NextResponse.json(
      { events: events.slice(0, 30) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message, events: [] }, { status: 502 })
  }
}
