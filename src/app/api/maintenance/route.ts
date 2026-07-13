import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import {
  applyVacancyMatchToMaintenanceItem,
  createMaintenanceItem,
  findVacancyForSupport,
  postPlainUpdate,
  uploadFileToMonday,
  MAINTENANCE_FILES_COLUMN_ID,
  MAINTENANCE_BOARD_URL_PREFIX,
  type MaintenanceFormData,
  type VacancyMatch,
} from '@/lib/monday'

export const maxDuration = 60

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildMaintenanceUpdateHtml(
  data: MaintenanceFormData,
  vacancy: VacancyMatch | null,
): string {
  const parts: string[] = []

  parts.push(`<h2>🔧 Maintenance Work Order — ${escapeHtml(data.subject)}</h2>`)

  parts.push('<p><b>Submitted by</b></p>')
  parts.push('<ul>')
  parts.push(`<li><b>Name:</b> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</li>`)
  parts.push(`<li><b>Email:</b> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></li>`)
  parts.push(`<li><b>Phone:</b> ${escapeHtml(data.phone)}</li>`)
  parts.push(`<li><b>Address:</b> ${escapeHtml(data.address)}</li>`)
  parts.push('</ul>')

  parts.push('<p><b>Work Order Details</b></p>')
  parts.push('<ul>')
  if (data.category) parts.push(`<li><b>Category:</b> ${escapeHtml(data.category)}</li>`)
  if (data.priority) parts.push(`<li><b>Priority:</b> ${escapeHtml(data.priority)}</li>`)
  if (data.permission) parts.push(`<li><b>Permission to Enter:</b> ${escapeHtml(data.permission)}</li>`)
  parts.push('</ul>')

  if (vacancy) {
    parts.push('<p><b>Matched Property</b></p>')
    parts.push('<ul>')
    parts.push(`<li><b>Property:</b> ${escapeHtml(vacancy.matchedName)}</li>`)
    parts.push('</ul>')
  } else {
    parts.push('<p><i>No matching property found in the Vacancy List.</i></p>')
  }

  parts.push('<hr>')
  parts.push('<h3>💬 Description</h3>')
  parts.push(`<p>${escapeHtml(data.comment).replace(/\n/g, '<br/>')}</p>`)

  return parts.join('')
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()
  let stage = 'init'

  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[maintenance ${requestId}] stage=${stage} event=${event} elapsedMs=${Date.now() - startedAt}` +
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
    const data = JSON.parse(raw) as MaintenanceFormData

    for (const k of ['firstName', 'lastName', 'email', 'phone', 'address', 'subject', 'comment'] as const) {
      if (!data[k]?.trim()) {
        return NextResponse.json(
          { error: `Missing required field: ${k}`, requestId, stage },
          { status: 400 },
        )
      }
    }
    log('parsed', { name: `${data.firstName} ${data.lastName}`, address: data.address })

    stage = 'create_item'
    const itemId = await createMaintenanceItem(data)
    log('item_created', { itemId })

    stage = 'upload_file'
    const file = multipart.get('file')
    if (file instanceof File && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer())
      const type = file.type || 'application/octet-stream'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadFileToMonday(itemId, buf, safeName, type, MAINTENANCE_FILES_COLUMN_ID)
      log('file_uploaded', { name: safeName, mb: (buf.length / 1024 / 1024).toFixed(2) })
    } else {
      log('no_file')
    }

    // Defer the vacancy match (paginated Monday fetch), property-link patching,
    // and the structured update post to Vercel's after() hook so the applicant
    // sees the success screen immediately. Staff still get the fully-annotated
    // item ~2-4s later.
    after(async () => {
      const bgStart = Date.now()
      let bgStage = 'match_vacancy'
      try {
        const vacancy = await findVacancyForSupport(data.address).catch((err) => {
          console.error(`[maintenance ${requestId}] vacancy_lookup_failed:`, err)
          return null
        })
        console.log(
          `[maintenance ${requestId}] bg vacancy_matched matched=${!!vacancy} elapsedMs=${Date.now() - bgStart}`,
        )

        if (vacancy) {
          bgStage = 'apply_property_link'
          await applyVacancyMatchToMaintenanceItem(itemId, vacancy).catch((err) => {
            console.error(`[maintenance ${requestId}] apply_property_link_failed:`, err)
          })
        }

        bgStage = 'post_update'
        await postPlainUpdate(itemId, buildMaintenanceUpdateHtml(data, vacancy))
        console.log(`[maintenance ${requestId}] bg done totalMs=${Date.now() - bgStart}`)
      } catch (err) {
        console.error(
          `[maintenance ${requestId}] bg FAILED stage=${bgStage} error="${err instanceof Error ? err.message : String(err)}"`,
        )
      }
    })

    stage = 'done'
    log('success', { itemId, url: `${MAINTENANCE_BOARD_URL_PREFIX}${itemId}`, totalMs: Date.now() - startedAt })

    return NextResponse.json({
      success: true,
      itemId,
      requestId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error ? error.stack : undefined
    console.error(
      `[maintenance ${requestId}] FAILED stage=${stage} elapsedMs=${Date.now() - startedAt} error="${message}"`,
    )
    if (stack) console.error(`[maintenance ${requestId}] stack:\n${stack}`)
    return NextResponse.json(
      { error: `Submission failed at ${stage}: ${message}`, requestId, stage },
      { status: 500 },
    )
  }
}
