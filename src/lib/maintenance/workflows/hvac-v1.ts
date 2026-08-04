// ─────────────────────────────────────────────────────────────────────────────
// Heating & cooling triage.
//
//   what is happening → (hazard stop) → what kind of system → how bad is it →
//   whole unit or one area → shared issue detail → photos + contact tail
//
// Fuel hazards (CO alarm, gas smell, burning smell) escalate to P1 and
// short-circuit straight to photos + contact.
//
// TRIAGE PRINCIPLE: no heat is P1 only when the occupant tells us it is unsafely
// cold or that pipes are at risk. The tenant's own answer carries the season, so
// severity stays deterministic and date-free — the engine never needs a clock.
// That matters here: in Moncton, "no heat" in February and "no heat" in June are
// not the same request.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerOption, Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt, TRADE } from './shared'

export const HVACQ = {
  PROBLEM: 'q_hvac_problem',
  HAZARD_STOP: 'q_hvac_hazard_stop',
  SYSTEM: 'q_hvac_system',
  SEVERITY: 'q_hvac_severity',
  SCOPE: 'q_hvac_scope',
} as const

const PROBLEM = {
  CO_ALARM: 'co_alarm',
  GAS_SMELL: 'gas_smell',
  BURNING_SMELL: 'burning_smell',
  NO_HEAT: 'no_heat',
  NOT_ENOUGH_HEAT: 'not_enough_heat',
  NO_COOLING: 'no_cooling',
} as const

// Severity option values are prefixed per problem type. `findOption` in
// priority-rules.ts scans EVERY dynamicOptions map entry and returns the first
// value match, so a value reused across maps with a different action would
// resolve to the wrong one.
const HEAT_SEVERITY: AnswerOption[] = [
  { value: 'heat_unsafe', label: 'Very cold — it is not safe to stay here', action: { setPriority: 'P1', emergency: true, emergencyType: 'No heat', safetyFlags: [FLAG.NO_HEAT_HABITABILITY] } },
  { value: 'heat_pipes', label: 'Cold enough that I am worried the pipes may freeze', action: { setPriority: 'P1', emergency: true, emergencyType: 'No heat', safetyFlags: [FLAG.NO_HEAT_HABITABILITY, FLAG.FROZEN_PIPES], damageRisk: 'high' } },
  { value: 'heat_cold', label: 'Cold, but manageable for now', action: { setPriority: 'P2' } },
  { value: 'heat_mild', label: 'Noticeable, but not urgent', action: { setPriority: 'P3' } },
]

const COOL_SEVERITY: AnswerOption[] = [
  { value: 'cool_vulnerable', label: 'Very hot, and someone here is at risk (infant, elderly, or a medical condition)', action: { setPriority: 'P2', safetyFlags: [FLAG.HEAT_VULNERABLE_OCCUPANT] } },
  { value: 'cool_hot', label: 'Uncomfortably hot', action: { setPriority: 'P3' } },
  { value: 'cool_mild', label: 'Only slightly warm', action: { setPriority: 'P3' } },
]

