import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { fetchGuidedMaintenanceRequests } from '@/lib/monday'

export async function GET(req: NextRequest) {
  void req
  const cookieStore = await cookies()
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rows = await fetchGuidedMaintenanceRequests(150)
    return NextResponse.json(rows)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
