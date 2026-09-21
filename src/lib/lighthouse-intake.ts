import { createHash } from 'crypto'
import type { FormData } from '@/lib/types'

const FULL_DETAILS_MAX = 100_000
const DEFAULT_INTAKE_URL = 'https://groundfloor-force.vercel.app/api/applications/intake'
const RETRY_AFTER_CAP_MS = 5_000

export type IntakeOccupant = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
}

export type IntakePayload = {
  applicationId: string
  name?: string | null
  language: 'en' | 'fr'
  unit: {
    rentvineUnitId?: number | null
    addressText?: string | null
    unitNumber?: string | null
    city?: string | null
    province?: string | null
    postalCode?: string | null
  }
  occupants: IntakeOccupant[]
  rent?: number | null
  securityDeposit?: number | null
  submittedDate?: string | null
  moveInDate?: string | null
  fullDetails?: string | null
  incomeVerification?: unknown
}

export type IntakeSuccess = {
  id: number
  applicationId: string
  portalUrl?: string
}

export type IntakeFormData = Omit<FormData, 'documents' | 'occupantDocs'>

function parseMoney(s: string | undefined | null): number | null {
  if (!s) return null
  const cleaned = String(s).replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return isFinite(n) && n >= 0 ? n : null
}

function isIsoDate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 14) + '\n…[truncated]'
}

/** Plain-text dump of non-file form fields for Lighthouse intake_details. */
export function buildFullDetails(data: IntakeFormData): string {
  const { property, occupants = [], properties = [] } = data
  const multi = properties.length > 1
  const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']

  const lines: string[] = []

  if (multi) {
    lines.push('Properties Applied For (in order of preference)')
    for (let i = 0; i < properties.length; i++) {
      const p = properties[i]
      const rent = p.rent > 0 ? ` — $${p.rent.toLocaleString()}/mo` : ''
      lines.push(
        `${ORDINAL[i] ?? `${i + 1}th`} choice: ${p.address}${p.unit ? ` Unit ${p.unit}` : ''}, ${p.city}${rent}`,
      )
    }
    lines.push('')
  }

  lines.push(
    'Rental Application — Full Details',
    '',
    'Primary Applicant',
    `Name: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Birth Date: ${data.birthDate || '—'}`,
    `Current Address: ${[data.currentAddress, data.currentAddressLine2, data.currentCity, data.currentProvince, data.currentPostal].filter(Boolean).join(', ')}`,
    `Children: ${data.children || 'None stated'}`,
  )

  if (data.childrenList?.length) {
    for (const c of data.childrenList) {
      if (!c.name && !c.birthDate && !c.gender) continue
      const dob = c.birthDate ? ` (DOB: ${c.birthDate})` : ''
      const gender = c.gender ? ` — ${c.gender}` : ''
      lines.push(`  · ${c.name || '—'}${dob}${gender}`)
    }
  }

  lines.push(
    `Pets: ${data.pets || 'None stated'}`,
  )
  if (data.petNames) lines.push(`Pet Name(s): ${data.petNames}`)
  if (data.sin) lines.push(`SIN: ${data.sin}`)

  lines.push(
    '',
    multi ? 'Primary Property (1st choice)' : 'Property Applied For',
    `Address: ${property?.address ?? ''} ${property?.unit ? `Unit ${property.unit}` : ''}, ${property?.city ?? ''}`.trim(),
    `Leasing Agent: ${data.leasingAgent || 'N/A'}`,
    `Requested Monthly Rent: $${data.monthlyRent || property?.rent || '—'}`,
    `Security Deposit: $${data.securityDeposit || '—'}`,
    `Adults (18+): ${data.numOccupants}`,
    `Vehicles: ${data.numVehicles || '—'}`,
    `Requested Move-In Date: ${data.moveInDate || '—'}`,
    '',
    'Unit Viewing',
    `Viewed Unit: ${data.viewedUnit || '—'}`,
    `Leasing Agent: ${data.leasingAgent || '—'}`,
    '',
    'Employment (Primary Applicant)',
    `Employer Name: ${data.employerName || '—'}`,
    `Monthly Gross Salary: $${data.monthlyGrossSalary || '—'}`,
    '',
    'Rental History',
    `Previous Landlord: ${`${data.prevLandlordFirstName} ${data.prevLandlordLastName}`.trim() || '—'}`,
    `Landlord Phone: ${data.prevLandlordPhone || '—'}`,
    `Landlord Email: ${data.prevLandlordEmail || '—'}`,
    `Previous Monthly Rent: $${data.prevMonthlyRent || '—'}`,
    `Rented From: ${data.rentedFrom || '—'}  To: ${data.rentedTo || '—'}`,
    `Reason for Leaving: ${data.reasonForLeaving || '—'}`,
    '',
    'References',
    `Reference 1: ${data.ref1FirstName} ${data.ref1LastName} | Phone: ${data.ref1Phone} | Email: ${data.ref1Email}`,
  )

  if (data.cosignerFirstName || data.cosignerLastName) {
    lines.push(
      '',
      'Cosigner',
      `Name: ${data.cosignerFirstName} ${data.cosignerLastName}`,
      `Relationship: ${data.cosignerRelationship || '—'}`,
      `Email: ${data.cosignerEmail || '—'}`,
      `Phone: ${data.cosignerPhone || '—'}`,
    )
  }

  if (occupants.length > 0) {
    lines.push('', 'Additional Occupants')
    occupants.forEach((occ, i) => {
      lines.push(
        '',
        `Occupant ${i + 2}: ${occ.firstName} ${occ.lastName}`,
        `  Email: ${occ.email} | Phone: ${occ.phone}`,
        `  Birth Date: ${occ.birthDate || '—'} | Relationship: ${occ.relationship || '—'}`,
        `  Occupation: ${occ.occupation || '—'}`,
        `  Employer: ${occ.employerName || '—'} | Position: ${occ.positionHeld || '—'}`,
        `  Employer Address: ${[occ.employerAddress, occ.employerCity, occ.employerProvince, occ.employerPostal].filter(Boolean).join(', ')}`,
        `  Employer Phone: ${occ.employerPhone || '—'}`,
        `  Employment Period: ${occ.employmentFrom || '—'} to ${occ.employmentTo || 'Current'}`,
        `  Monthly Gross Salary: $${occ.monthlyGrossSalary || '—'}`,
      )
      if (occ.sameAsPrimary === false) {
        lines.push(
          `  Current Address: ${[occ.currentAddress, occ.currentAddressLine2, occ.currentCity, occ.currentProvince, occ.currentPostal].filter(Boolean).join(', ') || '—'}`,
          `  Previous Landlord: ${[occ.prevLandlordFirstName, occ.prevLandlordLastName].filter(Boolean).join(' ') || '—'}`,
          `  Landlord Phone: ${occ.prevLandlordPhone || '—'} | Email: ${occ.prevLandlordEmail || '—'}`,
          `  Reason for Leaving: ${occ.prevReasonForLeaving || '—'}`,
        )
      } else {
        lines.push('  Address & Landlord: Same as primary applicant')
      }
    })
  }

  if (data.additionalDetails) {
    lines.push('', 'Additional Details from Applicant', data.additionalDetails)
  }

  if (data.signedAt) {
    lines.push(
      '',
      'Electronic Signature',
      `Signed by ${data.firstName} ${data.lastName} on ${data.signedAt}. (Signature image uploaded to Monday; not sent to Lighthouse intake.)`,
    )
  }

  return truncate(lines.join('\n'), FULL_DETAILS_MAX)
}

