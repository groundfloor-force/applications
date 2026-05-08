import { NextRequest, NextResponse } from 'next/server'
import { getRecentApplications } from '@/lib/monday'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  void req
  const cookieStore = await cookies()
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apps = await getRecentApplications(30)
    return NextResponse.json(apps)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
