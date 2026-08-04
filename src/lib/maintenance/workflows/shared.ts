// Helpers shared by every workflow module.

import type { AnswerOption } from '../types'
import { YNU } from '../ids'

/** Build a plain answer option. `goto` is optional per-option routing. */
export const opt = (value: string, label: string, goto?: string): AnswerOption => ({ value, label, goto })

export const YES_NO: AnswerOption[] = [opt('yes', 'Yes'), opt('no', 'No')]

export const YES_NO_UNSURE: AnswerOption[] = [
  opt(YNU.YES, 'Yes'),
  opt(YNU.NO, 'No'),
  opt(YNU.UNSURE, 'Unsure'),
]

/**
 * Suggested trades. `evaluateSeverity` derives a base trade from the category
 * and lets an option's `suggestedTrade` override it, so these strings reach the
 * coordinator verbatim.
 */
export const TRADE = {
  PLUMBER: 'Plumber',
  ELECTRICIAN: 'Electrician',
  HVAC: 'HVAC Technician',
  GAS: 'Gas-qualified technician',
  LOCKSMITH: 'Locksmith',
  LOCKSMITH_OR_CARPENTER: 'Locksmith or carpenter',
  CARPENTER: 'Carpenter',
  DRYWALL: 'Drywall / plaster repair',
  PEST: 'Pest control',
  GENERAL: 'General Maintenance',

  // Appliance — these exact strings are asserted by appliance.test.ts.
  APPLIANCE: 'Appliance technician',
  APPLIANCE_TITLE: 'Appliance Technician',
  APPLIANCE_OR_ELEC: 'Appliance technician or electrician',
  APPLIANCE_PLUMBER: 'Appliance technician (possibly plumber)',
  VENT: 'Dryer-vent specialist',
} as const
