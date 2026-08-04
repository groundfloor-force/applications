// ─────────────────────────────────────────────────────────────────────────────
// Structured maintenance request payload + natural-language summary.
//
// buildRequestPayload is a PURE function of the workflow + engine state. It does
// not stamp an id or createdAt (no Date/random here) — the server does that at
// submit time, which also keeps this unit-testable and deterministic.
// ─────────────────────────────────────────────────────────────────────────────

import type { WorkflowDefinition, EngineState, AnswerValue, QAHistoryEntry, Priority } from './types'
import { buildHistory } from './engine'
import { evaluateSeverity, type Severity } from './priority-rules'
import { QID, CATEGORY, WATER_FLOW, FLAG } from './ids'
import { APPL } from './workflows/appliance-v1'
import { WALL } from './workflows/walls-ceilings-v1'
import { CATEGORY_PRIMARY_QUESTIONS } from './workflows'

export interface MaintenanceRequestPayload {
  // Filled by the server at submission:
  id: string | null
  createdAt: string | null
  status: 'new'
  source: 'guided_intake'

  // Classification & severity (server recomputes severity authoritatively):
  category: string
  issueType: string
  priority: Priority
  emergencyFlag: boolean
  emergencyType: string | null
  safetyFlags: string[]
  damageRisk: Severity['damageRisk']
  coordinatorReview: boolean
  suggestedTrade: string
  suggestedResponseTime: string

  // Human-readable:
  summary: string
  description: string

  // Contact:
  contact: {
    name: string
    phone: string
    email: string
    preferredContact: string
  }

  // Property & access:
  property: {
    address: string
    unit: string
    managerName: string
    submitterRole: string
  }
  permissionToEnter: string
  accessInstructions: string
  someoneHome: string
  lockbox: string
  parking: string
  pets: string
  petDetails: string
  bestTimes: string

  // Provenance:
  workflowId: string
  workflowVersion: string
  qaHistory: QAHistoryEntry[]
}

function label(state: EngineState, id: string): string {
  return state.labels[id] ?? asString(state.answers[id])
}

function asString(v: AnswerValue): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

/** The answered primary-question labels for a category, in declared order. */
function answeredPrimaryLabels(state: EngineState, category: string): string[] {
  return (CATEGORY_PRIMARY_QUESTIONS[category] ?? [])
    .filter((id) => state.answers[id])
    .map((id) => label(state, id))
    .filter(Boolean)
}

/** Deterministic natural-language summary for coordinators. */
export function buildSummary(state: EngineState, severity: Severity): string {
  const a = state.answers
  const role = label(state, QID.SUBMITTER_ROLE) || 'Someone'
  const category = asString(a[QID.CATEGORY])
  const parts: string[] = []

  // Gated on the leak answers rather than the category, so the two paths that
  // jump into the leak tree from elsewhere (broken fixture → q_water_flow,
  // wall/ceiling water damage → q_damage_location) get the same good prose.
  if (a[QID.WATER_FLOW] || a[QID.DAMAGE_LOCATION]) {
    const flow = asString(a[QID.WATER_FLOW])
    const source = label(state, QID.LEAK_SOURCE) || label(state, QID.FIXTURE)
    const where = source ? ` ${source.toLowerCase()}` : ''

    if (flow === WATER_FLOW.UNCONTROLLED) {
      parts.push(`${role} reports an active, uncontrolled leak from the${where || ' property'}.`)
    } else if (flow === WATER_FLOW.CONTAINED) {
      parts.push(`${role} reports an active leak from the${where || ' property'}, now contained.`)
      const how = label(state, QID.CONTAINMENT)
      if (how) parts.push(`Contained by: ${how.toLowerCase()}.`)
    } else if (flow === WATER_FLOW.WHEN_USED) {
      const amount = label(state, QID.LEAK_AMOUNT)
      parts.push(`${role} reports a leak from the${where || ' fixture'} that appears only when used${amount ? ` (${amount.toLowerCase()})` : ''}.`)
    } else if (flow === WATER_FLOW.DAMAGE_ONLY || (!flow && a[QID.DAMAGE_LOCATION])) {
      // `!flow` = arrived here from the walls & ceilings flow.
      const dmg = label(state, QID.DAMAGE_LOCATION)
      const what = !flow ? label(state, WALL.WHAT) : ''
      parts.push(`${role} reports ${what ? `${what.toLowerCase()} — ` : ''}water damage${dmg ? ` at the ${dmg.toLowerCase()}` : ''} with no visible active leak — source may be hidden.`)
    } else {
      parts.push(`${role} reports a possible leak but is unsure of the details.`)
    }

    if (severity.safetyFlags.includes(FLAG.WATER_NEAR_ELECTRICAL)) {
      parts.push('Water is near electrical equipment.')
    } else if (a[QID.NEAR_ELECTRICAL] === 'no') {
      parts.push('No water is near electrical equipment.')
    }
    if (severity.safetyFlags.includes(FLAG.CEILING_COLLAPSE_RISK)) {
      parts.push('Ceiling may be at risk of falling.')
    }
  } else if (category === CATEGORY.APPLIANCE) {
    const appliance = (label(state, APPL.WHICH) || 'appliance').toLowerCase()
    const problem = label(state, APPL.PROBLEM) || label(state, APPL.SAFETY)
    parts.push(`${role} reports an issue with the ${appliance}${problem ? `: ${problem.toLowerCase()}` : ''}.`)
    const detail = asString(a[APPL.SYMPTOM_DETAIL])
    if (detail) parts.push(detail)
  } else if (answeredPrimaryLabels(state, category).length > 0) {
    // Every other guided category: read the answers back in the order the
    // module declares them, most-defining first.
    const categoryLabel = (label(state, QID.CATEGORY) || 'maintenance').toLowerCase()
    parts.push(`${role} reports a ${categoryLabel} issue: ${answeredPrimaryLabels(state, category).join(' — ')}.`)
    const detail = asString(a[QID.ISSUE_DETAIL])
    if (detail) parts.push(detail)
  } else {
    const desc = asString(a[QID.FALLBACK_DESC])
    parts.push(`${role} reports a ${category || 'maintenance'} issue: ${desc}`)
  }

  if (severity.emergencyFlag && severity.emergencyType) {
    parts.push(`Flagged as an emergency: ${severity.emergencyType}.`)
  }

  const media = state.answers[QID.MEDIA]
  if (Array.isArray(media) && media.length > 0) parts.push('Photos were provided.')
  else if (media === 'UNSAFE_SKIP') parts.push('Reporter indicated it was unsafe to take a photo.')

  const perm = label(state, QID.PERMISSION)
  if (perm) parts.push(`Permission to enter: ${perm.toLowerCase()}.`)

  return parts.join(' ')
}

