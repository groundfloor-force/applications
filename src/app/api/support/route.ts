import { NextRequest, NextResponse } from 'next/server'
import {
  createSupportItem,
  findVacancyForSupport,
  postPlainUpdate,
  uploadFileToMonday,
  SUPPORT_FILES_COLUMN_ID,
  SUPPORT_BOARD_URL_PREFIX,
  type SupportFormData,
} from '@/lib/monday'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()
  let stage = 'init'

  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[support ${requestId}] stage=${stage} event=${event} elapsedMs=${Date.now() - startedAt}` +
        (Object.keys(extra).length ? ' ' + JSON.stringify(extra) : ''),
    )
  }

  try {
    stage = 'parse_multipart'
    log('start')
    const multipart = await req.formData()

    stage = 'parse_json'
    const raw = multipart.get('data')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing form data', requestId }, { status: 400 })
    }
    const data = JSON.parse(raw) as SupportFormData

    for (const k of ['firstName', 'lastName', 'email', 'phone', 'address', 'subject', 'comment'] as const) {
      if (!data[k]?.trim()) {
        return NextResponse.json(
          { error: `Missing required field: ${k}`, requestId, stage },
          { status: 400 },
        )
      }
    }
    log('parsed', { name: `${data.firstName} ${data.lastName}`, address: data.address })

    stage = 'match_vacancy'
    const vacancy = await findVacancyForSupport(data.address).catch((err) => {
      console.error(`[support ${requestId}] vacancy_lookup_failed:`, err)
      return null
    })
    log('vacancy_matched', {
      matched: !!vacancy,
      matchedName: vacancy?.matchedName ?? null,
      pod: vacancy?.pod ?? null,
    })

    stage = 'create_item'
    const itemId = await createSupportItem(data, vacancy)
    log('item_created', { itemId })

    stage = 'post_comment_update'
    const commentHtml = `<p>${escapeHtml(data.comment).replace(/\n/g, '<br/>')}</p>`
    await postPlainUpdate(itemId, commentHtml)
    log('comment_posted')

    stage = 'upload_file'
    const file = multipart.get('file')
    if (file instanceof File && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer())
      const type = file.type || 'application/octet-stream'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadFileToMonday(itemId, buf, safeName, type, SUPPORT_FILES_COLUMN_ID)
      log('file_uploaded', { name: safeName, mb: (buf.length / 1024 / 1024).toFixed(2) })
    } else {
      log('no_file')
    }

    stage = 'done'
    log('success', { itemId, url: `${SUPPORT_BOARD_URL_PREFIX}${itemId}`, totalMs: Date.now() - startedAt })

    return NextResponse.json({
      success: true,
      itemId,
      requestId,
      matchedProperty: vacancy?.matchedName ?? null,
      pod: vacancy?.pod ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    console.error(
      `[support ${requestId}] FAILED stage=${stage} elapsedMs=${Date.now() - startedAt} error="${message}"`,
    )
    if (stack) console.error(`[support ${requestId}] stack:\n${stack}`)
    return NextResponse.json(
      { error: `Submission failed at ${stage}: ${message}`, requestId, stage },
      { status: 500 },
    )
  }
}
