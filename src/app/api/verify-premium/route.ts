import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ isPaid: false, error: 'Invalid email' }, { status: 400 })
    }
    const res = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    )
    if (!res.ok) {
      return NextResponse.json({ isPaid: false })
    }
    const data = await res.json()
    const groups: any[] = data?.data?.groups || []
    const PAID_GROUP_ID = '189884548570416247'
    const isPaid = groups.some((g: any) => String(g.id) === PAID_GROUP_ID)
    return NextResponse.json({ isPaid })
  } catch (err) {
    console.error('[verify-premium]', err)
    return NextResponse.json({ isPaid: false, error: 'Server error' }, { status: 500 })
  }
}
