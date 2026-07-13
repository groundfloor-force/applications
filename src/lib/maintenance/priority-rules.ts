// ─────────────────────────────────────────────────────────────────────────────
// Deterministic severity rules — the single source of truth for priority.
//
// This module (and ONLY this module) decides priority, emergency status, safety
// flags, damage risk, and the suggested trade/response time. It is a pure
// function of the collected answers, so the client can call it for live UI
// (the emergency banner) while the server re-runs it authoritatively at submit
// time — never trusting a client-supplied priority.
//
// No AI, no side effects, no randomness.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerMap, AnswerValue, Priority } from './types'
import {
  QID,
  WATER_FLOW,
  LEAK_AMOUNT,
  YNU,
  CEILING_RISK,
  UNSURE_DESC,
  CATEGORY,
} from './ids'

export interface Severity {
  priority: Priority
  emergencyFlag: boolean
  emergencyType: string | null
  safetyFlags: string[]
  damageRisk: 'none' | 'low' | 'moderate' | 'high' | 'unknown'
  suggestedTrade: string
  suggestedResponseTime: string
  coordinatorReview: boolean
}

const RANK: Record<Priority, number> = { P1: 3, P2: 2, P3: 1 }

/** Return the more severe of two priorities. */
export function escalate(a: Priority, b: Priority): Priority {
  return RANK[b] > RANK[a] ? b : a
}

function str(v: AnswerValue): string {
  return typeof v === 'string' ? v : ''
}

const RESPONSE_TIME: Record<Priority, string> = {
  P1: 'Immediate — dispatch within 1 hour',
  P2: 'Urgent — within 24 hours',
  P3: 'Standard — within 3–5 business days',
}

/**
 * Evaluate the full severity profile from the answers collected so far.
 * Safe to call at any point in the flow (missing answers simply don't escalate).
 */
export function evaluateSeverity(answers: AnswerMap): Severity {
  let priority: Priority = 'P3'
  let emergencyFlag = false
  let emergencyType: string | null = null
  const safetyFlags = new Set<string>()
  let damageRisk: Severity['damageRisk'] = 'unknown'
  let coordinatorReview = false

  const category = str(answers[QID.CATEGORY])
  const flow = str(answers[QID.WATER_FLOW])

  // ── Water status drives the base priority ──────────────────────────────────
  switch (flow) {
    case WATER_FLOW.UNCONTROLLED:
      priority = escalate(priority, 'P1')
      emergencyFlag = true
      emergencyType = 'Uncontrolled Water'
      damageRisk = 'high'
      break
    case WATER_FLOW.CONTAINED:
      priority = escalate(priority, 'P2')
      damageRisk = 'moderate'
      break
    case WATER_FLOW.WHEN_USED:
      priority = escalate(priority, 'P3')
      damageRisk = 'low'
      break
    case WATER_FLOW.DAMAGE_ONLY:
      // Source may be hidden → treat as urgent.
      priority = escalate(priority, 'P2')
      damageRisk = 'high'
      break
    case WATER_FLOW.UNSURE:
      priority = escalate(priority, 'P2')
      break
  }

  // ── Branch-specific escalations ────────────────────────────────────────────

  // Large leak, even if only when used, becomes urgent.
  if (flow === WATER_FLOW.WHEN_USED && str(answers[QID.LEAK_AMOUNT]) === LEAK_AMOUNT.LARGE) {
    priority = escalate(priority, 'P2')
    damageRisk = 'moderate'
  }

  // Contained leak that is spreading damage.
  if (flow === WATER_FLOW.CONTAINED && str(answers[QID.DAMAGE_SPREAD]) === YNU.YES) {
    damageRisk = 'high'
  }

  // Water near electrical equipment is a life-safety emergency.
  const nearElec = str(answers[QID.NEAR_ELECTRICAL])
  if (nearElec === YNU.YES) {
    priority = escalate(priority, 'P1')
    emergencyFlag = true
    if (!emergencyType) emergencyType = 'Electrical Hazard'
    safetyFlags.add('water_near_electrical')
  } else if (nearElec === YNU.UNSURE) {
    priority = escalate(priority, 'P2')
    safetyFlags.add('possible_electrical_hazard')
  }

  // Sagging / at-risk ceiling.
  const ceiling = str(answers[QID.CEILING_RISK])
  if (ceiling === CEILING_RISK.YES || ceiling === CEILING_RISK.UNSURE) {
    priority = escalate(priority, 'P2')
    damageRisk = 'high'
    safetyFlags.add('ceiling_collapse_risk')
  }

  // Unsure branch — "cannot safely inspect" routes to a coordinator.
  const unsure = str(answers[QID.UNSURE_DESC])
  if (unsure === UNSURE_DESC.CANNOT_INSPECT) {
    priority = escalate(priority, 'P2')
    coordinatorReview = true
    safetyFlags.add('cannot_safely_inspect')
  } else if (unsure === UNSURE_DESC.FLOWING) {
    // Continuously flowing but unquantified → keep at least urgent.
    priority = escalate(priority, 'P2')
    damageRisk = 'high'
  }

  // ── Trade suggestion ───────────────────────────────────────────────────────
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
