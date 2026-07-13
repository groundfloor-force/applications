// ─────────────────────────────────────────────────────────────────────────────
// Appliance repair intake — ONE shared flow that branches by appliance and
// symptom (not five separate systems).
//
//   appliance → early safety check → (gas/electric) → what is it doing →
//   shared symptom sub-flows (leak / noise) or "tell us more" → appliance
//   details → usability → shared photo + contact tail (from the main workflow).
//
// Safety hazards (gas smell, smoke/sparks, uncontrolled water, overheating,
// tripping breaker) escalate to P1/P2, set the right trade, and short-circuit
// straight to photos + contact so we don't run the tenant through diagnostics.
//
// Priority/trade are data (option `action`s) — editable in the admin workflow
// editor. This module exports the question list; the main workflow appends it.
// ─────────────────────────────────────────────────────────────────────────────

import type { AnswerOption, Question } from '../types'
import { QID } from '../ids'

const opt = (value: string, label: string, goto?: string): AnswerOption => ({ value, label, goto })

export const APPL = {
  WHICH: 'q_appl_which',
  SAFETY: 'q_appl_safety',
  GAS_STOP: 'q_appl_gas_stop',
  HAZARD_STOP: 'q_appl_hazard_stop',
  WATER_ELEC: 'q_appl_water_elec',
  FUEL: 'q_appl_fuel',
  PROBLEM: 'q_appl_problem',
  LEAK_WHERE: 'q_appl_leak_where',
  LEAK_ACTIVE: 'q_appl_leak_active',
  LEAK_SHUTOFF: 'q_appl_leak_shutoff',
  NOISE_TYPE: 'q_appl_noise_type',
  NOISE_WHEN: 'q_appl_noise_when',
  SYMPTOM_DETAIL: 'q_appl_symptom_detail',
  BRAND_MODEL: 'q_appl_brand_model',
  AGE: 'q_appl_age',
  STARTED: 'q_appl_started',
  USABILITY: 'q_appl_usability',
} as const

export const APPLIANCE = {
  FRIDGE: 'refrigerator',
  STOVE: 'stove',
  DISHWASHER: 'dishwasher',
  WASHER: 'washer',
  DRYER: 'dryer',
} as const

// Shared symptom values (consistent across appliances so branch rules match).
const SYM_LEAK = 'leaking'
const SYM_NOISE = 'noise'

const TRADE = {
  APPLIANCE: 'Appliance technician',
  GAS: 'Gas-qualified technician',
  APPLIANCE_OR_ELEC: 'Appliance technician or electrician',
  APPLIANCE_PLUMBER: 'Appliance technician (possibly plumber)',
  VENT: 'Dryer-vent specialist',
}

// ── Per-appliance problem lists (dynamic options for q_appl_problem) ──────────
const FRIDGE_PROBLEMS: AnswerOption[] = [
  opt('not_cooling', 'Not cooling'),
  opt('freezer_not_freezing', 'Freezer not freezing'),
  opt('too_cold', 'Too cold / freezing food'),
  opt(SYM_LEAK, 'Leaking water', APPL.LEAK_WHERE),
  opt(SYM_NOISE, 'Making an unusual noise', APPL.NOISE_TYPE),
  opt('ice_maker', 'Ice maker not working'),
  opt('door', 'Door not closing'),
  opt('no_power', 'No power'),
  opt('other', 'Something else'),
]
const STOVE_PROBLEMS: AnswerOption[] = [
  opt('burner_not_heating', 'A burner is not heating'),
  opt('oven_not_heating', 'The oven is not heating'),
  opt('uneven', 'Heating unevenly'),
  opt('gas_no_ignite', 'Gas burner will not ignite'),
  opt('control_panel', 'Control panel not working'),
  opt('oven_door', 'Oven door problem'),
  opt('no_power', 'No power'),
  opt('other', 'Something else'),
]
const DISHWASHER_PROBLEMS: AnswerOption[] = [
  opt('not_starting', 'Not starting'),
  opt('not_filling', 'Not filling with water'),
  opt('not_draining', 'Not draining'),
  opt(SYM_LEAK, 'Leaking', APPL.LEAK_WHERE),
  opt('not_cleaning', 'Dishes are not clean'),
  opt('not_drying', 'Dishes are not drying'),
  opt(SYM_NOISE, 'Making an unusual noise', APPL.NOISE_TYPE),
  opt('error_code', 'Showing an error code'),
  opt('door', 'Door will not close'),
  opt('other', 'Something else'),
]
const WASHER_PROBLEMS: AnswerOption[] = [
  opt('not_starting', 'Not starting'),
  opt('not_filling', 'Not filling'),
  opt('not_draining', 'Not draining'),
  opt('not_spinning', 'Not spinning'),
  opt(SYM_LEAK, 'Leaking', APPL.LEAK_WHERE),
  opt('shaking', 'Shaking or moving'),
  opt(SYM_NOISE, 'Making an unusual noise', APPL.NOISE_TYPE),
  opt('door_locked', 'Door or lid will not open'),
  opt('error_code', 'Showing an error code'),
  opt('other', 'Something else'),
]
const DRYER_PROBLEMS: AnswerOption[] = [
  opt('not_starting', 'Not starting'),
  opt('not_heating', 'Not heating'),
  opt('too_long', 'Takes too long to dry'),
  { value: 'overheating', label: 'Overheating', action: { setPriority: 'P2', safetyFlags: ['appliance_overheating'], suggestedTrade: TRADE.VENT } },
  opt(SYM_NOISE, 'Making an unusual noise', APPL.NOISE_TYPE),
  opt('drum_not_turning', 'Drum not turning'),
  opt('error_code', 'Showing an error code'),
  opt('other', 'Something else'),
]

