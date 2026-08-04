// ─────────────────────────────────────────────────────────────────────────────
// Plumbing other than leaks — clogs, no water / no hot water, low pressure, and
// broken fixtures. Leaks have their own (much deeper) tree in water-leak-v1.ts,
// and "broken fixture → it is leaking" jumps straight into it rather than
// duplicating that logic.
//
// Two Moncton-specific escalations:
//   • suspected frozen pipes → P1 (a burst line is a different job than a slow tap)
//   • a dead sump pump → P2 (that is a flooded basement waiting to happen)
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerOption, Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt, TRADE } from './shared'

export const PLMB = {
  CLOG_WHAT: 'q_clog_what',
  CLOG_STATE: 'q_clog_state',
  CLOG_SOLE_TOILET: 'q_clog_sole_toilet',
  SUPPLY_SCOPE: 'q_supply_scope',
  SUPPLY_CAUSE: 'q_supply_cause',
  PRESSURE_SCOPE: 'q_pressure_scope',
  PRESSURE_WHEN: 'q_pressure_when',
  FIXTURE_WHICH: 'q_fixture_which',
  FIXTURE_STATE: 'q_fixture_state',
} as const

const CLOG_TOILET = 'toilet'

// Shared by "no water" and "low pressure" — the frozen-pipe capture is the
// point of it, and both symptoms can be the same underlying cause in winter.
const SUPPLY_CAUSE_OPTIONS: AnswerOption[] = [
  { value: 'frozen_suspected', label: 'It is very cold out and I think the pipes may be frozen', action: { setPriority: 'P1', emergency: true, emergencyType: 'Possible frozen pipes', safetyFlags: [FLAG.FROZEN_PIPES], damageRisk: 'high', suggestedTrade: TRADE.PLUMBER } },
  { value: 'water_heater_issue', label: 'The water heater is leaking, making noise, or has no pilot light', action: { setPriority: 'P2', safetyFlags: [FLAG.WATER_HEATER], damageRisk: 'moderate' } },
  opt('shut_off_notice', 'The water was shut off, or we received a notice'),
  opt('none', 'None of these'),
  opt('unsure', 'Not sure'),
]

