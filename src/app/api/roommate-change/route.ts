import { NextRequest, NextResponse } from 'next/server'
import {
  APPLICATIONS_BOARD_URL_PREFIX,
  createRoommateChange,
  createRoommateChangeUpdate,
  uploadFileToMonday,
} from '@/lib/monday'
import { sendRoommateChangeNotificationEmail } from '@/lib/email'
import { getConfig } from '@/lib/config'
import { generateRoommateChangePdf } from '@/lib/pdf'
import {
  incomingPeople,
  leaving,
  personName,
  pdfFileName,
  staying,
  validateRoommateStep,
} from '@/lib/roommate-change'
import type { RoommateChangeData } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()
  let stage = 'init'

  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[roommate-change ${requestId}] stage=${stage} event=${event} elapsedMs=${Date.now() - startedAt}` +
        (Object.keys(extra).length ? ' ' + JSON.stringify(extra) : ''),
    )
  }

  try {
    stage = 'parse_json'
    const body = await req.json() as { data?: RoommateChangeData; locale?: string }
    const data = body.data
    const locale: 'en' | 'fr' = body.locale === 'fr' ? 'fr' : 'en'

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Missing form data', requestId }, { status: 400 })
    }

    const errs = validateRoommateStep(7, data)
    if (Object.keys(errs).length > 0) {
      log('validation_failed', { keys: Object.keys(errs) })
      return NextResponse.json({ error: 'Invalid roommate change request', requestId }, { status: 400 })
    }

    stage = 'monday_create_item'
    const itemId = await createRoommateChange(data, locale)
    log('item_created', { itemId })

    stage = 'monday_details_update'
    await createRoommateChangeUpdate(itemId, data).catch((err) => {
      console.error(`[roommate-change ${requestId}] update_failed`, err)
    })

    stage = 'pdf_generate'
    const pdfBuffer = generateRoommateChangePdf(data)
    log('pdf_generated', { pdfKB: Math.round(pdfBuffer.length / 1024) })

    stage = 'monday_upload_pdf'
    await uploadFileToMonday(itemId, pdfBuffer, pdfFileName(data), 'application/pdf')
    log('pdf_uploaded')

    stage = 'notify_emails'
    const config = await getConfig().catch(() => null)
    if (config?.notificationEmail) {
      await sendRoommateChangeNotificationEmail(
        config.notificationEmail,
        data.unitName,
        `${APPLICATIONS_BOARD_URL_PREFIX}${itemId}`,
        staying(data).map(personName).join(', '),
        leaving(data).map(personName).join(', '),
        incomingPeople(data).map(personName).join(', ') || 'None',
      )
    }
    log('emails_sent')

    stage = 'done'
    log('success', { itemId, totalMs: Date.now() - startedAt })
    return NextResponse.json({ success: true, itemId, requestId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[roommate-change ${requestId}] FAILED stage=${stage} error="${message}"`)
    return NextResponse.json(
      { error: 'Unable to submit roommate change request', requestId, stage },
      { status: 500 },
    )
  }
}
