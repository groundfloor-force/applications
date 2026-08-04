// ─────────────────────────────────────────────────────────────────────────────
// Water leak — the deepest branch of the intake. Reached from
// `q_plumbing_type = leak`, and jumped into directly from other modules
// (broken fixture → `q_water_flow`, wall/ceiling water damage →
// `q_damage_location`).
//
// Five branches off "is water actively flowing right now":
//   uncontrolled → near-electrical → source → photos      (P1 emergency)
//   contained    → source → containment → damage spread   (P2)
//   when used    → fixture → location → amount            (P3, escalates)
//   damage only  → location → wet? → ceiling risk         (P2)
//   unsure       → closest description                    (P2)
//
// This file is DATA. All branching lives in `next` rules and option `goto`s;
// all severity lives in per-option `action`s. See MAINTENANCE.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerOption, Question } from '../types'
import { QID, WATER_FLOW, LEAK_AMOUNT, CEILING_RISK, UNSURE_DESC, YNU } from '../ids'
import { opt, YES_NO_UNSURE } from './shared'

// Shared leak-location list used for "where is the water coming from".
const SOURCE_OPTIONS: AnswerOption[] = [
  opt('kitchen_sink', 'Kitchen sink'),
  opt('bathroom_sink', 'Bathroom sink'),
  opt('toilet', 'Toilet'),
  opt('bathtub_shower', 'Bathtub or shower'),
  opt('dishwasher', 'Dishwasher'),
  opt('washing_machine', 'Washing machine'),
  opt('water_heater', 'Water heater'),
  opt('visible_pipe', 'Visible pipe'),
  opt('ceiling', 'Ceiling'),
  opt('wall', 'Wall'),
  opt('floor', 'Floor'),
  opt('unsure', 'Unsure'),
]

const FIXTURE_OPTIONS: AnswerOption[] = [
  opt('kitchen_sink', 'Kitchen sink'),
  opt('bathroom_sink', 'Bathroom sink'),
  opt('toilet', 'Toilet'),
  opt('bathtub_shower', 'Bathtub or shower'),
  opt('dishwasher', 'Dishwasher'),
  opt('washing_machine', 'Washing machine'),
  opt('water_heater', 'Water heater'),
  opt('other', 'Other'),
  opt('unsure', 'Unsure'),
]

// Leak-location answers depend on the fixture selected in q_fixture.
const SINK_LOCATION = [
  opt('around_faucet', 'Around the faucet'),
  opt('under_sink', 'Under the sink'),
  opt('around_drain', 'Around the drain'),
  opt('from_pipe', 'From a visible pipe'),
  opt('on_floor', 'On the floor'),
  opt('unsure', 'Unsure'),
]
const TOILET_LOCATION = [
  opt('around_base', 'Around the base'),
  opt('from_tank', 'From the tank'),
  opt('tank_bowl', 'Between the tank and bowl'),
  opt('supply_line', 'From the supply line'),
  opt('bowl_continuous', 'Inside the bowl continuously'),
  opt('on_floor', 'On the floor'),
  opt('unsure', 'Unsure'),
]
const TUB_LOCATION = [
  opt('from_faucet', 'From the faucet'),
  opt('from_shower_head', 'From the shower head'),
  opt('around_drain', 'Around the drain'),
  opt('through_wall', 'Through the wall'),
  opt('floor_outside', 'On the floor outside the tub or shower'),
  opt('room_below', 'Into the room below'),
  opt('unsure', 'Unsure'),
]
const APPLIANCE_LOCATION = [
  opt('supply_line', 'From the supply line'),
  opt('drain_hose', 'From the drain hose'),
  opt('underneath', 'From underneath the appliance'),
  opt('from_door', 'From the door'),
  opt('unsure', 'Unsure'),
]
const GENERIC_LOCATION = [
  opt('from_pipe', 'From a visible pipe'),
  opt('on_floor', 'On the floor'),
  opt('underneath', 'From underneath'),
  opt('unsure', 'Unsure'),
]