export function buildIntakePayload(
  data: IntakeFormData,
  applicationId: string,
  locale: 'en' | 'fr',
  incomeVerification: unknown = {},
): IntakePayload {
  const property = data.property
  const extras = (data.occupants ?? []).slice(0, 2)

  const occupants: IntakeOccupant[] = [
    {
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      email: data.email || null,
      phone: data.phone || null,
    },
    ...extras.map((o) => ({
      firstName: o.firstName || null,
      lastName: o.lastName || null,
      email: o.email || null,
      phone: o.phone || null,
    })),
  ].slice(0, 3)

  const rent =
    parseMoney(data.monthlyRent) ??
    (property?.rent && property.rent > 0 ? property.rent : null)

  return {
    applicationId,
    name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() || null,
    language: locale === 'fr' ? 'fr' : 'en',
    unit: {
      // Property.id is a Monday vacancy item id — not a Rentvine unit id.
      addressText: property?.address || null,
      unitNumber: property?.unit || null,
      city: property?.city || null,
      province: 'NB',
      postalCode: property?.postal || null,
    },
    occupants,
    rent,
    securityDeposit: parseMoney(data.securityDeposit),
    submittedDate: todayIso(),
    moveInDate: isIsoDate(data.moveInDate) ? data.moveInDate : null,
    fullDetails: buildFullDetails(data),
    incomeVerification: incomeVerification ?? {},
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterMs(res: Response): number {
  const raw = res.headers.get('retry-after')
  if (!raw) return 1_000
  const asInt = parseInt(raw, 10)
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.min(asInt * 1000, RETRY_AFTER_CAP_MS)
  }
  const asDate = Date.parse(raw)
  if (Number.isFinite(asDate)) {
    return Math.min(Math.max(asDate - Date.now(), 0), RETRY_AFTER_CAP_MS)
  }
  return 1_000
}

/**
 * POST application JSON to Lighthouse intake.
 * Returns null when env is not configured (caller should treat as skipped).
 * Throws on auth/validation/network/server failure after retries.
 */
export async function postApplicationIntake(
  payload: IntakePayload,
): Promise<IntakeSuccess | null> {
  const secret = process.env.APPLICATIONS_INTAKE_SECRET
  const url = process.env.APPLICATIONS_INTAKE_URL || DEFAULT_INTAKE_URL

  if (!secret || !process.env.APPLICATIONS_INTAKE_URL) {
    return null
  }

  const body = JSON.stringify(payload)

  const attempt = async (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body,
    })

  let res = await attempt()

  if (res.status === 429) {
    await sleep(retryAfterMs(res))
    res = await attempt()
  } else if (res.status >= 500) {
    await sleep(500)
    res = await attempt()
  }

  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    const clipped = detail.length > 500 ? detail.slice(0, 500) + '…' : detail
    throw new Error(`Lighthouse intake failed (${res.status}): ${clipped || res.statusText}`)
  }

  const json = (await res.json()) as {
    id?: number
    applicationId?: string
    portalUrl?: string
  }

  if (typeof json.id !== 'number') {
    throw new Error('Lighthouse intake returned an unexpected body (missing id)')
  }

  return {
    id: json.id,
    applicationId: json.applicationId ?? payload.applicationId,
    portalUrl: typeof json.portalUrl === 'string' ? json.portalUrl : undefined,
  }
}


