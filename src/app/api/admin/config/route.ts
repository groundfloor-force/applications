import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getConfig, saveConfig } from '@/lib/config'

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const config = await getConfig()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const updates = await req.json()
  const config = await saveConfig(updates)
  return NextResponse.json(config)
}
