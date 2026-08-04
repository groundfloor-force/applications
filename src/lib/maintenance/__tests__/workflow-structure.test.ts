// Structural guards for the composed workflow. These are the regression net for
// the module contract documented in workflows/index.ts — array order matters,
// and a module that forgets an explicit terminal route breaks silently by
// falling through into whatever happens to sit next in the array.

import { describe, it, expect } from 'vitest'
import { maintenanceIntakeWorkflow as wf } from '../workflows'
import { validateWorkflow } from '../validate-workflow'
import { SECTION_ORDER } from '../sections'
import { QID } from '../ids'
import { drive } from './helpers'

/**
 * The composed question order. Captured before the workflow was split into
 * modules — this is the proof that the split was behaviour-neutral, and
 * thereafter it guards the composition order in workflows/index.ts.
 */
const EXPECTED_ORDER = [
  // selection
  'q_category', 'q_plumbing_type',
  // water leak
  'q_water_flow', 'q_near_electrical', 'q_leak_source', 'q_containment', 'q_damage_spread',
  'q_fixture', 'q_leak_location', 'q_leak_amount',
  'q_damage_location', 'q_damage_wet', 'q_ceiling_risk', 'q_unsure_desc',
  // catch-all
  'q_issue_detail', 'q_fallback_desc',
  // shared tail (order-dependent linear run)
  'q_media',
  'q_name', 'q_phone', 'q_email', 'q_pref_contact',
  'q_property_address', 'q_unit', 'q_pm_name', 'q_submitter_role',
  'q_someone_home', 'q_permission', 'q_access_instructions', 'q_lockbox', 'q_parking',
  'q_pets', 'q_pet_details', 'q_best_times',
  'q_comments',
  // appliance
  'q_appl_which', 'q_appl_safety', 'q_appl_gas_stop', 'q_appl_hazard_stop', 'q_appl_water_elec',
  'q_appl_fuel', 'q_appl_problem',
  'q_appl_leak_where', 'q_appl_leak_active', 'q_appl_leak_shutoff',
  'q_appl_noise_type', 'q_appl_noise_when',
  'q_appl_symptom_detail',
  'q_appl_brand_model', 'q_appl_age', 'q_appl_started', 'q_appl_usability',
  // hvac
  'q_hvac_problem', 'q_hvac_hazard_stop', 'q_hvac_system', 'q_hvac_severity', 'q_hvac_scope',
  // electrical
  'q_elec_problem', 'q_elec_hazard_stop', 'q_elec_power_scope', 'q_elec_heat_affected', 'q_elec_breaker',
  // plumbing (non-leak)
  'q_clog_what', 'q_clog_state', 'q_clog_sole_toilet',
  'q_supply_scope', 'q_supply_cause',
  'q_pressure_scope', 'q_pressure_when',
  'q_fixture_which', 'q_fixture_state',
  // doors & locks
  'q_door_which', 'q_door_problem', 'q_door_secure',
  // walls & ceilings
  'q_wall_what', 'q_wall_exterior', 'q_wall_safety',
  // handyman
  'q_hand_what', 'q_hand_urgency', 'q_hand_materials',
  // pests
  'q_pest_what', 'q_pest_where', 'q_pest_extent',
]

describe('composed workflow structure', () => {
  it('passes validateWorkflow', () => {
    expect(validateWorkflow(wf)).toEqual([])
  })

  it('composes questions in the expected order', () => {
    expect(wf.questions.map((q) => q.id)).toEqual(EXPECTED_ORDER)
  })

  it('has no duplicate question ids', () => {
    const ids = wf.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('assigns every question a known section', () => {
    for (const q of wf.questions) {
      expect(SECTION_ORDER, `${q.id} has section "${q.section}"`).toContain(q.section)
    }
  })

  it('gives every conditionally-visible question an unconditional next rule', () => {
    // A skipped question is routed through without an answer, so its option
    // `goto`s never fire — it needs a rule that matches regardless.
    for (const q of wf.questions) {
      if (!q.visibleIf) continue
      const idx = wf.questions.indexOf(q)
      const hasDefaultRule = q.next?.some((r) => !r.when) ?? false
      const hasArrayNeighbour = idx < wf.questions.length - 1
      expect(hasDefaultRule || hasArrayNeighbour, `${q.id} can be skipped into a dead end`).toBe(true)
    }
  })

  it('drives every category option through to completion', () => {
    const categoryQ = wf.questions.find((q) => q.id === QID.CATEGORY)!
    for (const o of categoryQ.options ?? []) {
      const state = drive(wf, { [QID.CATEGORY]: o.value })
      expect(state.completed, `category "${o.value}" did not reach END`).toBe(true)
    }
  })

  it('drives every plumbing type through to completion', () => {
    const plumbingQ = wf.questions.find((q) => q.id === QID.PLUMBING_TYPE)!
    for (const o of plumbingQ.options ?? []) {
      const state = drive(wf, { [QID.CATEGORY]: 'plumbing', [QID.PLUMBING_TYPE]: o.value })
      expect(state.completed, `plumbing type "${o.value}" did not reach END`).toBe(true)
    }
  })

  it('asks whether someone is at the property on every path', () => {
    expect(wf.questions.find((q) => q.id === QID.SOMEONE_HOME)?.visibleIf).toBeUndefined()
    const state = drive(wf, { [QID.CATEGORY]: 'other' })
    expect(state.path).toContain(QID.SOMEONE_HOME)
  })
})
