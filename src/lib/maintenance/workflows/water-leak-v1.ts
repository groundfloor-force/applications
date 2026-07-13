// ─────────────────────────────────────────────────────────────────────────────
// Workflow: Maintenance intake v1
//
// Category selection → Plumbing issue type → Active Water Leak (full dynamic
// flow) → shared tail (media, contact, property, access, comments). Non-plumbing
// categories and non-leak plumbing issues route to a basic fallback description.
//
// This file is DATA. All branching lives in `next` rules and option `goto`s;
// all severity lives in priority-rules.ts. To add a new workflow, copy this
// shape — you should not need to touch the engine or the UI. See MAINTENANCE.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerOption, Question, WorkflowDefinition } from '../types'
import {
  QID,
  CATEGORY,
  PLUMBING_TYPE,
  WATER_FLOW,
  LEAK_AMOUNT,
  CEILING_RISK,
  UNSURE_DESC,
  YNU,
} from '../ids'

const opt = (value: string, label: string, goto?: string): AnswerOption => ({ value, label, goto })

const YES_NO: AnswerOption[] = [opt('yes', 'Yes'), opt('no', 'No')]
const YES_NO_UNSURE: AnswerOption[] = [opt(YNU.YES, 'Yes'), opt(YNU.NO, 'No'), opt(YNU.UNSURE, 'Unsure')]

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

