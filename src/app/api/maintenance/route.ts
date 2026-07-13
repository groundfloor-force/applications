import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import {
  applyVacancyMatchToMaintenanceItem,
  createGuidedMaintenanceItem,
  findVacancyForSupport,
  postPlainUpdate,
  uploadFileToMonday,
  MAINTENANCE_FILES_COLUMN_ID,
  MAINTENANCE_BOARD_URL_PREFIX,
  MAINTENANCE_UPDATE_MARKER,
} from '@/lib/monday'
import { sendEmergencyMaintenanceEmail } from '@/lib/email'
import { waterLeakWorkflowV1 as wf } from '@/lib/maintenance/workflows/water-leak-v1'
import { buildRequestPayload, type MaintenanceRequestPayload } from '@/lib/maintenance/request'
import { safeNotify, logProvider, type NotificationProvider } from '@/lib/maintenance/notifications'
import type { EngineState } from '@/lib/maintenance/types'

export const maxDuration = 60

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Rich human-readable Monday update. Begins with the marker phrase so the admin
// view can identify app-submitted guided requests when reading the board back.
function buildUpdateHtml(payload: MaintenanceRequestPayload, mediaCount: number): string {
  const p: string[] = []
  p.push(`<h2>🔧 Maintenance ${MAINTENANCE_UPDATE_MARKER} — ${escapeHtml(payload.priority)}</h2>`)

  if (payload.emergencyFlag) {
    p.push(`<p><b>🚨 EMERGENCY — ${escapeHtml(payload.emergencyType ?? 'Urgent')}</b></p>`)
  }

  p.push(`<p><b>Summary:</b> ${escapeHtml(payload.summary)}</p>`)

  p.push('<ul>')
  p.push(`<li><b>Priority:</b> ${escapeHtml(payload.priority)} — ${escapeHtml(payload.suggestedResponseTime)}</li>`)
  p.push(`<li><b>Suggested trade:</b> ${escapeHtml(payload.suggestedTrade)}</li>`)
  p.push(`<li><b>Damage risk:</b> ${escapeHtml(payload.damageRisk)}</li>`)
  if (payload.safetyFlags.length) {
    p.push(`<li><b>Safety flags:</b> ${escapeHtml(payload.safetyFlags.map((f) => f.replace(/_/g, ' ')).join(', '))}</li>`)
  }
  if (payload.coordinatorReview) p.push('<li><b>⚠ Coordinator review requested</b></li>')
  p.push(`<li><b>Photos provided:</b> ${mediaCount}</li>`)
  p.push('</ul>')

  p.push('<hr>')
  p.push('<h3>Answers</h3>')
  p.push('<ul>')
  for (const entry of payload.qaHistory) {
    if (entry.inputType === 'photo' || entry.inputType === 'video') continue
    const label = entry.answerLabel?.trim()
    if (!label) continue
    p.push(`<li><b>${escapeHtml(entry.question)}</b> ${escapeHtml(label)}</li>`)
  }
  p.push('</ul>')

  p.push(
    `<p style="color:#888;font-size:12px;">Workflow ${escapeHtml(payload.workflowId)} v${escapeHtml(payload.workflowVersion)} · ref ${escapeHtml(payload.id ?? '')}</p>`,
  )
  return p.join('')
}

export async function POST(req: NextRequest) {
  const requestId = 'MREQ-' + crypto.randomUUID().slice(0, 8)
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

    stage = 'parse_state'
    const raw = multipart.get('state')
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing intake state', requestId }, { status: 400 })
    }
    const state = JSON.parse(raw) as EngineState
    if (state.workflowId !== wf.id) {
      return NextResponse.json({ error: 'Unknown workflow', requestId }, { status: 400 })
    }

    // Server-authoritative: recompute severity/priority from the answers.
    // Any client-supplied priority is ignored — buildRequestPayload derives it.
    stage = 'build_payload'
    const payload = buildRequestPayload(wf, state)
    payload.id = requestId
    payload.createdAt = new Date().toISOString()

    // Minimal server validation of the fields we need to act on the request.
    for (const [field, val] of [
      ['name', payload.contact.name],
      ['phone', payload.contact.phone],
      ['email', payload.contact.email],
      ['address', payload.property.address],
    ] as const) {
      if (!val?.trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}`, requestId, stage }, { status: 400 })
      }
    }
    log('payload_built', { priority: payload.priority, emergency: payload.emergencyFlag })

    stage = 'create_item'
    const itemId = await createGuidedMaintenanceItem(payload)
    log('item_created', { itemId })

    stage = 'upload_files'
    const files = multipart.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
    let uploaded = 0
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      const type = file.type || 'application/octet-stream'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await uploadFileToMonday(itemId, buf, safeName, type, MAINTENANCE_FILES_COLUMN_ID).catch((err) => {
        console.error(`[maintenance ${requestId}] file_upload_failed name=${safeName}:`, err)
      })
      uploaded++
    }
    log('files_uploaded', { count: uploaded })

    stage = 'post_update'
    await postPlainUpdate(itemId, buildUpdateHtml(payload, uploaded))
    log('update_posted')

    // Emergency notification — never allowed to block request creation.
    if (payload.emergencyFlag) {
      stage = 'notify'
      const notificationEmail =
        process.env.MAINTENANCE_EMERGENCY_EMAIL ?? process.env.NOTIFICATION_EMAIL ?? ''
      const emailProvider: NotificationProvider = {
        name: 'email',
        async send(n) {
          await sendEmergencyMaintenanceEmail(notificationEmail, {
            requestId: n.requestId,
            priority: n.priority,
            emergencyType: n.emergencyType,
            summary: n.summary,
            property: `${n.propertyAddress ?? ''}${n.unit ? ' #' + n.unit : ''}`.trim(),
            contactName: n.contactName ?? '',
            contactPhone: n.contactPhone ?? '',
            safetyFlags: n.safetyFlags,
            mondayItemUrl: `${MAINTENANCE_BOARD_URL_PREFIX}${itemId}`,
          })
        },
      }
      const outcomes = await safeNotify([logProvider, emailProvider], {
        requestId,
        priority: payload.priority,
        emergencyType: payload.emergencyType,
        summary: payload.summary,
        propertyAddress: payload.property.address,
        unit: payload.property.unit,
        contactName: payload.contact.name,
        contactPhone: payload.contact.phone,
        safetyFlags: payload.safetyFlags,
      })
      log('notified', { outcomes })
    }

    // Defer the paginated Vacancy match + property link so the applicant sees
    // success immediately (mirrors the support flow).
    after(async () => {
      try {
        const vacancy = await findVacancyForSupport(payload.property.address).catch(() => null)
        if (vacancy) await applyVacancyMatchToMaintenanceItem(itemId, vacancy).catch(() => {})
      } catch (err) {
        console.error(`[maintenance ${requestId}] bg property-link failed:`, err)
      }
    })

    stage = 'done'
    log('success', { itemId, totalMs: Date.now() - startedAt })
    return NextResponse.json({
      success: true,
      requestId,
      itemId,
      priority: payload.priority,
      emergencyFlag: payload.emergencyFlag,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[maintenance ${requestId}] FAILED stage=${stage} error="${message}"`)
    return NextResponse.json({ error: `Submission failed at ${stage}: ${message}`, requestId, stage }, { status: 500 })
  }
}