export const waterLeakQuestions: Question[] = [
  // ── Active water leak — root ───────────────────────────────────────────────
  {
    id: QID.WATER_FLOW,
    section: 'issue',
    text: 'Is water actively flowing right now?',
    inputType: 'single_choice',
    options: [
      { value: WATER_FLOW.UNCONTROLLED, label: 'Yes, and I cannot stop it', goto: QID.NEAR_ELECTRICAL, action: { setPriority: 'P1', emergency: true, emergencyType: 'Uncontrolled Water', damageRisk: 'high' } },
      { value: WATER_FLOW.CONTAINED, label: 'Yes, but I have contained it', goto: QID.LEAK_SOURCE, action: { setPriority: 'P2', damageRisk: 'moderate' } },
      { value: WATER_FLOW.WHEN_USED, label: 'No, it only leaks when the fixture is used', goto: QID.FIXTURE, action: { setPriority: 'P3', damageRisk: 'low' } },
      { value: WATER_FLOW.DAMAGE_ONLY, label: 'No, I only see water damage', goto: QID.DAMAGE_LOCATION, action: { setPriority: 'P2', damageRisk: 'high' } },
      { value: WATER_FLOW.UNSURE, label: 'I am not sure', goto: QID.UNSURE_DESC, action: { setPriority: 'P2' } },
    ],
  },

  // ── Branch 1 — uncontrolled water (P1 emergency) ───────────────────────────
  {
    id: QID.NEAR_ELECTRICAL,
    section: 'issue',
    text: 'Is water near electrical outlets, electrical panels, lights, or appliances?',
    inputType: 'single_choice',
    emergencyBanner: true,
    options: [
      { value: YNU.YES, label: 'Yes', action: { setPriority: 'P1', emergency: true, emergencyType: 'Electrical Hazard', safetyFlags: ['water_near_electrical'] } },
      { value: YNU.NO, label: 'No' },
      { value: YNU.UNSURE, label: 'Unsure', action: { setPriority: 'P2', safetyFlags: ['possible_electrical_hazard'] } },
    ],
    safetyMessages: [
      {
        level: 'danger',
        text:
          'Water that cannot be stopped may cause serious property damage. If it is safe to do so, ' +
          'turn off the nearest water shut-off valve. Do not enter an unsafe area or touch electrical ' +
          'equipment near water.',
      },
      {
        level: 'danger',
        when: { questionId: QID.NEAR_ELECTRICAL, op: 'in', value: [YNU.YES, YNU.UNSURE] },
        text:
          'Do not touch electrical equipment or stand in water near electricity. Leave the immediate ' +
          'area if you believe there is an electrical danger.',
      },
    ],
    // → q_leak_source (array order)
  },
  {
    id: QID.LEAK_SOURCE,
    section: 'issue',
    text: 'Where is the water coming from?',
    inputType: 'single_choice',
    options: SOURCE_OPTIONS,
    next: [
      // Uncontrolled: collect media + shared info and submit — no diagnostics.
      { when: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.UNCONTROLLED }, goto: QID.MEDIA },
      // Contained: continue with containment diagnostics.
      { goto: QID.CONTAINMENT },
    ],
  },

  // ── Branch 2 — contained water (P2 urgent) ─────────────────────────────────
  {
    id: QID.CONTAINMENT,
    section: 'issue',
    text: 'How have you contained the water?',
    inputType: 'single_choice',
    options: [
      opt('shutoff_valve', 'Turned off a shut-off valve'),
      opt('main_supply', 'Turned off the main water supply'),
      opt('stopped_using', 'Stopped using the fixture'),
      opt('towels_bucket', 'Used towels, a bucket, or another container'),
      opt('stopped_on_own', 'The water stopped on its own'),
      opt('other', 'Other'),
    ],
    // → q_damage_spread (array order)
  },
  {
    id: QID.DAMAGE_SPREAD,
    section: 'issue',
    text: 'Is the leak causing damage to cabinets, walls, ceilings, flooring, or another unit?',
    inputType: 'single_choice',
    options: [
      { value: YNU.YES, label: 'Yes', action: { damageRisk: 'high' } },
      { value: YNU.NO, label: 'No' },
      { value: YNU.UNSURE, label: 'Unsure' },
    ],
    next: [{ goto: QID.MEDIA }],
  },

  // ── Branch 3 — leaks only when used (P3, escalates on volume) ───────────────
  {
    id: QID.FIXTURE,
    section: 'issue',
    text: 'Which fixture leaks when it is used?',
    inputType: 'single_choice',
    options: FIXTURE_OPTIONS,
    // → q_leak_location (array order)
  },
  {
    id: QID.LEAK_LOCATION,
    section: 'issue',
    text: 'Where does the water appear?',
    inputType: 'single_choice',
    dynamicOptions: {
      basedOn: QID.FIXTURE,
      map: {
        kitchen_sink: SINK_LOCATION,
        bathroom_sink: SINK_LOCATION,
        toilet: TOILET_LOCATION,
        bathtub_shower: TUB_LOCATION,
        dishwasher: APPLIANCE_LOCATION,
        washing_machine: APPLIANCE_LOCATION,
      },
      default: GENERIC_LOCATION,
    },
    // → q_leak_amount (array order)
  },
  {
    id: QID.LEAK_AMOUNT,
    section: 'issue',
    text: 'How much water is leaking?',
    inputType: 'single_choice',
    options: [
      opt(LEAK_AMOUNT.DROPS, 'A few drops'),
      opt(LEAK_AMOUNT.SLOW_DRIP, 'A slow drip'),
      opt(LEAK_AMOUNT.SMALL_PUDDLE, 'A small puddle'),
      { value: LEAK_AMOUNT.LARGE, label: 'A large amount', action: { setPriority: 'P2', damageRisk: 'moderate' } },
      opt(LEAK_AMOUNT.UNSURE, 'Unsure'),
    ],
    next: [{ goto: QID.MEDIA }],
  },

  // ── Branch 4 — visible water damage only (P2, hidden source) ───────────────
  // Also the landing spot for wall/ceiling water damage reported via
  // walls-ceilings-v1.ts.
  {
    id: QID.DAMAGE_LOCATION,
    section: 'issue',
    text: 'Where do you see the water damage?',
    inputType: 'single_choice',
    options: [
      opt('ceiling', 'Ceiling'),
      opt('wall', 'Wall'),
      opt('floor', 'Floor'),
      opt('cabinet', 'Cabinet'),
      opt('window_door', 'Around a window or door'),
      opt('another_unit', 'Another unit'),
      opt('other', 'Other'),
    ],
    // → q_damage_wet (array order)
  },
  {
    id: QID.DAMAGE_WET,
    section: 'issue',
    text: 'Is the damaged area currently wet?',
    inputType: 'single_choice',
    options: YES_NO_UNSURE,
    // → q_ceiling_risk (array order)
  },
  {
    id: QID.CEILING_RISK,
    section: 'issue',
    text: 'Is the ceiling sagging, bubbling, cracking, or at risk of falling?',
    inputType: 'single_choice',
    options: [
      { value: CEILING_RISK.YES, label: 'Yes', action: { setPriority: 'P2', safetyFlags: ['ceiling_collapse_risk'], damageRisk: 'high' } },
      opt(CEILING_RISK.NO, 'No'),
      opt(CEILING_RISK.NA, 'Not applicable'),
      { value: CEILING_RISK.UNSURE, label: 'Unsure', action: { setPriority: 'P2', safetyFlags: ['ceiling_collapse_risk'], damageRisk: 'high' } },
    ],
    safetyMessages: [
      {
        level: 'danger',
        when: { questionId: QID.CEILING_RISK, op: 'in', value: [CEILING_RISK.YES, CEILING_RISK.UNSURE] },
        text: 'Stay clear of the affected area. Do not stand underneath a sagging or damaged ceiling.',
      },
    ],
    next: [{ goto: QID.MEDIA }],
  },

  // ── Branch 5 — unsure ──────────────────────────────────────────────────────
  {
    id: QID.UNSURE_DESC,
    section: 'issue',
    text: 'Which description is closest to what you see?',
    inputType: 'single_choice',
    options: [
      { value: UNSURE_DESC.FLOWING, label: 'Water is continuously flowing', action: { setPriority: 'P2', damageRisk: 'high' } },
      opt(UNSURE_DESC.PUDDLE, 'There is a puddle or wet area'),
      opt(UNSURE_DESC.WHEN_USED, 'Water appears only when something is used'),
      opt(UNSURE_DESC.STAINING, 'There is staining or damage, but no visible water'),
      { value: UNSURE_DESC.CANNOT_INSPECT, label: 'I cannot safely inspect the area', action: { setPriority: 'P2', coordinatorReview: true, safetyFlags: ['cannot_safely_inspect'] } },
      opt(UNSURE_DESC.NONE, 'None of these'),
    ],
    next: [{ goto: QID.MEDIA }],
  },
]
