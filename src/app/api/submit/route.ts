import { NextRequest, NextResponse } from 'next/server'
import { createApplication, createApplicationUpdate, uploadFileToMonday } from '@/lib/monday'
import { sendConfirmationEmail, sendNotificationEmail } from '@/lib/email'
import { getConfig } from '@/lib/config'
import { generateApplicationPdf } from '@/lib/pdf'
import type { FormData } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const multipart = await req.formData()

    const raw = multipart.get('data')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 })
    }

    const data: Omit<FormData, 'documents' | 'occupantDocs'> = JSON.parse(raw)

    // Collect uploaded file buffers
    const fileBuffers: { buffer: Buffer; name: string; type: string; label: string }[] = []
    for (const [key, value] of multipart.entries()) {
      if (value instanceof File && value.size > 0) {
        if (key.startsWith('doc_')) {
          const buf = Buffer.from(await value.arrayBuffer())
          fileBuffers.push({
            buffer: buf,
            name: value.name,
            type: value.type || 'application/octet-stream',
            label: `${data.firstName}_${data.lastName}`,
          })
        }
        if (key.startsWith('occdoc_')) {
          const parts = key.split('_')
          const occIdx = parseInt(parts[1])
          const occ = data.occupants?.[occIdx]
          const occName = occ ? `${occ.firstName}_${occ.lastName}` : `Occupant_${occIdx + 2}`
          const buf = Buffer.from(await value.arrayBuffer())
          fileBuffers.push({
            buffer: buf,
            name: value.name,
            type: value.type || 'application/octet-stream',
            label: occName,
          })
        }
      }
    }

    const token = crypto.randomUUID()

    // Single Monday item per submission, even when multiple properties were
    // selected. The full preference list is surfaced in the update note.
    const itemId = await createApplication(data, token)
    await createApplicationUpdate(itemId, data)

    const pdfBuffer = generateApplicationPdf(data)
    const dateStr = new Date().toISOString().split('T')[0]
    const pdfName = `Application_${data.firstName}_${data.lastName}_${dateStr}.pdf`
    await uploadFileToMonday(itemId, pdfBuffer, pdfName, 'application/pdf')

    for (const { buffer, name, type, label } of fileBuffers) {
      const safeName = `${label}_${name}`.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadFileToMonday(itemId, buffer, safeName, type)
    }

    const mondayItemUrl = `https://groundfloor-force.monday.com/boards/${640654033}/pulses/${itemId}`
    const config = await getConfig().catch(() => null)

    const propertySummary = data.properties && data.properties.length > 1
      ? `${data.properties.length} properties (${data.properties.map((p) => `${p.address}${p.unit ? ` Unit ${p.unit}` : ''}`).join('; ')})`
      : data.property
        ? `${data.property.address}${data.property.unit ? ` Unit ${data.property.unit}` : ''}`
        : ''

    await Promise.allSettled([
      data.email
        ? sendConfirmationEmail(data.email, data.firstName, token)
        : Promise.resolve(),
      config?.notificationEmail
        ? sendNotificationEmail(
            config.notificationEmail,
            `${data.firstName} ${data.lastName}`,
            propertySummary,
            mondayItemUrl
          )
        : Promise.resolve(),
    ])

    return NextResponse.json({ success: true, itemId, token })
  } catch (error) {
    console.error('Submission error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Submission failed: ${message}` }, { status: 500 })
  }
}
