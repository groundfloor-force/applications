// Canonical question ids and answer values shared by the workflow definition
// and the priority-rules module. Referencing these constants (rather than raw
// strings) keeps the config and the rules engine from drifting apart.

export const QID = {
  // Selection
  CATEGORY: 'q_category',
  PLUMBING_TYPE: 'q_plumbing_type',

  // Water leak — root
  WATER_FLOW: 'q_water_flow',

  // Branch 1 — uncontrolled
  NEAR_ELECTRICAL: 'q_near_electrical',
  LEAK_SOURCE: 'q_leak_source',

  // Branch 2 — contained
  CONTAINMENT: 'q_containment',
  DAMAGE_SPREAD: 'q_damage_spread',

  // Branch 3 — when used
  FIXTURE: 'q_fixture',
  LEAK_LOCATION: 'q_leak_location',
  LEAK_AMOUNT: 'q_leak_amount',

  // Branch 4 — damage only
  DAMAGE_LOCATION: 'q_damage_location',
  DAMAGE_WET: 'q_damage_wet',
  CEILING_RISK: 'q_ceiling_risk',

  // Branch 5 — unsure
  UNSURE_DESC: 'q_unsure_desc',

  // Fallback (non-plumbing / other plumbing)
  FALLBACK_DESC: 'q_fallback_desc',

  // Shared — media
  MEDIA: 'q_media',

  // Shared — contact
  NAME: 'q_name',
  PHONE: 'q_phone',
  EMAIL: 'q_email',
  PREF_CONTACT: 'q_pref_contact',

  // Shared — property
  PROPERTY_ADDRESS: 'q_property_address',
  UNIT: 'q_unit',
  PM_NAME: 'q_pm_name',
  SUBMITTER_ROLE: 'q_submitter_role',

  // Shared — access
  SOMEONE_HOME: 'q_someone_home',
  PERMISSION: 'q_permission',
  ACCESS_INSTRUCTIONS: 'q_access_instructions',
  LOCKBOX: 'q_lockbox',
  PARKING: 'q_parking',
  PETS: 'q_pets',
  PET_DETAILS: 'q_pet_details',
  BEST_TIMES: 'q_best_times',

  // Shared — comments
  COMMENTS: 'q_comments',
} as const

export const WATER_FLOW = {
  UNCONTROLLED: 'uncontrolled',
  CONTAINED: 'contained',
  WHEN_USED: 'when_used',
  DAMAGE_ONLY: 'damage_only',
  UNSURE: 'unsure',
} as const

export const LEAK_AMOUNT = {
  DROPS: 'drops',
  SLOW_DRIP: 'slow_drip',
  SMALL_PUDDLE: 'small_puddle',
  LARGE: 'large',
  UNSURE: 'unsure',
} as const

export const YNU = { YES: 'yes', NO: 'no', UNSURE: 'unsure' } as const

export const CEILING_RISK = { YES: 'yes', NO: 'no', NA: 'na', UNSURE: 'unsure' } as const

export const UNSURE_DESC = {
  FLOWING: 'flowing',
  PUDDLE: 'puddle',
  WHEN_USED: 'when_used',
  STAINING: 'staining',
  CANNOT_INSPECT: 'cannot_inspect',
  NONE: 'none',
} as const

export const CATEGORY = {
  PLUMBING: 'plumbing',
  ELECTRICAL: 'electrical',
  APPLIANCE: 'appliance',
  HVAC: 'hvac',
  DOOR_LOCK: 'door_lock',
  WALLS_CEILINGS: 'walls_ceilings',
  HANDYMAN: 'handyman',
  OTHER: 'other',
} as const

export const PLUMBING_TYPE = {
  LEAK: 'leak',
  CLOG: 'clog',
  NO_WATER: 'no_water',
  LOW_PRESSURE: 'low_pressure',
  BROKEN_FIXTURE: 'broken_fixture',
  OTHER: 'other',
} as const
