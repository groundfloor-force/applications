import { NextRequest, NextResponse } from 'next/server'
import {
  createNoticeItem,
  uploadFileToMonday,
  NOTICES_SIGNATURE_COLUMN_ID,
} from '@/lib/monday'
import { validateNotice, type NoticeFormData } from '@/lib/notices'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()
  let stage = 'init'

  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[notices ${requestId}] stage=${stage} event=${event} elapsedMs=${Date.now() - startedAt}` +
        (Object.keys(extra).length ? ' ' + JSON.stringify(extra) : ''),
    )
  }

  try {
    stage = 'parse_json'
    log('start')
    let data: NoticeFormData
    try {
      data = (await req.json()) as NoticeFormData
    } catch {
      return NextResponse.json({ error: 'Invalid request body', requestId }, { status: 400 })
    }

    stage = 'validate'
    const errors = validateNotice(data)
    if (Object.keys(errors).length > 0) {
      log('validation_failed', { fields: Object.keys(errors) })
      return NextResponse.json(
        { error: 'Please correct the highlighted fields and try again.', fields: errors, requestId },
        { status: 400 },
      )
    }

    stage = 'monday_create_item'
    const itemId = await createNoticeItem(data)
    log('item_created', { itemId })

    // Signature upload failure must not lose the notice — the item already
    // exists on the board, so log and return success regardless.
    stage = 'monday_upload_signature'
    try {
      const match = data.signatureData.match(/^data:(image\/\w+);base64,(.+)$/)
      if (match) {
        const ext = match[1].split('/')[1] === 'jpeg' ? 'jpg' : match[1].split('/')[1]
        const safeName = data.fullName.trim().replace(/[^a-zA-Z0-9]+/g, '_') || 'tenant'
        await uploadFileToMonday(
          itemId,
          Buffer.from(match[2], 'base64'),
          `${safeName}_signature.${ext}`,
          match[1],
          NOTICES_SIGNATURE_COLUMN_ID,
        )
        log('signature_uploaded')
      }
    } catch (err) {
      log('signature_upload_failed', { error: String(err) })
    }

    stage = 'done'
    log('success', { itemId })
    return NextResponse.json({ itemId, requestId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log('error', { error: message })
    console.error(`[notices ${requestId}] failed at stage=${stage}:`, err)
    return NextResponse.json(
      { error: 'We could not submit your notice. Please try again or contact our office.', requestId },
      { status: 502 },
    )
  }
}
