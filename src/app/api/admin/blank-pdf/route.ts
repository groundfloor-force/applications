import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generateBlankApplicationPdf } from '@/lib/pdf'

export async function GET(req: NextRequest) {
  void req
  const cookieStore = await cookies()
  if (!cookieStore.get('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pdf = generateBlankApplicationPdf()
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="rental-application-blank.pdf"',
    },
  })
}