const questions: Question[] = [
  // ── Selection ──────────────────────────────────────────────────────────────
  {
    id: QID.CATEGORY,
    section: 'issue',
    text: 'What type of issue are you reporting?',
    inputType: 'single_choice',
    options: [
      opt(CATEGORY.PLUMBING, 'Plumbing'),
      opt(CATEGORY.ELECTRICAL, 'Electrical'),
      opt(CATEGORY.APPLIANCE, 'Appliance'),
      opt(CATEGORY.HVAC, 'Heating or cooling'),
      opt(CATEGORY.DOOR_LOCK, 'Door or lock'),
      opt(CATEGORY.WALLS_CEILINGS, 'Walls or ceilings'),
      opt(CATEGORY.HANDYMAN, 'General handyman'),
      opt(CATEGORY.OTHER, 'Other'),
    ],
    next: [
      { when: { questionId: QID.CATEGORY, op: 'eq', value: CATEGORY.PLUMBING }, goto: QID.PLUMBING_TYPE },
      { goto: QID.FALLBACK_DESC },
    ],
  },
  {
    id: QID.PLUMBING_TYPE,
    section: 'issue',
    text: 'What type of plumbing problem are you reporting?',
    inputType: 'single_choice',
    options: [
      opt(PLUMBING_TYPE.LEAK, 'Leak'),
      opt(PLUMBING_TYPE.CLOG, 'Clog'),
      opt(PLUMBING_TYPE.NO_WATER, 'No water'),
      opt(PLUMBING_TYPE.LOW_PRESSURE, 'Low water pressure'),
      opt(PLUMBING_TYPE.BROKEN_FIXTURE, 'Broken fixture'),
      opt(PLUMBING_TYPE.OTHER, 'Other'),
    ],
    next: [
      { when: { questionId: QID.PLUMBING_TYPE, op: 'eq', value: PLUMBING_TYPE.LEAK }, goto: QID.WATER_FLOW },
      { goto: QID.FALLBACK_DESC },
    ],
  },

  // ── Active water leak — root ───────────────────────────────────────────────
  {
    id: QID.WATER_FLOW,
    section: 'issue',
    text: 'Is water actively flowing right now?',
    inputType: 'single_choice',
    options: [
      opt(WATER_FLOW.UNCONTROLLED, 'Yes, and I cannot stop it'),
      opt(WATER_FLOW.CONTAINED, 'Yes, but I have contained it'),
      opt(WATER_FLOW.WHEN_USED, 'No, it only leaks when the fixture is used'),
      opt(WATER_FLOW.DAMAGE_ONLY, 'No, I only see water damage'),
      opt(WATER_FLOW.UNSURE, 'I am not sure'),
    ],
    next: [
      { when: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.UNCONTROLLED }, goto: QID.NEAR_ELECTRICAL },
      { when: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.CONTAINED }, goto: QID.LEAK_SOURCE },
      { when: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.WHEN_USED }, goto: QID.FIXTURE },
      { when: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.DAMAGE_ONLY }, goto: QID.DAMAGE_LOCATION },
      { when: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.UNSURE }, goto: QID.UNSURE_DESC },
    ],
  },

  // ── Branch 1 — uncontrolled water (P1 emergency) ───────────────────────────
  {
    id: QID.NEAR_ELECTRICAL,
    section: 'issue',
    text: 'Is water near electrical outlets, electrical panels, lights, or appliances?',
    inputType: 'single_choice',
    emergencyBanner: true,
    options: YES_NO_UNSURE,
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
    options: YES_NO_UNSURE,
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
      opt(LEAK_AMOUNT.LARGE, 'A large amount'),
      opt(LEAK_AMOUNT.UNSURE, 'Unsure'),
    ],
    next: [{ goto: QID.MEDIA }],
  },

  // ── Branch 4 — visible water damage only (P2, hidden source) ───────────────
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
      opt(CEILING_RISK.YES, 'Yes'),
      opt(CEILING_RISK.NO, 'No'),
      opt(CEILING_RISK.NA, 'Not applicable'),
      opt(CEILING_RISK.UNSURE, 'Unsure'),
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
      opt(UNSURE_DESC.FLOWING, 'Water is continuously flowing'),
      opt(UNSURE_DESC.PUDDLE, 'There is a puddle or wet area'),
      opt(UNSURE_DESC.WHEN_USED, 'Water appears only when something is used'),
      opt(UNSURE_DESC.STAINING, 'There is staining or damage, but no visible water'),
      opt(UNSURE_DESC.CANNOT_INSPECT, 'I cannot safely inspect the area'),
      opt(UNSURE_DESC.NONE, 'None of these'),
    ],
    next: [{ goto: QID.MEDIA }],
  },

  // ── Fallback — non-plumbing / non-leak plumbing ────────────────────────────
  {
    id: QID.FALLBACK_DESC,
    section: 'issue',
    text: 'Please describe the issue.',
    helpText:
      'This issue type is not available in the guided intake yet. Tell us what is happening and we will ' +
      'still create a maintenance request.',
    inputType: 'long_text',
    validation: { minLength: 5, maxLength: 2000, message: 'Please add a little more detail.' },
    // → q_media (array order)
  },

  // ── Shared tail — media ────────────────────────────────────────────────────
  {
    id: QID.MEDIA,
    section: 'media',
    text: 'Add photos of the issue',
    helpText:
      'Photos help us send the right person with the right parts. Add at least one, or mark that it is ' +
      'not safe to take a photo.',
    inputType: 'photo',
    media: { required: true, minCount: 1, allowUnsafeSkip: true },
    // → q_name (array order)
  },

  // ── Shared tail — contact ──────────────────────────────────────────────────
  { id: QID.NAME, section: 'contact', text: 'What is your full name?', inputType: 'short_text' },
  { id: QID.PHONE, section: 'contact', text: 'What is the best phone number to reach you?', inputType: 'phone' },
  { id: QID.EMAIL, section: 'contact', text: 'What is your email address?', inputType: 'email' },
  {
    id: QID.PREF_CONTACT,
    section: 'contact',
    text: 'How would you prefer we contact you?',
    inputType: 'single_choice',
    options: [opt('text', 'Text'), opt('phone', 'Phone'), opt('email', 'Email')],
  },

  // ── Shared tail — property ─────────────────────────────────────────────────
  { id: QID.PROPERTY_ADDRESS, section: 'property', text: 'What is the property address? (no unit number)', inputType: 'address' },
  { id: QID.UNIT, section: 'property', text: 'Unit number (if applicable)', inputType: 'short_text', optional: true },
  { id: QID.PM_NAME, section: 'property', text: 'Client or property manager name (if known)', inputType: 'short_text', optional: true },
  {
    id: QID.SUBMITTER_ROLE,
    section: 'property',
    text: 'Are you the…',
    inputType: 'single_choice',
    options: [
      opt('tenant', 'Tenant'),
      opt('property_manager', 'Property manager'),
      opt('property_owner', 'Property owner'),
      opt('building_staff', 'Building staff'),
      opt('other', 'Other'),
    ],
  },

  // ── Shared tail — access ───────────────────────────────────────────────────
  {
    id: QID.SOMEONE_HOME,
    section: 'access',
    text: 'Is someone currently at the property?',
    inputType: 'single_choice',
    options: YES_NO,
    // Only relevant for an active, uncontrolled emergency — skip otherwise.
    visibleIf: { questionId: QID.WATER_FLOW, op: 'eq', value: WATER_FLOW.UNCONTROLLED },
  },
  {
    id: QID.PERMISSION,
    section: 'access',
    text: 'Do we have permission to enter the unit if nobody is home?',
    inputType: 'single_choice',
    options: [
      opt('yes', 'Yes'),
      opt('no', 'No'),
      opt('contact_first', 'Contact me first'),
      opt('na', 'Not applicable'),
    ],
  },
  { id: QID.ACCESS_INSTRUCTIONS, section: 'access', text: 'Any access instructions?', inputType: 'long_text', optional: true },
  { id: QID.LOCKBOX, section: 'access', text: 'Lockbox or entry details (if any)', inputType: 'short_text', optional: true },
  { id: QID.PARKING, section: 'access', text: 'Parking instructions (if any)', inputType: 'short_text', optional: true },
  {
    id: QID.PETS,
    section: 'access',
    text: 'Are there pets at the property?',
    inputType: 'single_choice',
    options: YES_NO,
  },
  {
    id: QID.PET_DETAILS,
    section: 'access',
    text: 'Tell us about the pets (type, where they are kept).',
    inputType: 'short_text',
    optional: true,
    visibleIf: { questionId: QID.PETS, op: 'eq', value: 'yes' },
  },
  { id: QID.BEST_TIMES, section: 'access', text: 'Best available times for us to attend?', inputType: 'short_text', optional: true },

  // ── Shared tail — comments (last question → END) ───────────────────────────
  { id: QID.COMMENTS, section: 'comments', text: 'Anything else you would like to add?', inputType: 'long_text', optional: true },
]

export const waterLeakWorkflowV1: WorkflowDefinition = {
  id: 'maintenance_intake',
  version: '1.0.0',
  title: 'Maintenance Request',
  entry: QID.CATEGORY,
  questions,
}