const COMMENT_BODY_MAX = 10_000

export type CommentSuccess = {
  id: string
  entityType: string
  entityId: string
  applicationId?: string
  lighthouseId?: number
  duplicate?: boolean
}

/** Deterministic UUID for idempotent comment retries (SHA-1 based). */
export function commentIdFor(applicationId: string, kind: string): string {
  const hex = createHash('sha1')
    .update(`lh-comment:${applicationId}:${kind}`)
    .digest('hex')
  const bytes = Buffer.from(hex.slice(0, 32), 'hex')
  bytes[6] = (bytes[6]! & 0x0f) | 0x50 // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80 // RFC 4122 variant
  const h = bytes.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

/** Strip HTML tags for Lighthouse comment bodies (plain text, max 10k). */
export function htmlToPlainText(html: string): string {
  const plain = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (plain.length <= COMMENT_BODY_MAX) return plain
  return plain.slice(0, COMMENT_BODY_MAX - 14) + '\n…[truncated]'
}

function lighthouseCommentsUrl(): string | null {
  const intakeUrl = process.env.APPLICATIONS_INTAKE_URL
  if (!intakeUrl) return null
  try {
    return new URL('/api/comments', new URL(intakeUrl).origin).toString()
  } catch {
    return null
  }
}

export type PostCommentArgs = {
  applicationId: string
  body: string
  commentId?: string
  lighthouseId?: number
}

/**
 * POST a staff-visible Update/comment on a Lighthouse application.
 * Same Bearer secret as intake. Returns null when env is not configured.
 * Throws on 4xx/5xx after a single 429/500 retry (same commentId).
 */
export async function postApplicationComment(
  args: PostCommentArgs,
): Promise<CommentSuccess | null> {
  const secret = process.env.APPLICATIONS_INTAKE_SECRET
  const url = lighthouseCommentsUrl()

  if (!secret || !url) {
    return null
  }

  const bodyText = args.body.trim()
  if (!bodyText) {
    throw new Error('Lighthouse comment body is empty')
  }

  const commentId = args.commentId || commentIdFor(args.applicationId, bodyText.slice(0, 64))
  const payload: Record<string, unknown> = {
    entityType: 'application',
    applicationId: args.applicationId,
    body: bodyText.length > COMMENT_BODY_MAX
      ? bodyText.slice(0, COMMENT_BODY_MAX - 14) + '\n…[truncated]'
      : bodyText,
    commentId,
  }
  if (args.lighthouseId != null) {
    payload.id = args.lighthouseId
  }

  const body = JSON.stringify(payload)

  const attempt = async (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body,
    })

  let res = await attempt()

  if (res.status === 429) {
    await sleep(retryAfterMs(res))
    res = await attempt()
  } else if (res.status >= 500) {
    await sleep(500)
    res = await attempt()
  }

  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    const clipped = detail.length > 500 ? detail.slice(0, 500) + '…' : detail
    throw new Error(`Lighthouse comment failed (${res.status}): ${clipped || res.statusText}`)
  }

  const json = (await res.json()) as {
    id?: string
    entityType?: string
    entityId?: string
    applicationId?: string
    lighthouseId?: number
    duplicate?: boolean
  }

  if (typeof json.id !== 'string') {
    throw new Error('Lighthouse comment returned an unexpected body (missing id)')
  }

  return {
    id: json.id,
    entityType: json.entityType ?? 'application',
    entityId: json.entityId ?? String(args.lighthouseId ?? ''),
    applicationId: json.applicationId ?? args.applicationId,
    lighthouseId: typeof json.lighthouseId === 'number' ? json.lighthouseId : args.lighthouseId,
    duplicate: json.duplicate === true ? true : undefined,
  }
}


