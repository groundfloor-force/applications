// ─────────────────────────────────────────────────────────────────────────────
// Doors, locks & entry.
//
//   which door → what is wrong → (can the unit still be secured?) →
//   shared issue detail → photos + contact tail
//
// SECURITY PRINCIPLE: an exterior opening that cannot be locked is a P1, same
// as a burst pipe. That escalation lives on its own question rather than on the
// symptom, because an option's `action` is static — "the lock is broken" is a
// P1 on a main entry door and a P3 on a closet door, and only `q_door_secure`
// can tell those apart.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt, TRADE } from './shared'

export const DOOR = {
  WHICH: 'q_door_which',
  PROBLEM: 'q_door_problem',
  SECURE: 'q_door_secure',
} as const

const EXTERIOR_DOORS = ['exterior_entry', 'patio_balcony', 'garage', 'common_building', 'window_lock']

export const doorLockQuestions: Question[] = [
  {
    id: DOOR.WHICH,
    section: 'issue',
    text: 'Which door or lock?',
    inputType: 'single_choice',
    options: [
      opt('exterior_entry', 'Main entry door'),
      opt('patio_balcony', 'Patio or balcony door'),
      opt('garage', 'Garage door'),
      opt('common_building', 'Building or common entrance'),
      opt('interior', 'An interior door'),
      opt('window_lock', 'A window or window lock'),
      opt('mailbox', 'Mailbox'),
      opt('unsure', 'Something else'),
    ],
    next: [{ goto: DOOR.PROBLEM }],
  },

  {
    id: DOOR.PROBLEM,
    section: 'issue',
    text: 'What is the problem?',
    inputType: 'single_choice',
    options: [
      { value: 'break_in', label: 'Damage from a break-in or attempted break-in', goto: DOOR.SECURE, action: { setPriority: 'P1', emergency: true, emergencyType: 'Break-in damage', safetyFlags: [FLAG.BREAK_IN, FLAG.UNIT_NOT_SECURE], suggestedTrade: TRADE.LOCKSMITH } },
      { value: 'locked_out', label: 'I am locked out right now', goto: QID.ISSUE_DETAIL, action: { setPriority: 'P2', safetyFlags: [FLAG.TENANT_LOCKED_OUT], suggestedTrade: TRADE.LOCKSMITH } },
      { value: 'wont_lock', label: 'It will not lock or unlock', action: { setPriority: 'P2', suggestedTrade: TRADE.LOCKSMITH } },
      { value: 'broken_lock', label: 'The lock, handle, or deadbolt is broken or came off', action: { setPriority: 'P2', suggestedTrade: TRADE.LOCKSMITH } },
      { value: 'key_broken', label: 'Key broken in the lock, or lost', action: { setPriority: 'P2', suggestedTrade: TRADE.LOCKSMITH } },
      { value: 'door_damaged', label: 'The door or frame is damaged', action: { setPriority: 'P2', suggestedTrade: TRADE.CARPENTER } },
      { value: 'wont_close', label: 'It will not close or latch', action: { setPriority: 'P2', suggestedTrade: TRADE.CARPENTER } },
      { value: 'drafty', label: 'Draft, gap, or weather-stripping problem', action: { setPriority: 'P3', suggestedTrade: TRADE.CARPENTER } },
      { value: 'sticking', label: 'Sticking or hard to open', action: { setPriority: 'P3', suggestedTrade: TRADE.CARPENTER } },
      { value: 'buzzer_fob', label: 'Buzzer, fob, or keypad not working', action: { setPriority: 'P3' } },
      opt('other', 'Something else'),
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: DOOR.PROBLEM, op: 'eq', value: 'break_in' }, text: 'If this just happened, or you think someone may still be on the property, call 911 first. Then call us at 506 204 8440.' },
      { level: 'warning', when: { questionId: DOOR.PROBLEM, op: 'eq', value: 'drafty' }, text: 'In cold weather a gap in an exterior wall can freeze nearby pipes. Tell us below if you have noticed cold spots or a drop in water pressure.' },
    ],
    next: [{ goto: DOOR.SECURE }],
  },

  {
    id: DOOR.SECURE,
    section: 'issue',
    text: 'Can the unit be locked and secured right now?',
    inputType: 'single_choice',
    visibleIf: { questionId: DOOR.WHICH, op: 'in', value: EXTERIOR_DOORS },
    options: [
      { value: 'no_unsecured', label: 'No — the unit cannot be locked', action: { setPriority: 'P1', emergency: true, emergencyType: 'Unit cannot be secured', safetyFlags: [FLAG.UNIT_NOT_SECURE] } },
      { value: 'temporarily', label: 'Only temporarily, or with difficulty', action: { setPriority: 'P2', safetyFlags: [FLAG.UNIT_SECURITY_REDUCED] } },
      { value: 'yes', label: 'Yes, it is secure' },
      { value: 'unsure', label: 'Unsure', action: { setPriority: 'P2', safetyFlags: [FLAG.UNIT_SECURITY_REDUCED] } },
    ],
    safetyMessages: [
      { level: 'danger', when: { questionId: DOOR.SECURE, op: 'eq', value: 'no_unsecured' }, text: 'A unit that cannot be locked is treated as an emergency. Call us at 506 204 8440 so we can arrange a same-day board-up or lock change.' },
    ],
    // Skippable — needs an unconditional rule.
    next: [{ goto: QID.ISSUE_DETAIL }],
  },
]
