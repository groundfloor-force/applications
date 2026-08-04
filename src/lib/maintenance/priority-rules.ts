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
import { maintenanceIntakeWorkflow } from './workflows'
import { TRADE } from './workflows/shared'
import { QID, CATEGORY, FLAG } from './ids'

/** The trade to send when no answer option has named a more specific one. */
const BASE_TRADE: Record<string, string> = {
  [CATEGORY.PLUMBING]: TRADE.PLUMBER,
  [CATEGORY.ELECTRICAL]: TRADE.ELECTRICIAN,
  [CATEGORY.HVAC]: TRADE.HVAC,
  [CATEGORY.APPLIANCE]: TRADE.APPLIANCE_TITLE,
  [CATEGORY.DOOR_LOCK]: TRADE.LOCKSMITH_OR_CARPENTER,
  [CATEGORY.WALLS_CEILINGS]: TRADE.DRYWALL,
  [CATEGORY.PESTS]: TRADE.PEST,
  [CATEGORY.HANDYMAN]: TRADE.GENERAL,
  [CATEGORY.OTHER]: TRADE.GENERAL,
}

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
  workflow: WorkflowDefinition = maintenanceIntakeWorkflow,
): Severity {
  let priority: Priority = 'P3'
  let emergencyFlag = false
  let emergencyType: string | null = null
  const safetyFlags = new Set<string>()
  let damageRisk: Severity['damageRisk'] = 'unknown'
  let coordinatorReview = false
  let tradeFromAction: string | undefined

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
    if (action.suggestedTrade) tradeFromAction = action.suggestedTrade // last set wins
  }

  // Suggested trade — an explicit option action wins; else derived from category.
  // Order matters: `tradeFromAction` is applied LAST, so an option that names a
  // trade suppresses the water_near_electrical override. Options that want
  // "Plumber + Electrician" must deliberately set no `suggestedTrade`.
  const category = str(answers[QID.CATEGORY])
  let suggestedTrade = BASE_TRADE[category] ?? TRADE.GENERAL
  if (safetyFlags.has(FLAG.WATER_NEAR_ELECTRICAL)) suggestedTrade = 'Plumber + Electrician'
  if (tradeFromAction) suggestedTrade = tradeFromAction

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
