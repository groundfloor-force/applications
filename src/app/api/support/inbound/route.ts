import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import {
  applyVacancyMatchToSupportItem,
  createSupportItem,
  findVacancyForSupport,
  postPlainUpdate,
  uploadFileToMonday,
  SUPPORT_FILES_COLUMN_ID,
  type SupportFormData,
  type VacancyMatch,
} from '@/lib/monday'

export const maxDuration = 60

// Payload Make.com should POST. All fields optional except `subject` and
// (`from` OR `email`). Attachments can be either a downloadable URL that
// we fetch, or an inline base64 blob.
interface InboundEmailPayload {
  from?: string // e.g. "John Doe <john@example.com>" or just "john@example.com"
  email?: string // explicit sender email if "from" is bare
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  subject: string
  body?: string // plaintext preferred
  bodyHtml?: string // fallback if plaintext missing
  attachments?: Array<{
    name: string
    url?: string
    base64?: string
    contentType?: string
  }>
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Parse "John Doe <john@example.com>" or "john@example.com" into { name, email }.
function parseFrom(raw: string): { name: string; email: string } {
  const angleMatch = raw.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/)
  if (angleMatch) return { name: angleMatch[1].trim(), email: angleMatch[2].trim() }
  const bare = raw.trim()
  if (bare.includes('@')) return { name: '', email: bare }
  return { name: bare, email: '' }
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// Very loose address sniffer: look for something like "123 Main St" or
// "250 Mill Rd Unit 3" in the email body. Returns "" if nothing looks
// like an address — the ticket still gets created, just without POD auto-routing.
function sniffAddressFromBody(body: string): string {
  const lines = body.split(/\r?\n/)
  const streetTypes = /\b(street|st|road|rd|avenue|ave|drive|dr|court|ct|lane|ln|boulevard|blvd|crescent|cres|place|pl|way|highway|hwy)\b/i
  for (const line of lines) {
    if (/^\s*\d+\s+\S/.test(line) && streetTypes.test(line)) {
      return line.trim().slice(0, 200)
    }
  }
  return ''
}

function buildSupportUpdateHtml(
  data: SupportFormData,
  vacancy: VacancyMatch | null,
  source: string,
  originalBody: string,
): string {
  const parts: string[] = []

  parts.push(`<h2>📩 Support Request — ${escapeHtml(data.subject)}</h2>`)
  parts.push(`<p><i>Source: ${escapeHtml(source)}</i></p>`)

  parts.push('<p><b>Submitted by</b></p>')
  parts.push('<ul>')
  const fullName = `${data.firstName} ${data.lastName}`.trim() || '(unknown)'
  parts.push(`<li><b>Name:</b> ${escapeHtml(fullName)}</li>`)
  if (data.email)
    parts.push(`<li><b>Email:</b> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></li>`)
  if (data.phone) parts.push(`<li><b>Phone:</b> ${escapeHtml(data.phone)}</li>`)
  parts.push(`<li><b>Address:</b> ${escapeHtml(data.address) || '<i>not provided</i>'}</li>`)
  parts.push('</ul>')

  if (vacancy) {
    parts.push('<p><b>Matched Property</b></p>')
    parts.push('<ul>')
    parts.push(`<li><b>Property:</b> ${escapeHtml(vacancy.matchedName)}</li>`)
    if (vacancy.pod) parts.push(`<li><b>POD:</b> ${escapeHtml(vacancy.pod)}</li>`)
    parts.push('</ul>')
  } else if (data.address) {
    parts.push('<p><i>No matching property found in the Vacancy List.</i></p>')
  }

  parts.push('<hr>')
  parts.push('<h3>💬 Message</h3>')
  parts.push(`<p>${escapeHtml(originalBody).replace(/\n/g, '<br/>')}</p>`)

  return parts.join('')
}

function verifySecret(req: NextRequest): boolean {
  const expected = process.env.INBOUND_WEBHOOK_SECRET
  if (!expected) return false
  const provided =
    req.headers.get('x-webhook-secret') ??
    req.nextUrl.searchParams.get('secret') ??
    ''
  return provided === expected
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startedAt = Date.now()
  let stage = 'init'

  const log = (event: string, extra: Record<string, unknown> = {}) => {
    console.log(
      `[inbound ${requestId}] stage=${stage} event=${event} elapsedMs=${Date.now() - startedAt}` +
        (Object.keys(extra).length ? ' ' + JSON.stringify(extra) : ''),
    )
  }

  try {
    stage = 'auth'
    if (!verifySecret(req)) {
      log('auth_failed')
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }

    stage = 'parse_body'
    const payload = (await req.json()) as InboundEmailPayload
    if (!payload.subject?.trim()) {
      return NextResponse.json({ error: 'Missing subject', requestId }, { status: 400 })
    }
    const parsed = parseFrom(payload.from ?? '')
    const email = payload.email?.trim() || parsed.email
    const nameFallback = splitName(parsed.name)
    const firstName = (payload.firstName || nameFallback.firstName || '').trim()
    const lastName = (payload.lastName || nameFallback.lastName || '').trim()
    const originalBody = (payload.body ?? payload.bodyHtml ?? '').toString()
    const address = (payload.address || sniffAddressFromBody(originalBody) || '').trim()

    const data: SupportFormData = {
      firstName: firstName || 'Unknown',
      lastName: lastName || 'Sender',
      email: email || '',
      phone: (payload.phone || '').trim(),
      address,
      subject: payload.subject.trim(),
      comment: originalBody,
    }
    log('parsed', { from: email, subject: data.subject, addressFound: !!address })

    stage = 'create_item'
    const itemId = await createSupportItem(data)
    log('item_created', { itemId })

    stage = 'upload_attachments'
    const attachments = payload.attachments ?? []
    for (const att of attachments) {
      try {
        let buf: Buffer | null = null
        let type = att.contentType || 'application/octet-stream'
        if (att.url) {
          const res = await fetch(att.url)
          if (!res.ok) throw new Error(`fetch ${att.url} → ${res.status}`)
          const arr = await res.arrayBuffer()
          buf = Buffer.from(arr)
          type = res.headers.get('content-type') || type
        } else if (att.base64) {
          buf = Buffer.from(att.base64, 'base64')
        }
        if (!buf) continue
        const safeName = (att.name || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')
        await uploadFileToMonday(itemId, buf, safeName, type, SUPPORT_FILES_COLUMN_ID)
      } catch (err) {
        console.error(`[inbound ${requestId}] attachment_failed name=${att.name}:`, err)
      }
    }
    log('attachments_done', { count: attachments.length })

    // Same deferred pattern as the form route.
    after(async () => {
      const bgStart = Date.now()
      let bgStage = 'match_vacancy'
      try {
        const vacancy = data.address
          ? await findVacancyForSupport(data.address).catch(() => null)
          : null
        if (vacancy) {
          bgStage = 'apply_vacancy_columns'
          await applyVacancyMatchToSupportItem(itemId, vacancy).catch((err) => {
            console.error(`[inbound ${requestId}] apply_vacancy_columns_failed:`, err)
          })
        }
        bgStage = 'post_update'
        await postPlainUpdate(
          itemId,
          buildSupportUpdateHtml(data, vacancy, `Email — ${email || 'unknown sender'}`, originalBody),
        )
        console.log(`[inbound ${requestId}] bg done totalMs=${Date.now() - bgStart}`)
      } catch (err) {
        console.error(
          `[inbound ${requestId}] bg FAILED stage=${bgStage} error="${err instanceof Error ? err.message : String(err)}"`,
        )
      }
    })

    stage = 'done'
    log('success', { itemId, totalMs: Date.now() - startedAt })
    return NextResponse.json({ success: true, itemId, requestId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(
      `[inbound ${requestId}] FAILED stage=${stage} elapsedMs=${Date.now() - startedAt} error="${message}"`,
    )
    return NextResponse.json(
      { error: `Inbound failed at ${stage}: ${message}`, requestId, stage },
      { status: 500 },
    )
  }
}
