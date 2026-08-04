// ─────────────────────────────────────────────────────────────────────────────
// Electrical triage.
//
//   what is the problem → (hazard stop) → scope / breaker follow-ups →
//   shared issue detail → photos + contact tail
//
// Fire, sparks, shock and water-on-electrical escalate to P1 and short-circuit
// to photos + contact. A total power loss asks whether the heat went with it —
// in a Moncton winter that turns a P2 outage into a habitability emergency.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt, TRADE } from './shared'

export const ELEC = {
  PROBLEM: 'q_elec_problem',
  HAZARD_STOP: 'q_elec_hazard_stop',
  POWER_SCOPE: 'q_elec_power_scope',
  HEAT_AFFECTED: 'q_elec_heat_affected',
  BREAKER: 'q_elec_breaker',
} as const

const PROBLEM = {
  SMOKE_BURNING: 'smoke_burning',
  SPARKS: 'sparks',
  SHOCK: 'shock',
  WATER_ON_ELECTRICAL: 'water_on_electrical',
  NO_POWER_WHOLE: 'no_power_whole',
  NO_POWER_PARTIAL: 'no_power_partial',
  BREAKER_TRIPS: 'breaker_trips',
} as const

export const electricalQuestions: Question[] = [
  {
    id: ELEC.PROBLEM,
    section: 'issue',
    text: 'What is the electrical problem?',
    inputType: 'single_choice',
    options: [
      { value: PROBLEM.SMOKE_BURNING, label: 'Burning smell, smoke, or scorch marks', goto: ELEC.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Electrical fire risk', safetyFlags: [FLAG.ELECTRICAL_FIRE_RISK], suggestedTrade: TRADE.ELECTRICIAN } },
      { value: PROBLEM.SPARKS, label: 'Sparking outlet, switch, or panel', goto: ELEC.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Electrical sparks', safetyFlags: [FLAG.ELECTRICAL_SPARKS], suggestedTrade: TRADE.ELECTRICIAN } },
      { value: PROBLEM.SHOCK, label: 'Someone got a shock from an outlet, switch, or appliance', goto: ELEC.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Electric shock', safetyFlags: [FLAG.ELECTRIC_SHOCK], suggestedTrade: TRADE.ELECTRICIAN } },
      // Deliberately sets NO suggestedTrade: `tradeFromAction` is applied after
      // the water_near_electrical override in priority-rules.ts, so naming a
      // trade here would suppress "Plumber + Electrician".
      { value: PROBLEM.WATER_ON_ELECTRICAL, label: 'Water is getting into an outlet, light, or the electrical panel', goto: ELEC.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Water near electrical', safetyFlags: [FLAG.WATER_NEAR_ELECTRICAL], damageRisk: 'moderate' } },
      { value: 'exposed_wiring', label: 'Exposed, damaged, or hanging wiring', goto: ELEC.HAZARD_STOP, action: { setPriority: 'P2', safetyFlags: [FLAG.EXPOSED_WIRING], suggestedTrade: TRADE.ELECTRICIAN } },
      { value: PROBLEM.NO_POWER_WHOLE, label: 'No power in the whole unit', goto: ELEC.POWER_SCOPE, action: { setPriority: 'P2' } },
      { value: PROBLEM.BREAKER_TRIPS, label: 'A breaker keeps tripping', goto: ELEC.BREAKER, action: { setPriority: 'P2', safetyFlags: [FLAG.BREAKER_TRIPS] } },
      { value: PROBLEM.NO_POWER_PARTIAL, label: 'No power in some outlets or rooms', goto: ELEC.BREAKER, action: { setPriority: 'P3' } },
      { value: 'smoke_alarm', label: 'Smoke or carbon monoxide alarm chirping, or not working', action: { setPriority: 'P2', safetyFlags: [FLAG.ALARM_INOPERATIVE] } },
      { value: 'lights', label: 'Lights flickering, dimming, or not working', action: { setPriority: 'P3' } },
      { value: 'outlet_switch', label: 'An outlet or switch is not working', action: { setPriority: 'P3' } },
      { value: 'fixture_damage', label: 'A light fixture is broken or hanging loose', action: { setPriority: 'P3' } },
      opt('other', 'Something else'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: ELEC.PROBLEM, op: 'in', value: [PROBLEM.SMOKE_BURNING, PROBLEM.SPARKS] }, text: 'If you see fire or smoke, leave and call 911. Otherwise turn that circuit off at the breaker panel, but only if you can reach it safely. Do not use the outlet or switch again.' },
      { level: 'danger', when: { questionId: ELEC.PROBLEM, op: 'eq', value: PROBLEM.SHOCK }, text: 'Do not use that outlet, switch, or appliance again. If anyone is injured, call 911.' },
      { level: 'danger', when: { questionId: ELEC.PROBLEM, op: 'eq', value: PROBLEM.WATER_ON_ELECTRICAL }, text: 'Do not touch anything electrical near water, and do not stand in water near electricity. Leave the area if you believe there is a danger.' },
      { level: 'warning', when: { questionId: ELEC.PROBLEM, op: 'eq', value: 'smoke_alarm' }, text: 'A working smoke alarm is required by law. A chirping alarm usually needs a new battery — tell us below if you cannot safely reach it.' },
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },

  {
    id: ELEC.HAZARD_STOP,
    section: 'issue',
    text: 'Have you turned that circuit off at the breaker panel (only if it was safe)?',
    inputType: 'single_choice',
    emergencyBanner: true,
    options: [
      opt('yes', 'Yes'),
      opt('no', 'No'),
      opt('couldnt', 'I could not do it safely'),
      opt('cant_find', 'I cannot find or reach the panel'),
    ],
    next: [{ goto: QID.MEDIA }],
  },

  {
    id: ELEC.POWER_SCOPE,
    section: 'issue',
    text: 'Is anyone else affected?',
    inputType: 'single_choice',
    options: [
      { value: 'just_my_unit', label: 'Just my unit', action: { setPriority: 'P2' } },
      { value: 'whole_building', label: 'The whole building', action: { setPriority: 'P2', safetyFlags: [FLAG.AREA_POWER_OUTAGE] } },
      { value: 'street_area', label: 'The whole street or area seems to be out', action: { setPriority: 'P3', safetyFlags: [FLAG.AREA_POWER_OUTAGE] } },
      opt('unsure', 'Unsure'),
    ],
    safetyMessages: [
      { level: 'warning', when: { questionId: ELEC.POWER_SCOPE, op: 'eq', value: 'street_area' }, text: 'If the whole area is out it is most likely an NB Power outage rather than something in the building. You can check nbpower.com/outages. Still tell us below if the unit is getting cold.' },
    ],
    next: [{ goto: ELEC.HEAT_AFFECTED }],
  },

  {
    id: ELEC.HEAT_AFFECTED,
    section: 'issue',
    text: 'Is your heat affected by the power loss?',
    inputType: 'single_choice',
    visibleIf: { questionId: ELEC.PROBLEM, op: 'eq', value: PROBLEM.NO_POWER_WHOLE },
    options: [
      { value: 'yes_cold', label: 'Yes, and the unit is getting cold', action: { setPriority: 'P1', emergency: true, emergencyType: 'No heat', safetyFlags: [FLAG.NO_HEAT_HABITABILITY] } },
      { value: 'yes_ok', label: 'Yes, but it is still comfortable', action: { setPriority: 'P2' } },
      opt('no', 'No'),
      { value: 'unsure', label: 'Unsure', action: { setPriority: 'P2' } },
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: ELEC.HEAT_AFFECTED, op: 'eq', value: 'yes_cold' }, text: 'Call us at 506 204 8440 so we can arrange heat. To help prevent frozen pipes, open the cabinet doors under your sinks and leave a tap running at a trickle.' },
    ],
    // Skippable — needs an unconditional rule.
    next: [{ goto: QID.ISSUE_DETAIL }],
  },

  {
    id: ELEC.BREAKER,
    section: 'issue',
    text: 'Have you checked the breaker panel?',
    inputType: 'single_choice',
    options: [
      { value: 'reset_held', label: 'I reset it and it stayed on', action: { setPriority: 'P3' } },
      { value: 'reset_tripped_again', label: 'I reset it and it tripped again', action: { setPriority: 'P2', safetyFlags: [FLAG.BREAKER_TRIPS] } },
      opt('not_tried', 'I have not tried'),
      opt('cant_find', 'I cannot find or reach the panel'),
      { value: 'no_access', label: 'The panel is in a locked or common area', action: { coordinatorReview: true } },
    ],
    safetyMessages: [
      { level: 'warning', when: { questionId: ELEC.BREAKER, op: 'eq', value: 'reset_tripped_again' }, text: 'Please do not keep resetting a breaker that trips again — it is tripping to protect the circuit, and repeated resets can be unsafe.' },
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },
]
