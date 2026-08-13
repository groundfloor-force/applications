import { parseUnitName } from './notices'
import type { RoommateChangeData, RoommatePerson } from './types'
import { emptyRoommatePerson, initialRoommateChangeData } from './types'

export const ROOMMATE_STORAGE_KEY = 'gfpm_roommate_change_v1'
export const ROOMMATE_SUCCESS_KEY = 'gfpm_roommate_change_success'
export const ROOMMATE_FEE_AMOUNT = 100
export const ROOMMATE_FEE_EMAIL = 'deposit@groundfloorpm.com'
export const ROOMMATE_STATUS_LABEL = 'Roommate Exchange'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface RoommateValidationMessages {
  addressRequired: string
  minTenants: string
  firstNameRequired: string
  lastNameRequired: string
  emailRequired: string
  emailInvalid: string
  phoneRequired: string
  statusRequired: string
  needStaying: string
  needLeaving: string
  incomingQuestion: string
  incomingMin: string
  feeRequired: string
}

export const DEFAULT_RM_VALIDATION: RoommateValidationMessages = {
  addressRequired: 'Please select your address from the list.',
  minTenants: 'Add at least two current tenants.',
  firstNameRequired: 'First name is required.',
  lastNameRequired: 'Last name is required.',
  emailRequired: 'Email is required.',
  emailInvalid: 'Enter a valid email address.',
  phoneRequired: 'Phone is required.',
  statusRequired: 'Choose staying or leaving.',
  needStaying: 'At least one tenant must be staying.',
  needLeaving: 'At least one tenant must be leaving.',
  incomingQuestion: 'Please tell us if anyone new is moving in.',
  incomingMin: 'Add at least one person moving in, or choose No.',
  feeRequired: 'You must agree to the $100 fee to continue.',
}

export { emptyRoommatePerson, initialRoommateChangeData }

export function personName(p: RoommatePerson): string {
  return `${p.firstName} ${p.lastName}`.trim()
}

export function staying(data: RoommateChangeData): RoommatePerson[] {
  return data.tenants.filter((t) => t.status === 'staying')
}

export function leaving(data: RoommateChangeData): RoommatePerson[] {
  return data.tenants.filter((t) => t.status === 'leaving')
}

export function incomingPeople(data: RoommateChangeData): RoommatePerson[] {
  if (data.hasIncoming !== true) return []
  return data.incoming.filter((p) => personName(p) || p.email || p.phone)
}

