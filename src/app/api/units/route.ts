import { NextResponse } from 'next/server'
import { fetchActiveUnits } from '@/lib/monday'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const units = await fetchActiveUnits()
    return NextResponse.json(
      { units },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    )
  } catch (err) {
    console.error('[units] fetch failed:', err)
    return NextResponse.json({ error: 'Unable to load unit list' }, { status: 502 })
  }
}
