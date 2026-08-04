// ─────────────────────────────────────────────────────────────────────────────
// The routing hub: what type of issue is this, and (for plumbing) what kind.
//
// Routing is authored as per-option `goto`s rather than self-referential `when`
// rules so the admin editor's `normalizeWorkflow` is a no-op on it and the
// per-option "goes to" dropdowns read correctly. Each question keeps an
// unconditional default rule pointing at the free-text fallback, so an option
// added in the admin without routing lands somewhere sensible.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID, CATEGORY, PLUMBING_TYPE } from '../ids'
import { opt } from './shared'
import { APPL } from './appliance-v1'
import { HVACQ } from './hvac-v1'
import { ELEC } from './electrical-v1'
import { PLMB } from './plumbing-v1'
import { DOOR } from './door-lock-v1'
import { WALL } from './walls-ceilings-v1'
import { HAND } from './handyman-v1'
import { PEST } from './pest-v1'

export const selectionQuestions: Question[] = [
  {
    id: QID.CATEGORY,
    section: 'issue',
    text: 'What type of issue are you reporting?',
    inputType: 'single_choice',
    options: [
      opt(CATEGORY.PLUMBING, 'Plumbing', QID.PLUMBING_TYPE),
      opt(CATEGORY.ELECTRICAL, 'Electrical', ELEC.PROBLEM),
      opt(CATEGORY.APPLIANCE, 'Appliance', APPL.WHICH),
      opt(CATEGORY.HVAC, 'Heating or cooling', HVACQ.PROBLEM),
      opt(CATEGORY.DOOR_LOCK, 'Door or lock', DOOR.WHICH),
      opt(CATEGORY.WALLS_CEILINGS, 'Walls or ceilings', WALL.WHAT),
      opt(CATEGORY.PESTS, 'Pests or insects', PEST.WHAT),
      opt(CATEGORY.HANDYMAN, 'General handyman', HAND.WHAT),
      opt(CATEGORY.OTHER, 'Other', QID.FALLBACK_DESC),
    ],
    next: [{ goto: QID.FALLBACK_DESC }],
  },
  {
    id: QID.PLUMBING_TYPE,
    section: 'issue',
    text: 'What type of plumbing problem are you reporting?',
    inputType: 'single_choice',
    options: [
      opt(PLUMBING_TYPE.LEAK, 'Leak', QID.WATER_FLOW),
      opt(PLUMBING_TYPE.CLOG, 'Clog or slow drain', PLMB.CLOG_WHAT),
      opt(PLUMBING_TYPE.NO_WATER, 'No water', PLMB.SUPPLY_SCOPE),
      opt(PLUMBING_TYPE.NO_HOT_WATER, 'No hot water', PLMB.SUPPLY_SCOPE),
      opt(PLUMBING_TYPE.LOW_PRESSURE, 'Low water pressure', PLMB.PRESSURE_SCOPE),
      opt(PLUMBING_TYPE.BROKEN_FIXTURE, 'Broken fixture', PLMB.FIXTURE_WHICH),
      opt(PLUMBING_TYPE.OTHER, 'Other', QID.ISSUE_DETAIL),
    ],
    next: [{ goto: QID.FALLBACK_DESC }],
  },
]