const FILE_MAX_BYTES = 15 * 1024 * 1024
const ALLOWED_FILE_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'heic',
  'doc',
  'docx',
  'pages',
])

export type FileUploadSuccess = {
  id: number
  entityType: string
  entityId: string
  applicationId?: string
  lighthouseId?: number
  fileName: string
  duplicate?: boolean
}

export type PostFileArgs = {
  applicationId: string
  buffer: Buffer
  fileName: string
  mimeType?: string
  fileId?: string
  lighthouseId?: number
}

/** Deterministic UUID for idempotent file upload retries. */
export function fileIdFor(applicationId: string, kind: string): string {
  const hex = createHash('sha1')
    .update(`lh-file:${applicationId}:${kind}`)
    .digest('hex')
  const bytes = Buffer.from(hex.slice(0, 32), 'hex')
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const h = bytes.toString('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  if (i < 0) return ''
  return fileName.slice(i + 1).toLowerCase()
}

export function isAllowedLighthouseFile(fileName: string, byteLength: number): {
  ok: boolean
  reason?: string
} {
  if (byteLength <= 0) return { ok: false, reason: 'empty' }
  if (byteLength > FILE_MAX_BYTES) return { ok: false, reason: 'too_large' }
  const ext = fileExtension(fileName)
  if (!ALLOWED_FILE_EXTENSIONS.has(ext)) return { ok: false, reason: `bad_type:${ext || 'none'}` }
  return { ok: true }
}

function lighthouseFilesUrl(): string | null {
  const intakeUrl = process.env.APPLICATIONS_INTAKE_URL
  if (!intakeUrl) return null
  try {
    return new URL('/api/files', new URL(intakeUrl).origin).toString()
  } catch {
    return null
  }
}

/**
 * POST one multipart file to Lighthouse application Files.
 * Same Bearer secret as intake. Returns null when env is not configured.
 * Throws on 4xx/5xx after a single 429/500 retry (same fileId).
 */
export async function postApplicationFile(
  args: PostFileArgs,
): Promise<FileUploadSuccess | null> {
  const secret = process.env.APPLICATIONS_INTAKE_SECRET
  const url = lighthouseFilesUrl()

  if (!secret || !url) {
    return null
  }

  const check = isAllowedLighthouseFile(args.fileName, args.buffer.length)
  if (!check.ok) {
    throw new Error(`Lighthouse file rejected (${check.reason}): ${args.fileName}`)
  }

  const fileId = args.fileId || fileIdFor(args.applicationId, args.fileName)
  const mimeType = args.mimeType || 'application/octet-stream'

  const form = new FormData()
  form.set('entityType', 'application')
  form.set('applicationId', args.applicationId)
  form.set('fileId', fileId)
  if (args.lighthouseId != null) {
    form.set('id', String(args.lighthouseId))
  }
  // Uint8Array copy avoids SharedArrayBuffer typing issues with BlobPart
  const bytes = new Uint8Array(args.buffer)
  form.set('file', new Blob([bytes], { type: mimeType }), args.fileName)

  const attempt = async (): Promise<Response> =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        // Do not set Content-Type — fetch sets multipart boundary
      },
      body: form,
    })

  let res = await attempt()

  if (res.status === 429) {
    await sleep(retryAfterMs(res))
    res = await attempt()
  } else if (res.status >= 500) {
    await sleep(500)
    res = await attempt()
  }

  if (!res.ok) {
    let detail = ''
    try {
      detail = await res.text()
    } catch {
      /* ignore */
    }
    const clipped = detail.length > 500 ? detail.slice(0, 500) + '…' : detail
    throw new Error(`Lighthouse file upload failed (${res.status}): ${clipped || res.statusText}`)
  }

  const json = (await res.json()) as {
    id?: number
    entityType?: string
    entityId?: string
    applicationId?: string
    lighthouseId?: number
    fileName?: string
    duplicate?: boolean
  }

  if (typeof json.id !== 'number') {
    throw new Error('Lighthouse file upload returned an unexpected body (missing id)')
  }

  return {
    id: json.id,
    entityType: json.entityType ?? 'application',
    entityId: json.entityId ?? String(args.lighthouseId ?? ''),
    applicationId: json.applicationId ?? args.applicationId,
    lighthouseId: typeof json.lighthouseId === 'number' ? json.lighthouseId : args.lighthouseId,
    fileName: json.fileName ?? args.fileName,
    duplicate: json.duplicate === true ? true : undefined,
  }
}
