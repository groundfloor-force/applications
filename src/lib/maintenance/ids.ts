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

  // Shared terminus for every guided category flow — optional free text.
  ISSUE_DETAIL: 'q_issue_detail',

  // Fallback for anything the guided intake does not cover yet.
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
  PESTS: 'pests',
  OTHER: 'other',
} as const

export const PLUMBING_TYPE = {
  LEAK: 'leak',
  CLOG: 'clog',
  NO_WATER: 'no_water',
  NO_HOT_WATER: 'no_hot_water',
  LOW_PRESSURE: 'low_pressure',
  BROKEN_FIXTURE: 'broken_fixture',
  OTHER: 'other',
} as const

/**
 * Safety flags. These travel to Monday and are read by the coordinator, and
 * several are set from more than one category module — keep the strings here so
 * they cannot drift.
 */
export const FLAG = {
  // Water / damage
  WATER_NEAR_ELECTRICAL: 'water_near_electrical',
  POSSIBLE_ELECTRICAL_HAZARD: 'possible_electrical_hazard',
  CANNOT_SAFELY_INSPECT: 'cannot_safely_inspect',
  CEILING_COLLAPSE_RISK: 'ceiling_collapse_risk',
  CEILING_COLLAPSE: 'ceiling_collapse',
  POSSIBLE_MOLD: 'possible_mold',
  STRUCTURAL_CONCERN: 'structural_concern',
  EXTERIOR_BREACH: 'exterior_breach',
  FROZEN_PIPES: 'frozen_pipes',
  SEWAGE_BACKUP: 'sewage_backup',
  DRAIN_BACKUP: 'drain_backup',
  SOLE_TOILET: 'sole_toilet',
  WATER_HEATER: 'water_heater',
  SUMP_PUMP: 'sump_pump',

  // Heat / fuel
  NO_HEAT_HABITABILITY: 'no_heat_habitability',
  HEAT_VULNERABLE_OCCUPANT: 'heat_vulnerable_occupant',
  CARBON_MONOXIDE: 'carbon_monoxide',
  GAS_SMELL: 'gas_smell',
  HVAC_FIRE_RISK: 'hvac_fire_risk',

  // Electrical
  ELECTRICAL_FIRE_RISK: 'electrical_fire_risk',
  ELECTRICAL_SPARKS: 'electrical_sparks',
  ELECTRIC_SHOCK: 'electric_shock',
  EXPOSED_WIRING: 'exposed_wiring',
  BREAKER_TRIPS: 'breaker_trips',
  ALARM_INOPERATIVE: 'alarm_inoperative',
  AREA_POWER_OUTAGE: 'area_power_outage',

  // Appliance
  APPLIANCE_FIRE_RISK: 'appliance_fire_risk',
  APPLIANCE_SPARKS: 'appliance_sparks',
  APPLIANCE_WATER: 'appliance_water',
  APPLIANCE_OVERHEATING: 'appliance_overheating',
  APPLIANCE_UNSAFE: 'appliance_unsafe',

  // Security
  UNIT_NOT_SECURE: 'unit_not_secure',
  UNIT_SECURITY_REDUCED: 'unit_security_reduced',
  TENANT_LOCKED_OUT: 'tenant_locked_out',
  BREAK_IN: 'break_in',

  // General
  UNSAFE_LIVING_SPACE: 'unsafe_living_space',
  INJURY: 'injury',
  GENERAL_SAFETY_CONCERN: 'general_safety_concern',
  RODENTS: 'rodents',
  BEDBUGS: 'bedbugs',
} as const
