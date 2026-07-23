// Notice to Vacate — form types, validation, and Monday column mapping.
// Pure helpers only (no network) so they can be unit-tested; the Monday
// mutation itself lives in monday.ts.

export interface NoticeFormData {
  unitId: string
  unitName: string
  moveOutDate: string // ISO YYYY-MM-DD
  fullName: string
  email: string
  reason: string
  details: string
  forwardingAddress: string
  forwardingPostal: string
  occupantsMoving: string
  roommateDetails: string
  signatureData: string // PNG data URL
}

// Tenant-visible options, in the order used on the Monday form.
export const NOTICE_REASONS = [
  'Moving out of City/Province/Country',
  'Purchased a home',
  'Need more space',
  'Need less space',
  'Rent price/Rent Increase',
  'Separation/Roommate Issues',
  'Other - please provide reason below',
] as const

export const NOTICE_REASON_OTHER = 'Other - please provide reason below'

export const OCCUPANTS_OPTIONS = [
  'Yes - All occupants are moving out',
  'No - My roommate wishes to keep the apartment',
  'Other - Please provide more details below',
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function validateNotice(data: NoticeFormData): Partial<Record<keyof NoticeFormData, string>> {
  const e: Partial<Record<keyof NoticeFormData, string>> = {}
  if (!data.unitId || !data.unitName.trim()) e.unitId = 'Please select your address'
  if (!data.moveOutDate) e.moveOutDate = 'Required'
  else if (!ISO_DATE_RE.test(data.moveOutDate) || isNaN(Date.parse(data.moveOutDate))) {
    e.moveOutDate = 'Enter a valid date (YYYY-MM-DD)'
  }
  if (!data.fullName.trim()) e.fullName = 'Required'
  if (!data.email.trim()) e.email = 'Required'
  else if (!EMAIL_RE.test(data.email)) e.email = 'Invalid email address'
  if (!data.reason) e.reason = 'Required'
  else if (!(NOTICE_REASONS as readonly string[]).includes(data.reason)) e.reason = 'Invalid reason'
  if (data.reason === NOTICE_REASON_OTHER && !data.details.trim()) {
    e.details = 'Please provide details for your reason'
  }
  if (data.occupantsMoving && !(OCCUPANTS_OPTIONS as readonly string[]).includes(data.occupantsMoving)) {
    e.occupantsMoving = 'Invalid selection'
  }
  if (!data.occupantsMoving) e.occupantsMoving = 'Required'
  if (!data.signatureData.startsWith('data:image/')) e.signatureData = 'Signature is required'
  return e
}

// Unit item names look like "21 Newcombe Dr - 106" or "62 Steadman Street"
// (no unit). The separator is " - " with spaces, so street names containing
// hyphens ("29-79 Rue Des Eleves - 75") parse correctly.
export function parseUnitName(name: string): { address: string; unit: string } {
  const trimmed = name.trim()
  const idx = trimmed.lastIndexOf(' - ')
  if (idx === -1) return { address: trimmed, unit: '' }
  return { address: trimmed.slice(0, idx).trim(), unit: trimmed.slice(idx + 3).trim() }
}

export const NOTICES_FORWARDING_ADDRESS_COLUMN_ID = 'text_mm5hc6dk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildNoticeColumnValues(data: NoticeFormData): Record<string, any> {
  const { address, unit } = parseUnitName(data.unitName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cv: Record<string, any> = {
    date8: { date: new Date().toISOString().split('T')[0] }, // Created
    status: { label: '*NEW' },
    type: { label: 'Move Out' },
    date: { date: data.moveOutDate }, // Move Out Date
    text0: data.fullName, // Tenant Name
    text2: data.email, // Tenant Email
    dropdown__1: { labels: [data.reason] }, // Reason for Moving Out
    text5: address, // Address
    text00: unit, // Unit
    board_relation_mm1jz4k6: { item_ids: [Number(data.unitId)] }, // Rentvine Unit
  }
  if (data.details.trim()) cv.long_text = { text: data.details.trim() } // Notice
  if (data.occupantsMoving) cv.dropdown_mm544ttk = { labels: [data.occupantsMoving] }
  if (data.roommateDetails.trim()) cv.text_mm542y9p = data.roommateDetails.trim()
  if (data.forwardingAddress.trim()) cv[NOTICES_FORWARDING_ADDRESS_COLUMN_ID] = data.forwardingAddress.trim()
  if (data.forwardingPostal.trim()) cv.text_mm546cmt = data.forwardingPostal.trim()
  return cv
}

export function noticeItemName(data: NoticeFormData): string {
  return `${data.unitName.trim()} - ${data.fullName.trim()}`.slice(0, 250)
}
