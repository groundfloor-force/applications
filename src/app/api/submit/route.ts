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

    // Collect all uploaded files from multipart
    const allFiles: { file: File; label: string }[] = []

    // Primary applicant documents (doc_0, doc_1, ...)
    for (const [key, value] of multipart.entries()) {
      if (key.startsWith('doc_') && value instanceof File && value.size > 0) {
        allFiles.push({ file: value, label: `${data.firstName}_${data.lastName}` })
      }
      if (key.startsWith('occdoc_') && value instanceof File && value.size > 0) {
        // occdoc_0_1 → occupant index 0, file index 1
        const parts = key.split('_')
        const occIdx = parseInt(parts[1])
        const occ = data.occupants?.[occIdx]
        const occName = occ ? `${occ.firstName}_${occ.lastName}` : `Occupant_${occIdx + 2}`
        allFiles.push({ file: value, label: occName })
      }
    }

    // Generate a unique status token
    const token = crypto.randomUUID()

    // 1. Create item on Applications board (with token)
    const itemId = await createApplication(data, token)

    // 2. Post detailed update note
    await createApplicationUpdate(itemId, data)

    // 3. Generate application PDF and upload
    const pdfBuffer = generateApplicationPdf(data)
    const pdfName = `Application_${data.firstName}_${data.lastName}_${new Date().toISOString().split('T')[0]}.pdf`
    await uploadFileToMonday(itemId, pdfBuffer, pdfName, 'application/pdf')

    // 4. Upload all income verification documents
    for (const { file, label } of allFiles) {
      const buf = Buffer.from(await file.arrayBuffer())
      const safeName = `${label}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadFileToMonday(itemId, buf, safeName, file.type || 'application/octet-stream')
    }

    // 5. Send emails (non-blocking — failures don't fail the submission)
    const mondayItemUrl = `https://groundfloor-force.monday.com/boards/${640654033}/pulses/${itemId}`
    const config = await getConfig().catch(() => null)

    await Promise.allSettled([
      data.email
        ? sendConfirmationEmail(data.email, data.firstName, token)
        : Promise.resolve(),
      config?.notificationEmail
        ? sendNotificationEmail(
            config.notificationEmail,
            `${data.firstName} ${data.lastName}`,
            data.property ? `${data.property.address}${data.property.unit ? ` Unit ${data.property.unit}` : ''}` : '',
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