export const plumbingQuestions: Question[] = [
  // ── Clog ───────────────────────────────────────────────────────────────────
  {
    id: PLMB.CLOG_WHAT,
    section: 'issue',
    text: 'What is clogged or backing up?',
    inputType: 'single_choice',
    options: [
      opt(CLOG_TOILET, 'Toilet'),
      opt('kitchen_sink', 'Kitchen sink'),
      opt('bathroom_sink', 'Bathroom sink'),
      opt('tub_shower', 'Bathtub or shower'),
      opt('floor_drain', 'Floor drain'),
      opt('laundry_drain', 'Laundry drain'),
      { value: 'sewage_backup', label: 'Sewage is backing up into the unit', goto: QID.MEDIA, action: { setPriority: 'P1', emergency: true, emergencyType: 'Sewage backup', safetyFlags: [FLAG.SEWAGE_BACKUP], damageRisk: 'high', suggestedTrade: TRADE.PLUMBER } },
      opt('unsure', 'Unsure'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: PLMB.CLOG_WHAT, op: 'eq', value: 'sewage_backup' }, text: 'Stay out of the affected area and do not use any drains. Sewage is a health hazard. Call us at 506 204 8440.' },
    ],
    next: [{ goto: PLMB.CLOG_STATE }],
  },
  {
    id: PLMB.CLOG_STATE,
    section: 'issue',
    text: 'What is it doing right now?',
    inputType: 'single_choice',
    options: [
      { value: 'overflowing', label: 'Overflowing or spilling onto the floor', action: { setPriority: 'P1', emergency: true, emergencyType: 'Overflowing drain', damageRisk: 'high', suggestedTrade: TRADE.PLUMBER } },
      { value: 'fully_blocked', label: 'Completely blocked — water will not go down', action: { setPriority: 'P2' } },
      { value: 'backing_up', label: 'Backing up into another fixture', action: { setPriority: 'P2', safetyFlags: [FLAG.DRAIN_BACKUP] } },
      { value: 'slow', label: 'Draining slowly', action: { setPriority: 'P3' } },
      { value: 'smell', label: 'Just a bad smell', action: { setPriority: 'P3' } },
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: PLMB.CLOG_STATE, op: 'eq', value: 'overflowing' }, text: 'Stop using it. For a toilet, close the shut-off valve on the wall behind it if you can reach it safely.' },
    ],
    next: [{ goto: PLMB.CLOG_SOLE_TOILET }],
  },
  {
    id: PLMB.CLOG_SOLE_TOILET,
    section: 'issue',
    text: 'Is this the only working toilet in the home?',
    inputType: 'single_choice',
    visibleIf: { questionId: PLMB.CLOG_WHAT, op: 'eq', value: CLOG_TOILET },
    options: [
      { value: 'yes', label: 'Yes', action: { setPriority: 'P2', safetyFlags: [FLAG.SOLE_TOILET] } },
      opt('no', 'No'),
      opt('unsure', 'Unsure'),
    ],
    // Skippable — needs an unconditional rule.
    next: [{ goto: QID.ISSUE_DETAIL }],
  },

  // ── No water / no hot water ────────────────────────────────────────────────
  {
    id: PLMB.SUPPLY_SCOPE,
    section: 'issue',
    text: 'Which taps are affected?',
    inputType: 'single_choice',
    options: [
      { value: 'all_taps', label: 'No water anywhere in the unit', action: { setPriority: 'P2' } },
      { value: 'hot_only', label: 'No hot water', action: { setPriority: 'P2' } },
      { value: 'cold_only', label: 'No cold water', action: { setPriority: 'P2' } },
      { value: 'one_fixture', label: 'Just one sink, tub, or toilet', action: { setPriority: 'P3' } },
      { value: 'unsure', label: 'Unsure', action: { setPriority: 'P3' } },
    ],
    next: [{ goto: PLMB.SUPPLY_CAUSE }],
  },
  {
    id: PLMB.SUPPLY_CAUSE,
    section: 'issue',
    text: 'Do any of these apply?',
    inputType: 'single_choice',
    options: SUPPLY_CAUSE_OPTIONS,
    safetyMessages: [
      { level: 'danger', when: { questionId: PLMB.SUPPLY_CAUSE, op: 'eq', value: 'frozen_suspected' }, text: 'Never use a torch or open flame to thaw a pipe. Open the cabinet doors under your sinks, leave a tap open at a trickle, and call us at 506 204 8440.' },
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },

  // ── Low pressure ───────────────────────────────────────────────────────────
  {
    id: PLMB.PRESSURE_SCOPE,
    section: 'issue',
    text: 'Where is the water pressure low?',
    inputType: 'single_choice',
    options: [
      { value: 'all_fixtures', label: 'Everywhere in the unit', action: { setPriority: 'P2' } },
      { value: 'hot_only', label: 'Only the hot water', action: { setPriority: 'P3' } },
      { value: 'one_fixture', label: 'Just one sink, tub, or shower', action: { setPriority: 'P3' } },
      { value: 'unsure', label: 'Unsure', action: { setPriority: 'P3' } },
    ],
    next: [{ goto: PLMB.PRESSURE_WHEN }],
  },
  {
    id: PLMB.PRESSURE_WHEN,
    section: 'issue',
    text: 'When did the pressure change?',
    inputType: 'single_choice',
    options: [
      // A sudden whole-house drop is a break or a freezing line, not scale.
      { value: 'suddenly', label: 'It dropped suddenly', action: { setPriority: 'P2' } },
      { value: 'gradual', label: 'It has been getting worse gradually', action: { setPriority: 'P3' } },
      { value: 'always', label: 'It has always been like this', action: { setPriority: 'P3' } },
      opt('unsure', 'Unsure'),
    ],
    next: [{ goto: PLMB.SUPPLY_CAUSE }],
  },

  // ── Broken fixture ─────────────────────────────────────────────────────────
  {
    id: PLMB.FIXTURE_WHICH,
    section: 'issue',
    text: 'Which fixture is broken?',
    inputType: 'single_choice',
    options: [
      opt('toilet', 'Toilet'),
      opt('kitchen_faucet', 'Kitchen faucet'),
      opt('bathroom_faucet', 'Bathroom faucet'),
      opt('tub_shower_faucet', 'Bathtub or shower faucet'),
      opt('shower_head', 'Shower head'),
      opt('drain_stopper', 'Drain or stopper'),
      opt('garburator', 'Garburator / garbage disposal'),
      opt('outdoor_tap', 'Outdoor tap'),
      { value: 'water_heater', label: 'Water heater', action: { setPriority: 'P2', safetyFlags: [FLAG.WATER_HEATER] } },
      { value: 'sump_pump', label: 'Sump pump', action: { setPriority: 'P2', safetyFlags: [FLAG.SUMP_PUMP], damageRisk: 'moderate' } },
      opt('other', 'Something else'),
    ],
    next: [{ goto: PLMB.FIXTURE_STATE }],
  },
  {
    id: PLMB.FIXTURE_STATE,
    section: 'issue',
    text: 'What is wrong with it?',
    inputType: 'single_choice',
    options: [
      // Hand off to the full leak tree rather than re-asking a worse version of it.
      opt('leaking', 'It is leaking water', QID.WATER_FLOW),
      { value: 'wont_shut_off', label: 'Water will not shut off, or it keeps running', action: { setPriority: 'P2', damageRisk: 'moderate' } },
      { value: 'broken_off', label: 'Broken, loose, or came off', action: { setPriority: 'P2' } },
      { value: 'wont_turn_on', label: 'Will not turn on — no water from it', action: { setPriority: 'P3' } },
      { value: 'cracked', label: 'Cracked or damaged', action: { setPriority: 'P3' } },
      opt('other', 'Something else'),
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },
]
