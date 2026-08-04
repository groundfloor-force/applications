// ─────────────────────────────────────────────────────────────────────────────
// Composition root for the maintenance intake workflow.
//
// MODULE CONTRACT — read before adding a module.
//
// The engine falls through to the NEXT QUESTION IN ARRAY ORDER when a question
// has no matching option `goto` and no matching `next` rule. `tailQuestions`
// depends on that (it is a linear run of contact/property/access questions with
// no explicit routing). So:
//
//   1. Array-order fallthrough is legal only WITHIN a module.
//   2. Every question in a module appended AFTER `tailQuestions` must have an
//      explicit terminal route — a `next` rule or a `goto` on every option.
//      The last question of a category module should route to
//      `QID.ISSUE_DETAIL` (which itself goes to `QID.MEDIA`).
//   3. A question with `visibleIf` is routed through without an answer when it
//      is skipped, so its option `goto`s never fire. It MUST have an
//      unconditional `next` rule.
//
// `__tests__/workflow-structure.test.ts` enforces all three.
// ─────────────────────────────────────────────────────────────────────────────

import type { WorkflowDefinition } from '../types'
import { QID, CATEGORY } from '../ids'
import { selectionQuestions } from './selection'
import { waterLeakQuestions } from './water-leak-v1'
import { catchAllQuestions, tailQuestions } from './shared-tail'
import { applianceQuestions, APPL } from './appliance-v1'
import { hvacQuestions, HVACQ } from './hvac-v1'
import { electricalQuestions, ELEC } from './electrical-v1'
import { plumbingQuestions, PLMB } from './plumbing-v1'
import { doorLockQuestions, DOOR } from './door-lock-v1'
import { wallsCeilingsQuestions, WALL } from './walls-ceilings-v1'
import { handymanQuestions, HAND } from './handyman-v1'
import { pestQuestions, PEST } from './pest-v1'

export const maintenanceIntakeWorkflow: WorkflowDefinition = {
  id: 'maintenance_intake',
  version: '2.0.0',
  title: 'Maintenance Request',
  entry: QID.CATEGORY,
  questions: [
    ...selectionQuestions,
    ...waterLeakQuestions,
    ...catchAllQuestions,
    ...tailQuestions, // ← order-dependent linear run; everything below routes explicitly
    ...applianceQuestions,
    ...hvacQuestions,
    ...electricalQuestions,
    ...plumbingQuestions,
    ...doorLockQuestions,
    ...wallsCeilingsQuestions,
    ...handymanQuestions,
    ...pestQuestions,
  ],
}

/**
 * The questions that carry the substance of each category, most-defining first.
 * Used by `request.ts` to write the Monday summary and to pick an issue type
 * more specific than the category label ("No heat at all", not "Heating or
 * cooling"). Lives here so the mapping sits with the data it describes.
 *
 * Plumbing and appliance keep their own bespoke prose in `buildSummary`, so
 * they only appear here for the branches that prose does not cover.
 */
export const CATEGORY_PRIMARY_QUESTIONS: Record<string, string[]> = {
  [CATEGORY.HVAC]: [HVACQ.PROBLEM, HVACQ.SEVERITY, HVACQ.SCOPE, HVACQ.SYSTEM],
  [CATEGORY.ELECTRICAL]: [ELEC.PROBLEM, ELEC.POWER_SCOPE, ELEC.HEAT_AFFECTED, ELEC.BREAKER],
  [CATEGORY.PLUMBING]: [
    PLMB.CLOG_WHAT, PLMB.CLOG_STATE, PLMB.CLOG_SOLE_TOILET,
    PLMB.SUPPLY_SCOPE, PLMB.PRESSURE_SCOPE, PLMB.PRESSURE_WHEN, PLMB.SUPPLY_CAUSE,
    PLMB.FIXTURE_WHICH, PLMB.FIXTURE_STATE,
  ],
  [CATEGORY.DOOR_LOCK]: [DOOR.WHICH, DOOR.PROBLEM, DOOR.SECURE],
  [CATEGORY.WALLS_CEILINGS]: [WALL.WHAT, WALL.EXTERIOR, WALL.SAFETY],
  [CATEGORY.PESTS]: [PEST.WHAT, PEST.WHERE, PEST.EXTENT],
  [CATEGORY.HANDYMAN]: [HAND.WHAT, HAND.URGENCY, HAND.MATERIALS],
  [CATEGORY.APPLIANCE]: [APPL.WHICH, APPL.PROBLEM, APPL.SAFETY],
}
