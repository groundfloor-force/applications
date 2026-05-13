import { NextRequest, NextResponse } from 'next/server'
import {
  getApplicationByToken,
  getAllApplicationItemsByToken,
  createCosignerUpdate,
  uploadFileToMonday,
} from '@/lib/monday'
import { generateCosignerAddendumPdf } from '@/lib/pdf'

export const maxDuration = 30

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  let payload: {
    firstName?: string
    lastName?: string
    relationship?: string
    email?: string
    phone?: string
  }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const cosigner = {
    firstName: (payload.firstName ?? '').trim(),
    lastName: (payload.lastName ?? '').trim(),
    relationship: (payload.relationship ?? '').trim(),
    email: (payload.email ?? '').trim(),
    phone: (payload.phone ?? '').trim(),
  }

  if (!cosigner.firstName || !cosigner.lastName) {
    return NextResponse.json(
      { error: 'Co-signer first and last name are required.' },
      { status: 400 }
    )
  }
  if (!cosigner.email && !cosigner.phone) {
    return NextResponse.json(
      { error: 'Provide at least one of co-signer email or phone.' },
      { status: 400 }
    )
  }
  if (cosigner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cosigner.email)) {
    return NextResponse.json(
      { error: 'Enter a valid email address.' },
      { status: 400 }
    )
  }

  try {
    const app = await getApplicationByToken(token)
    if (!app) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const propertyLine = app.address
      ? `${app.address}${app.unit ? ` Unit ${app.unit}` : ''}`
      : '—'

    const itemIds = await getAllApplicationItemsByToken(token)
    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 })
    }

    const pdfBuffer = generateCosignerAddendumPdf({
      applicantName: app.name,
      propertyLine,
      cosigner,
    })
    const dateStr = new Date().toISOString().split('T')[0]
    const pdfName = `Cosigner_Addendum_${cosigner.firstName}_${cosigner.lastName}_${dateStr}.pdf`
      .replace(/[^a-zA-Z0-9._-]/g, '_')

    // Apply to every Monday item that shares this token (one per property)
    for (const itemId of itemIds) {
      await createCosignerUpdate(itemId, cosigner)
      await uploadFileToMonday(itemId, pdfBuffer, pdfName, 'application/pdf')
    }

    return NextResponse.json({ success: true, itemsUpdated: itemIds.length })
  } catch (err) {
    console.error('Cosigner submission error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Submission failed: ${message}` },
      { status: 500 }
    )
  }
}