const LOCATION = (v: string, l: string) => opt(v, l)

export const applianceQuestions: Question[] = [
  // ── Which appliance ─────────────────────────────────────────────────────────
  {
    id: APPL.WHICH,
    section: 'issue',
    text: 'Which appliance has an issue?',
    inputType: 'single_choice',
    options: [
      opt(APPLIANCE.FRIDGE, 'Refrigerator'),
      opt(APPLIANCE.STOVE, 'Stove or oven'),
      opt(APPLIANCE.DISHWASHER, 'Dishwasher'),
      opt(APPLIANCE.WASHER, 'Washing machine'),
      opt(APPLIANCE.DRYER, 'Dryer'),
    ],
    next: [{ goto: APPL.SAFETY }],
  },

  // ── Early safety check ──────────────────────────────────────────────────────
  {
    id: APPL.SAFETY,
    section: 'issue',
    text: 'Before we go on — is anything unsafe happening right now?',
    inputType: 'single_choice',
    options: [
      { value: 'smoke_burning', label: 'Smoke or a burning smell', goto: APPL.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Smoke / burning smell', safetyFlags: ['appliance_fire_risk'], suggestedTrade: TRADE.APPLIANCE_OR_ELEC } },
      { value: 'sparks', label: 'Sparks', goto: APPL.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Electrical sparks', safetyFlags: ['appliance_sparks'], suggestedTrade: TRADE.APPLIANCE_OR_ELEC } },
      { value: 'gas_smell', label: 'A gas smell', goto: APPL.GAS_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Gas smell', safetyFlags: ['gas_smell'], suggestedTrade: TRADE.GAS } },
      { value: 'water_leak', label: 'An active water leak', goto: APPL.WATER_ELEC, action: { setPriority: 'P1', emergency: true, emergencyType: 'Uncontrolled water', safetyFlags: ['appliance_water'], damageRisk: 'high', suggestedTrade: TRADE.APPLIANCE_PLUMBER } },
      { value: 'extremely_hot', label: 'The appliance is extremely hot', goto: APPL.HAZARD_STOP, action: { setPriority: 'P1', emergency: true, emergencyType: 'Overheating', safetyFlags: ['appliance_overheating'], suggestedTrade: TRADE.APPLIANCE } },
      { value: 'breaker_trips', label: 'The breaker keeps tripping', action: { setPriority: 'P2', safetyFlags: ['breaker_trips'], suggestedTrade: TRADE.APPLIANCE_OR_ELEC } },
      opt('none', 'None of these'),
      opt('unsure', 'Unsure'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: APPL.SAFETY, op: 'eq', value: 'gas_smell' }, text: 'Gas can be dangerous. Do not turn any switches on or off. Leave the area and call us at 506 204 8440 right away, or 911 if needed. Please do not keep filling out this form.' },
      { level: 'danger', when: { questionId: APPL.SAFETY, op: 'in', value: ['smoke_burning', 'sparks'] }, text: 'Stop using the appliance. Unplug it only if it is safe to do so — do not touch it if there is visible sparking or heat.' },
      { level: 'danger', when: { questionId: APPL.SAFETY, op: 'eq', value: 'extremely_hot' }, text: 'Turn the appliance off and keep clear until it has cooled down.' },
      { level: 'warning', when: { questionId: APPL.SAFETY, op: 'eq', value: 'breaker_trips' }, text: 'Please do not keep resetting the breaker — repeatedly resetting it can be unsafe.' },
    ],
    next: [{ goto: APPL.FUEL }],
  },

  // Hazard stop screens → straight to photos + contact (skip diagnostics).
  {
    id: APPL.GAS_STOP,
    section: 'issue',
    text: 'Is everyone now away from the appliance and is it switched off (only if safe)?',
    helpText: 'Do not operate any switches. For a gas emergency, call 506 204 8440 or 911.',
    inputType: 'single_choice',
    options: [opt('yes', 'Yes'), opt('no', 'No')],
    next: [{ goto: QID.MEDIA }],
  },
  {
    id: APPL.HAZARD_STOP,
    section: 'issue',
    text: 'Have you turned the appliance off (and unplugged it, if that was safe)?',
    inputType: 'single_choice',
    options: [opt('yes', 'Yes'), opt('no', 'No'), opt('couldnt', 'I couldn’t do it safely')],
    next: [{ goto: QID.MEDIA }],
  },
  {
    id: APPL.WATER_ELEC,
    section: 'issue',
    text: 'Is the water near electrical outlets, cords, or the appliance’s power?',
    inputType: 'single_choice',
    options: [
      { value: 'yes', label: 'Yes', action: { setPriority: 'P1', safetyFlags: ['water_near_electrical'] } },
      opt('no', 'No'),
      { value: 'unsure', label: 'Unsure', action: { safetyFlags: ['possible_electrical_hazard'] } },
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: APPL.WATER_ELEC, op: 'in', value: ['yes', 'unsure'] }, text: 'Do not touch the appliance or stand in water near electricity. Leave the area if you believe there is a danger.' },
    ],
    next: [{ goto: QID.MEDIA }],
  },

  // Gas or electric (stove / dryer only).
  {
    id: APPL.FUEL,
    section: 'issue',
    text: 'Is it gas or electric?',
    inputType: 'single_choice',
    visibleIf: { questionId: APPL.WHICH, op: 'in', value: [APPLIANCE.STOVE, APPLIANCE.DRYER] },
    options: [opt('gas', 'Gas'), opt('electric', 'Electric'), opt('unsure', 'Unsure')],
    next: [{ goto: APPL.PROBLEM }],
  },

  // ── What is it doing (per appliance) ────────────────────────────────────────
  {
    id: APPL.PROBLEM,
    section: 'issue',
    text: 'What is it doing?',
    inputType: 'single_choice',
    dynamicOptions: {
      basedOn: APPL.WHICH,
      map: {
        [APPLIANCE.FRIDGE]: FRIDGE_PROBLEMS,
        [APPLIANCE.STOVE]: STOVE_PROBLEMS,
        [APPLIANCE.DISHWASHER]: DISHWASHER_PROBLEMS,
        [APPLIANCE.WASHER]: WASHER_PROBLEMS,
        [APPLIANCE.DRYER]: DRYER_PROBLEMS,
      },
      default: [opt('other', 'Something else')],
    },
    next: [{ goto: APPL.SYMPTOM_DETAIL }],
  },

  // ── Shared leak sub-flow ────────────────────────────────────────────────────
  {
    id: APPL.LEAK_WHERE,
    section: 'issue',
    text: 'Where is the water coming from?',
    inputType: 'single_choice',
    options: [
      LOCATION('inside', 'Inside the appliance'),
      LOCATION('underneath', 'Underneath it'),
      LOCATION('behind', 'Behind it'),
      LOCATION('supply', 'Around the water supply connection'),
      LOCATION('door_seal', 'Around the door or seal'),
      LOCATION('unsure', 'Unsure'),
    ],
    next: [{ goto: APPL.LEAK_ACTIVE }],
  },
  {
    id: APPL.LEAK_ACTIVE,
    section: 'issue',
    text: 'Is water actively flowing right now?',
    inputType: 'single_choice',
    options: [
      { value: 'uncontrolled', label: 'Yes, and I can’t stop it', action: { setPriority: 'P1', emergency: true, emergencyType: 'Uncontrolled water', damageRisk: 'high', suggestedTrade: TRADE.APPLIANCE_PLUMBER } },
      { value: 'contained', label: 'Yes, but I’ve contained it', action: { setPriority: 'P2', damageRisk: 'moderate', suggestedTrade: TRADE.APPLIANCE_PLUMBER } },
      { value: 'occasional', label: 'Only occasionally', action: { setPriority: 'P3', suggestedTrade: TRADE.APPLIANCE } },
      { value: 'none', label: 'No active water right now', action: { suggestedTrade: TRADE.APPLIANCE } },
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: APPL.LEAK_ACTIVE, op: 'eq', value: 'uncontrolled' }, text: 'Stop using the appliance and, if you can safely reach it, close its water shut-off valve.' },
    ],
    next: [{ goto: APPL.LEAK_SHUTOFF }],
  },
  {
    id: APPL.LEAK_SHUTOFF,
    section: 'issue',
    text: 'Can you safely shut off the appliance’s water supply?',
    inputType: 'single_choice',
    options: [
      opt('yes', 'Yes'),
      opt('no', 'No'),
      opt('unsure', 'Unsure'),
      opt('cant_access', 'I can’t safely reach it'),
    ],
    next: [{ goto: APPL.BRAND_MODEL }],
  },

  // ── Shared noise sub-flow ───────────────────────────────────────────────────
  {
    id: APPL.NOISE_TYPE,
    section: 'issue',
    text: 'What kind of sound is it?',
    inputType: 'single_choice',
    options: [
      opt('buzzing', 'Buzzing'),
      opt('clicking', 'Clicking'),
      { value: 'grinding', label: 'Grinding', action: { setPriority: 'P2', suggestedTrade: TRADE.APPLIANCE } },
      opt('rattling', 'Rattling'),
      opt('humming', 'Humming'),
      opt('knocking', 'Knocking'),
      opt('unsure', 'Unsure'),
    ],
    next: [{ goto: APPL.NOISE_WHEN }],
  },
  {
    id: APPL.NOISE_WHEN,
    section: 'issue',
    text: 'When does the sound happen?',
    inputType: 'single_choice',
    options: [
      opt('constant', 'Constantly'),
      opt('when_running', 'While it’s running'),
      opt('when_starting', 'When it starts up'),
      opt('when_door', 'When the door opens or closes'),
      opt('occasional', 'Occasionally'),
    ],
    next: [{ goto: APPL.BRAND_MODEL }],
  },

  // ── Catch-all for other symptoms ────────────────────────────────────────────
  {
    id: APPL.SYMPTOM_DETAIL,
    section: 'issue',
    text: 'Tell us more about what’s happening.',
    helpText: 'Describe what the appliance is doing, any error codes or sounds, and anything you’ve already tried.',
    inputType: 'long_text',
    validation: { minLength: 5, maxLength: 2000, message: 'Please add a little more detail.' },
    next: [{ goto: APPL.BRAND_MODEL }],
  },

  // ── Appliance details ───────────────────────────────────────────────────────
  {
    id: APPL.BRAND_MODEL,
    section: 'appliance',
    text: 'Appliance brand and model number (if you can find it)',
    helpText: 'It’s usually on a label inside the door, on the back, or along an edge.',
    inputType: 'short_text',
    optional: true,
    next: [{ goto: APPL.AGE }],
  },
  {
    id: APPL.AGE,
    section: 'appliance',
    text: 'Roughly how old is the appliance?',
    inputType: 'single_choice',
    optional: true,
    options: [
      opt('lt1', 'Less than a year'),
      opt('1_5', '1–5 years'),
      opt('5_10', '5–10 years'),
      opt('10plus', 'More than 10 years'),
      opt('unsure', 'Unsure'),
    ],
    next: [{ goto: APPL.STARTED }],
  },
  {
    id: APPL.STARTED,
    section: 'appliance',
    text: 'When did the problem start?',
    inputType: 'short_text',
    optional: true,
    next: [{ goto: APPL.USABILITY }],
  },
  {
    id: APPL.USABILITY,
    section: 'appliance',
    text: 'Is the appliance currently usable?',
    inputType: 'single_choice',
    options: [
      opt('fully', 'Fully usable'),
      opt('partially', 'Partially usable'),
      opt('not_usable', 'Not usable'),
      { value: 'unsafe', label: 'Unsafe to use', action: { setPriority: 'P2', safetyFlags: ['appliance_unsafe'] } },
      opt('unsure', 'Unsure'),
    ],
    next: [{ goto: QID.MEDIA }],
  },
]
