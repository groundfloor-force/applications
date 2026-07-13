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
import { QID, CATEGORY, PLUMBING_TYPE, WATER_FLOW } from './ids'

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

/** Deterministic natural-language summary for coordinators. */
export function buildSummary(state: EngineState, severity: Severity): string {
  const a = state.answers
  const role = label(state, QID.SUBMITTER_ROLE) || 'Someone'
  const category = asString(a[QID.CATEGORY])
  const parts: string[] = []

  if (category === CATEGORY.PLUMBING && asString(a[QID.PLUMBING_TYPE]) === PLUMBING_TYPE.LEAK) {
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
    } else if (flow === WATER_FLOW.DAMAGE_ONLY) {
      const dmg = label(state, QID.DAMAGE_LOCATION)
      parts.push(`${role} reports water damage${dmg ? ` at the ${dmg.toLowerCase()}` : ''} with no visible active leak — source may be hidden.`)
    } else {
      parts.push(`${role} reports a possible leak but is unsure of the details.`)
    }

    if (severity.safetyFlags.includes('water_near_electrical')) {
      parts.push('Water is near electrical equipment.')
    } else if (a[QID.NEAR_ELECTRICAL] === 'no') {
      parts.push('No water is near electrical equipment.')
    }
    if (severity.safetyFlags.includes('ceiling_collapse_risk')) {
      parts.push('Ceiling may be at risk of falling.')
    }
  } else {
    const desc = asString(a[QID.FALLBACK_DESC])
    parts.push(`${role} reports a ${category || 'maintenance'} issue: ${desc}`)
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
  if (asString(a[QID.CATEGORY]) === CATEGORY.PLUMBING) {
    const pt = label(state, QID.PLUMBING_TYPE)
    return pt || 'Plumbing'
  }
  return label(state, QID.CATEGORY)
}

function description(state: EngineState, severity: Severity): string {
  const fallback = asString(state.answers[QID.FALLBACK_DESC])
  const comments = asString(state.answers[QID.COMMENTS])
  const bits = [fallback, comments].filter(Boolean)
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
  const severity = evaluateSeverity(state.answers)
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
