import { NextResponse } from 'next/server'
import { nasaFetch } from '@/lib/nasa'

interface ApodResponse {
  date: string
  title: string
  explanation: string
  url: string
  hdurl?: string
  thumbnail_url?: string
  media_type: 'image' | 'video'
  copyright?: string
}

const SWR_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}

export async function GET() {
  try {
    const data = await nasaFetch<ApodResponse>('/planetary/apod', { thumbs: 'true' })
    return NextResponse.json(data, { headers: SWR_HEADERS })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
