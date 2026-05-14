import { NextRequest, NextResponse } from 'next/server'
import {
  getApplicationByToken,
  getAllApplicationItemsByToken,
  createApplicantMessage,
  getApplicantConversation,
} from '@/lib/monday'

export const maxDuration = 30

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
    const conversation = await getApplicantConversation(app.id)
    return NextResponse.json({ conversation })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  let payload: { message?: string; locale?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = (payload.message ?? '').trim()
  const locale: 'en' | 'fr' = payload.locale === 'fr' ? 'fr' : 'en'

  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 400 })
  }

  try {
    const app = await getApplicationByToken(token)
    if (!app) return NextResponse.json({ error: 'Application not found.' }, { status: 404 })

    const itemIds = await getAllApplicationItemsByToken(token)
    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    // Extract applicant name from the item name
    // (item name is "Firstname Lastname - Property")
    const applicantName = app.name.split(' - ')[0]?.trim()

    for (const itemId of itemIds) {
      await createApplicantMessage(itemId, message, locale, applicantName)
    }

    const conversation = await getApplicantConversation(itemIds[0])
    return NextResponse.json({ success: true, conversation })
  } catch (err) {
    console.error('Message submission error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Send failed: ${msg}` }, { status: 500 })
  }
}