export const hvacQuestions: Question[] = [
  {
    id: HVACQ.PROBLEM,
    section: 'issue',
    text: 'What is happening with the heating or cooling?',
    inputType: 'single_choice',
    options: [
      { value: PROBLEM.CO_ALARM, label: 'The carbon monoxide alarm is going off', goto: HVACQ.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Carbon monoxide alarm', safetyFlags: [FLAG.CARBON_MONOXIDE] } },
      { value: PROBLEM.GAS_SMELL, label: 'I smell gas or fuel oil', goto: HVACQ.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Gas smell', safetyFlags: [FLAG.GAS_SMELL], suggestedTrade: TRADE.GAS } },
      { value: PROBLEM.BURNING_SMELL, label: 'Burning smell or smoke from the system', goto: HVACQ.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Smoke / burning smell', safetyFlags: [FLAG.HVAC_FIRE_RISK] } },
      { value: PROBLEM.NO_HEAT, label: 'No heat at all', action: { setPriority: 'P2' } },
      { value: PROBLEM.NOT_ENOUGH_HEAT, label: 'Not enough heat, or some rooms are cold', action: { setPriority: 'P3' } },
      { value: PROBLEM.NO_COOLING, label: 'No cooling — the air conditioning is not working', action: { setPriority: 'P3' } },
      { value: 'water_leak', label: 'Water leaking from the furnace, boiler, or air conditioner', action: { setPriority: 'P2', damageRisk: 'moderate' } },
      { value: 'noise', label: 'Strange noise from the system', action: { setPriority: 'P3' } },
      { value: 'thermostat', label: 'The thermostat is not working', action: { setPriority: 'P3' } },
      opt('other', 'Something else'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: HVACQ.PROBLEM, op: 'eq', value: PROBLEM.CO_ALARM }, text: 'Leave the building now and call 911. Carbon monoxide is life-threatening and you cannot smell it. Do not go back inside until the fire department says it is safe. Please do not keep filling out this form.' },
      { level: 'danger', when: { questionId: HVACQ.PROBLEM, op: 'eq', value: PROBLEM.GAS_SMELL }, text: 'Do not turn any switches on or off. Leave the area and call us at 506 204 8440 right away, or 911 if needed. Please do not keep filling out this form.' },
      { level: 'danger', when: { questionId: HVACQ.PROBLEM, op: 'eq', value: PROBLEM.BURNING_SMELL }, text: 'If you see fire or smoke, leave and call 911. Otherwise turn the system off at the thermostat or the breaker, but only if you can do it safely.' },
    ],
    next: [{ goto: HVACQ.SYSTEM }],
  },

  // Hazard stop — skip diagnostics, go straight to photos + contact.
  {
    id: HVACQ.HAZARD_STOP,
    section: 'issue',
    text: 'Is everyone away from the system, and is it switched off (only if that was safe)?',
    helpText: 'For a gas or carbon monoxide emergency, call 911. Then call us at 506 204 8440.',
    inputType: 'single_choice',
    emergencyBanner: true,
    options: [
      opt('yes', 'Yes'),
      opt('no', 'No'),
      opt('couldnt', 'I could not do it safely'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: HVACQ.PROBLEM, op: 'eq', value: PROBLEM.CO_ALARM }, text: 'Carbon monoxide is life-threatening. Everyone should be outside and you should be calling 911.' },
      { level: 'danger', when: { questionId: HVACQ.PROBLEM, op: 'eq', value: PROBLEM.GAS_SMELL }, text: 'Do not operate any switches. Leave the area and call us at 506 204 8440, or 911 if needed.' },
    ],
    next: [{ goto: QID.MEDIA }],
  },

  {
    id: HVACQ.SYSTEM,
    section: 'issue',
    text: 'What kind of system heats or cools the unit?',
    helpText: 'This tells us who to send — a furnace, a heat pump, and electric baseboards are three different technicians.',
    inputType: 'single_choice',
    options: [
      opt('forced_air_furnace', 'Forced-air furnace'),
      opt('electric_baseboard', 'Electric baseboard heaters'),
      opt('heat_pump', 'Heat pump or ductless mini-split'),
      opt('boiler_radiator', 'Boiler with radiators or in-floor heat'),
      opt('window_ac', 'Window air conditioner'),
      opt('central_ac', 'Central air conditioning'),
      opt('wood_pellet', 'Wood or pellet stove'),
      opt('unsure', 'Unsure'),
    ],
    next: [{ goto: HVACQ.SEVERITY }],
  },

  {
    id: HVACQ.SEVERITY,
    section: 'issue',
    text: 'How bad is it right now?',
    inputType: 'single_choice',
    visibleIf: { questionId: HVACQ.PROBLEM, op: 'in', value: [PROBLEM.NO_HEAT, PROBLEM.NOT_ENOUGH_HEAT, PROBLEM.NO_COOLING] },
    dynamicOptions: {
      basedOn: HVACQ.PROBLEM,
      map: {
        [PROBLEM.NO_HEAT]: HEAT_SEVERITY,
        [PROBLEM.NOT_ENOUGH_HEAT]: HEAT_SEVERITY,
        [PROBLEM.NO_COOLING]: COOL_SEVERITY,
      },
      default: [opt('sev_unsure', 'Not sure')],
    },
    safetyMessages: [
      { level: 'danger', when: { questionId: HVACQ.SEVERITY, op: 'in', value: ['heat_unsafe', 'heat_pipes'] }, text: 'If it is not safe to stay, call us now at 506 204 8440. To help prevent frozen pipes, open the cabinet doors under your sinks and leave a tap running at a trickle.' },
    ],
    // Skippable — needs an unconditional rule (a skipped question is routed
    // through without an answer, so option `goto`s never fire).
    next: [{ goto: HVACQ.SCOPE }],
  },

  {
    id: HVACQ.SCOPE,
    section: 'issue',
    text: 'Is it the whole unit or one area?',
    inputType: 'single_choice',
    options: [
      opt('whole_unit', 'The whole unit'),
      opt('some_rooms', 'Some rooms'),
      opt('one_room', 'One room'),
      { value: 'whole_building', label: 'The whole building', action: { setPriority: 'P2' } },
      opt('unsure', 'Unsure'),
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },
]
