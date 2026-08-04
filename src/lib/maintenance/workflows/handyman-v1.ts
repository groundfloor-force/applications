// ─────────────────────────────────────────────────────────────────────────────
// General handyman / small jobs.
//
//   what do you need done → how urgent → do you have the materials →
//   shared issue detail → photos + contact tail
//
// Mostly scheduling rather than triage — the value here is knowing whether it
// blocks use of the home (P2) or can wait for the next scheduled visit (P3).
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt } from './shared'

export const HAND = {
  WHAT: 'q_hand_what',
  URGENCY: 'q_hand_urgency',
  MATERIALS: 'q_hand_materials',
} as const

export const handymanQuestions: Question[] = [
  {
    id: HAND.WHAT,
    section: 'issue',
    text: 'What do you need done?',
    inputType: 'single_choice',
    options: [
      opt('install_mount', 'Install or mount something'),
      opt('assemble', 'Assemble something'),
      opt('shelving_closet', 'Shelving, closet rod, or storage'),
      opt('blinds_curtains', 'Blinds or curtains'),
      opt('caulking', 'Caulking or sealing'),
      opt('patch_paint', 'Patch or paint'),
      opt('hardware', 'Hooks, handles, or hardware'),
      opt('furniture_repair', 'Furniture repair'),
      opt('outdoor_yard', 'Outdoor or yard work'),
      opt('other', 'Something else'),
    ],
    next: [{ goto: HAND.URGENCY }],
  },

  {
    id: HAND.URGENCY,
    section: 'issue',
    text: 'How urgent is it?',
    inputType: 'single_choice',
    options: [
      { value: 'safety', label: 'There is a safety concern', action: { setPriority: 'P2', safetyFlags: [FLAG.GENERAL_SAFETY_CONCERN] } },
      { value: 'blocking', label: 'It is stopping us from using part of the home', action: { setPriority: 'P2' } },
      { value: 'soon', label: 'Soon, but not urgent', action: { setPriority: 'P3' } },
      { value: 'whenever', label: 'Whenever it is convenient', action: { setPriority: 'P3' } },
    ],
    next: [{ goto: HAND.MATERIALS }],
  },

  {
    id: HAND.MATERIALS,
    section: 'issue',
    text: 'Do you already have the parts or materials?',
    inputType: 'single_choice',
    optional: true,
    options: [
      opt('have_them', 'Yes, I have them'),
      opt('need_supplied', 'No — they need to be supplied'),
      opt('unsure', 'Not sure'),
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },
]
