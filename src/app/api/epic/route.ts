import { NextResponse } from 'next/server'
import { nasaFetch } from '@/lib/nasa'

interface EpicImage {
  identifier: string
  caption: string
  image: string
  date: string
  centroid_coordinates: { lat: number; lon: number }
}

export async function GET() {
  try {
    const data = await nasaFetch<EpicImage[]>('/EPIC/api/natural')
    if (data.length === 0) {
      return NextResponse.json({ error: 'no images available' }, { status: 404 })
    }
    const latest = data[data.length - 1]
    const [datePart] = latest.date.split(' ')
    const [year, month, day] = datePart.split('-')
    const imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/png/${latest.image}.png`

    return NextResponse.json({
      imageUrl,
      date: latest.date,
      caption: latest.caption,
      coords: latest.centroid_coordinates,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
