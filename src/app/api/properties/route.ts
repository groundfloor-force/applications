import { NextResponse } from 'next/server'
import { getVacancies } from '@/lib/monday'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const properties = await getVacancies()
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Failed to fetch properties:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
}
