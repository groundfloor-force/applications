import { NextRequest, NextResponse } from 'next/server'
import { createApplication, createApplicationUpdate, uploadFileToMonday } from '@/lib/monday'
import { sendConfirmationEmail, sendNotificationEmail } from '@/lib/email'
import { getConfig } from '@/lib/config'
import type { FormData } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const multipart = await req.formData()

    const raw = multipart.get('data')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 })
    }

    const data: Omit<FormData, 'payStubFile'> = JSON.parse(raw)
    const file = multipart.get('payStub') as File | null

    // Generate a unique status token
    const token = crypto.randomUUID()

    // 1. Create item on Applications board (with token)
    const itemId = await createApplication(data, token)

    // 2. Post detailed update note
    await createApplicationUpdate(itemId, data)

    // 3. Upload pay stub if provided
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer())
      await uploadFileToMonday(itemId, buf, file.name, file.type || 'application/octet-stream')
    }

    // 4. Send emails (non-blocking — failures don't fail the submission)
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
