import { NextRequest, NextResponse } from 'next/server'
import { getApplicationByToken } from '@/lib/monday'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  void req
  const { token } = await params
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  try {
    const app = await getApplicationByToken(token)
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(app)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