function issueTypeOf(state: EngineState): string {
  const a = state.answers
  const category = asString(a[QID.CATEGORY])
  if (category === CATEGORY.PLUMBING) {
    const pt = label(state, QID.PLUMBING_TYPE)
    return pt || 'Plumbing'
  }
  if (category === CATEGORY.APPLIANCE) {
    return label(state, APPL.WHICH) || 'Appliance'
  }
  // Prefer the specific symptom over the category label, so Monday shows
  // "No heat at all" rather than "Heating or cooling".
  return answeredPrimaryLabels(state, category)[0] || label(state, QID.CATEGORY)
}

function description(state: EngineState, severity: Severity): string {
  const fallback = asString(state.answers[QID.FALLBACK_DESC])
  const detail = asString(state.answers[QID.ISSUE_DETAIL])
  const comments = asString(state.answers[QID.COMMENTS])
  const bits = [fallback, detail, comments].filter(Boolean)
  return bits.length ? bits.join('\n\n') : buildSummary(state, severity)
}

/**
 * Build the full structured request from a completed (or in-progress) session.
 * `id` and `createdAt` are left null for the server to stamp.
 */
export function buildRequestPayload(
  wf: WorkflowDefinition,
  state: EngineState,
): MaintenanceRequestPayload {
  const severity = evaluateSeverity(state.answers, wf)
  return {
    id: null,
    createdAt: null,
    status: 'new',
    source: 'guided_intake',

    category: label(state, QID.CATEGORY),
    issueType: issueTypeOf(state),
    priority: severity.priority,
    emergencyFlag: severity.emergencyFlag,
    emergencyType: severity.emergencyType,
    safetyFlags: severity.safetyFlags,
    damageRisk: severity.damageRisk,
    coordinatorReview: severity.coordinatorReview,
    suggestedTrade: severity.suggestedTrade,
    suggestedResponseTime: severity.suggestedResponseTime,

    summary: buildSummary(state, severity),
    description: description(state, severity),

    contact: {
      name: asString(state.answers[QID.NAME]),
      phone: asString(state.answers[QID.PHONE]),
      email: asString(state.answers[QID.EMAIL]),
      preferredContact: label(state, QID.PREF_CONTACT),
    },
    property: {
      address: asString(state.answers[QID.PROPERTY_ADDRESS]),
      unit: asString(state.answers[QID.UNIT]),
      managerName: asString(state.answers[QID.PM_NAME]),
      submitterRole: label(state, QID.SUBMITTER_ROLE),
    },
    permissionToEnter: label(state, QID.PERMISSION),
    accessInstructions: asString(state.answers[QID.ACCESS_INSTRUCTIONS]),
    someoneHome: label(state, QID.SOMEONE_HOME),
    lockbox: asString(state.answers[QID.LOCKBOX]),
    parking: asString(state.answers[QID.PARKING]),
    pets: label(state, QID.PETS),
    petDetails: asString(state.answers[QID.PET_DETAILS]),
    bestTimes: asString(state.answers[QID.BEST_TIMES]),

    workflowId: wf.id,
    workflowVersion: wf.version,
    qaHistory: buildHistory(wf, state),
  }
}