export function joinNames(people: RoommatePerson[], andWord: string): string {
  const names = people.map(personName).filter(Boolean)
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} ${andWord} ${names[1]}`
  return `${names.slice(0, -1).join(', ')} ${andWord} ${names[names.length - 1]}`
}

function validatePerson(
  p: RoommatePerson,
  prefix: string,
  v: RoommateValidationMessages,
): Record<string, string> {
  const e: Record<string, string> = {}
  if (!p.firstName.trim()) e[`${prefix}_firstName`] = v.firstNameRequired
  if (!p.lastName.trim()) e[`${prefix}_lastName`] = v.lastNameRequired
  if (!p.email.trim()) e[`${prefix}_email`] = v.emailRequired
  else if (!EMAIL_RE.test(p.email.trim())) e[`${prefix}_email`] = v.emailInvalid
  if (!p.phone.trim()) e[`${prefix}_phone`] = v.phoneRequired
  return e
}

export function validateRoommateStep(
  step: number,
  data: RoommateChangeData,
  v: RoommateValidationMessages = DEFAULT_RM_VALIDATION,
): Record<string, string> {
  const e: Record<string, string> = {}

  if (step >= 1) {
    if (!data.unitId || !data.unitName.trim()) e.unitId = v.addressRequired
  }

  if (step >= 2) {
    if (data.tenants.length < 2) e.tenants = v.minTenants
    data.tenants.forEach((t, i) => Object.assign(e, validatePerson(t, `tenant${i}`, v)))
  }

  if (step >= 3) {
    data.tenants.forEach((t, i) => {
      if (t.status !== 'staying' && t.status !== 'leaving') {
        e[`tenant${i}_status`] = v.statusRequired
      }
    })
    if (staying(data).length === 0) e.needStaying = v.needStaying
    if (leaving(data).length === 0) e.needLeaving = v.needLeaving
  }

  if (step >= 4) {
    if (data.hasIncoming === null) e.hasIncoming = v.incomingQuestion
    if (data.hasIncoming === true) {
      if (data.incoming.length < 1) e.incoming = v.incomingMin
      data.incoming.forEach((p, i) => Object.assign(e, validatePerson(p, `incoming${i}`, v)))
    }
  }

  if (step >= 6) {
    if (!data.feeAgreed) e.feeAgreed = v.feeRequired
  }

  return e
}

export function roommateItemName(data: RoommateChangeData): string {
  const { address, unit } = parseUnitName(data.unitName)
  const parts = ['Roommate Change –', address]
  if (unit) parts.push(`Unit ${unit}`)
  return parts.filter(Boolean).join(' ').slice(0, 250)
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function personLine(p: RoommatePerson): string {
  const name = escapeHtml(personName(p) || '—')
  const email = escapeHtml(p.email || '—')
  const phone = escapeHtml(p.phone || '—')
  return `${name} · ${email} · ${phone}`
}

export function buildRoommateChangeHtml(data: RoommateChangeData): string {
  const stay = staying(data)
  const leave = leaving(data)
  const incoming = incomingPeople(data)
  const lines = [
    '<h2>Roommate Change Request</h2>',
    `<b>Property:</b> ${escapeHtml(data.unitName)}`,
    '',
    '<b>Staying</b>',
    ...stay.map((p) => `· ${personLine(p)}`),
    '',
    '<b>Leaving</b>',
    ...leave.map((p) => `· ${personLine(p)}`),
    '',
    '<b>Moving in</b>',
    incoming.length === 0
      ? ['· None']
      : incoming.map((p) => `· ${personLine(p)}`),
    '',
    `<b>Fee:</b> Agreed — $${ROOMMATE_FEE_AMOUNT} e-transfer to ${ROOMMATE_FEE_EMAIL}`,
    `<i>Submitted ${new Date().toLocaleString('en-CA', { timeZone: 'America/Moncton' })}</i>`,
  ]
  return lines.flat().join('\n')
}

export interface RoommateChangeSummary {
  unitName: string
  staying: { name: string; email: string; phone: string }[]
  leaving: { name: string; email: string; phone: string }[]
  incoming: { name: string; email: string; phone: string }[]
}

function toSummaryPerson(p: RoommatePerson) {
  return { name: personName(p), email: p.email, phone: p.phone }
}

export function buildRoommateChangeSummary(data: RoommateChangeData): RoommateChangeSummary {
  return {
    unitName: data.unitName,
    staying: staying(data).map(toSummaryPerson),
    leaving: leaving(data).map(toSummaryPerson),
    incoming: incomingPeople(data).map(toSummaryPerson),
  }
}

export function pdfFileName(data: RoommateChangeData): string {
  const dateStr = new Date().toISOString().split('T')[0]
  const slug = data.unitName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40)
  return `RoommateChange_${slug || 'request'}_${dateStr}.pdf`
}

export interface SavedRoommateForm {
  step: number
  data: RoommateChangeData
  savedAt: number
}

export function saveRoommateForm(step: number, data: RoommateChangeData): void {
  try {
    localStorage.setItem(ROOMMATE_STORAGE_KEY, JSON.stringify({ step, data, savedAt: Date.now() }))
  } catch {
    // ignore
  }
}

export function loadRoommateForm(): SavedRoommateForm | null {
  try {
    const raw = localStorage.getItem(ROOMMATE_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedRoommateForm
  } catch {
    return null
  }
}

export function clearRoommateForm(): void {
  try {
    localStorage.removeItem(ROOMMATE_STORAGE_KEY)
  } catch {
    // ignore
  }
}
