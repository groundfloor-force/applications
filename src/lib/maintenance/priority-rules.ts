// ─────────────────────────────────────────────────────────────────────────────
// Deterministic severity rules — data-driven.
//
// Priority / emergency / safety are no longer hardcoded here: each answer
// OPTION carries an `action` (in the workflow definition), and this module
// merges the actions of every chosen option — most-severe priority wins, flags
// union, emergency type from the earliest emergency in the flow. That keeps the
// severity logic editable from the admin while staying deterministic (no AI).
//
// The server re-runs this at submit time and never trusts a client priority.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerMap, AnswerValue, Priority, WorkflowDefinition, Question, AnswerOption, DamageRisk } from './types'
import { waterLeakWorkflowV1 } from './workflows/water-leak-v1'
import { QID, CATEGORY } from './ids'

export interface Severity {
  priority: Priority
  emergencyFlag: boolean
  emergencyType: string | null
  safetyFlags: string[]
  damageRisk: DamageRisk | 'unknown'
  suggestedTrade: string
  suggestedResponseTime: string
  coordinatorReview: boolean
}

const RANK: Record<Priority, number> = { P1: 3, P2: 2, P3: 1 }

/** Return the more severe of two priorities. */
export function escalate(a: Priority, b: Priority): Priority {
  return RANK[b] > RANK[a] ? b : a
}

const DAMAGE_RANK: Record<string, number> = { unknown: 0, none: 0, low: 1, moderate: 2, high: 3 }

const RESPONSE_TIME: Record<Priority, string> = {
  P1: 'Immediate — dispatch within 1 hour',
  P2: 'Urgent — within 24 hours',
  P3: 'Standard — within 3–5 business days',
}

function str(v: AnswerValue): string {
  return typeof v === 'string' ? v : ''
}

/** Find the chosen option for a question, searching static and dynamic options. */
function findOption(q: Question, value: string): AnswerOption | undefined {
  const inStatic = q.options?.find((o) => o.value === value)
  if (inStatic) return inStatic
  if (q.dynamicOptions) {
    for (const set of [...Object.values(q.dynamicOptions.map), q.dynamicOptions.default]) {
      const hit = set.find((o) => o.value === value)
      if (hit) return hit
    }
  }
  return undefined
}

/**
 * Evaluate the full severity profile from the answers collected so far, using
 * the option actions defined in `workflow` (defaults to the bundled flow).
 * Safe to call at any point — missing answers simply don't escalate.
 */
export function evaluateSeverity(
  answers: AnswerMap,
  workflow: WorkflowDefinition = waterLeakWorkflowV1,
): Severity {
  let priority: Priority = 'P3'
  let emergencyFlag = false
  let emergencyType: string | null = null
  const safetyFlags = new Set<string>()
  let damageRisk: Severity['damageRisk'] = 'unknown'
  let coordinatorReview = false

  // Iterate in workflow order so the earliest emergency wins the emergency type.
  for (const q of workflow.questions) {
    const value = answers[q.id]
    if (typeof value !== 'string' || !value) continue
    const action = findOption(q, value)?.action
    if (!action) continue

    if (action.setPriority) priority = escalate(priority, action.setPriority)
    if (action.emergency) {
      emergencyFlag = true
      if (action.emergencyType && !emergencyType) emergencyType = action.emergencyType
    }
    action.safetyFlags?.forEach((f) => safetyFlags.add(f))
    if (action.damageRisk && DAMAGE_RANK[action.damageRisk] > DAMAGE_RANK[damageRisk]) {
      damageRisk = action.damageRisk
    }
    if (action.coordinatorReview) coordinatorReview = true
  }

  // Suggested trade — derived from category (kept in code; not answer-editable).
  const category = str(answers[QID.CATEGORY])
  let suggestedTrade = 'General Maintenance'
  if (category === CATEGORY.PLUMBING) suggestedTrade = 'Plumber'
  else if (category === CATEGORY.ELECTRICAL) suggestedTrade = 'Electrician'
  else if (category === CATEGORY.HVAC) suggestedTrade = 'HVAC Technician'
  else if (category === CATEGORY.APPLIANCE) suggestedTrade = 'Appliance Technician'
  if (safetyFlags.has('water_near_electrical')) suggestedTrade = 'Plumber + Electrician'

  return {
    priority,
    emergencyFlag,
    emergencyType,
    safetyFlags: [...safetyFlags],
    damageRisk,
    suggestedTrade,
    suggestedResponseTime: RESPONSE_TIME[priority],
    coordinatorReview,
  }
}
