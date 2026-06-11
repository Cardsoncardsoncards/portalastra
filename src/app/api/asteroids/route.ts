import { NextResponse } from 'next/server'
import { nasaFetch, todayISO } from '@/lib/nasa'

export const dynamic = 'force-dynamic'

interface NeoFeedResponse {
  element_count: number
  near_earth_objects: Record<
    string,
    Array<{
      id: string
      name: string
      is_potentially_hazardous_asteroid: boolean
      close_approach_data: Array<{
        miss_distance: { kilometers: string }
        relative_velocity: { kilometers_per_hour: string }
        close_approach_date_full: string
      }>
      estimated_diameter: {
        meters: { estimated_diameter_min: number; estimated_diameter_max: number }
      }
    }>
  >
}

export async function GET() {
  const today = todayISO()
  try {
    const data = await nasaFetch<NeoFeedResponse>('/neo/rest/v1/feed', {
      start_date: today,
      end_date: today,
    })
    const list = data.near_earth_objects[today] ?? []
    const sorted = list
      .slice()
      .sort(
        (a, b) =>
          Number(a.close_approach_data[0]?.miss_distance.kilometers ?? Infinity) -
          Number(b.close_approach_data[0]?.miss_distance.kilometers ?? Infinity),
      )
    return NextResponse.json(
      { asteroids: sorted, count: data.element_count },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message, asteroids: [] }, { status: 502 })
  }
}
