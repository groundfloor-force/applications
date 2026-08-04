// ─────────────────────────────────────────────────────────────────────────────
// Pests & insects.
//
//   what kind → where → how much are you seeing → shared issue detail →
//   photos + contact tail
//
// Bedbugs and rodents are flagged specifically: bedbugs need their own treatment
// protocol and usually mean inspecting neighbouring units, and rodents mean
// sealing entry points rather than just baiting. Both get coordinator review
// rather than a straight work order.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID, FLAG } from '../ids'
import { opt, TRADE } from './shared'

export const PEST = {
  WHAT: 'q_pest_what',
  WHERE: 'q_pest_where',
  EXTENT: 'q_pest_extent',
} as const

export const pestQuestions: Question[] = [
  {
    id: PEST.WHAT,
    section: 'issue',
    text: 'What are you seeing?',
    inputType: 'single_choice',
    options: [
      { value: 'rodents', label: 'Mice or rats', action: { setPriority: 'P2', safetyFlags: [FLAG.RODENTS], coordinatorReview: true, suggestedTrade: TRADE.PEST } },
      { value: 'bedbugs', label: 'Bedbugs', action: { setPriority: 'P2', safetyFlags: [FLAG.BEDBUGS], coordinatorReview: true, suggestedTrade: TRADE.PEST } },
      { value: 'cockroaches', label: 'Cockroaches', action: { setPriority: 'P2', coordinatorReview: true, suggestedTrade: TRADE.PEST } },
      { value: 'wasps', label: 'Wasps, hornets, or a nest', action: { setPriority: 'P2', suggestedTrade: TRADE.PEST } },
      { value: 'ants', label: 'Ants', action: { setPriority: 'P3', suggestedTrade: TRADE.PEST } },
      { value: 'flies_other', label: 'Flies or other insects', action: { setPriority: 'P3', suggestedTrade: TRADE.PEST } },
      { value: 'unsure', label: 'I am not sure what it is', action: { setPriority: 'P3', suggestedTrade: TRADE.PEST } },
    ],
    safetyMessages: [
      { level: 'warning', when: { questionId: PEST.WHAT, op: 'eq', value: 'bedbugs' }, text: 'Please do not move mattresses, bedding, or furniture to another room — that spreads them. Leave everything where it is until the technician has inspected.' },
      { level: 'warning', when: { questionId: PEST.WHAT, op: 'eq', value: 'wasps' }, text: 'Do not try to remove a nest yourself. Keep clear of it, and tell us below if anyone in the home has a sting allergy.' },
    ],
    next: [{ goto: PEST.WHERE }],
  },

  {
    id: PEST.WHERE,
    section: 'issue',
    text: 'Where are you seeing them?',
    inputType: 'single_choice',
    options: [
      opt('kitchen', 'Kitchen'),
      opt('bathroom', 'Bathroom'),
      opt('bedroom', 'Bedroom'),
      opt('living_area', 'Living area'),
      opt('basement', 'Basement or crawl space'),
      opt('attic', 'Attic'),
      { value: 'whole_unit', label: 'Throughout the unit', action: { setPriority: 'P2' } },
      opt('exterior', 'Outside the building only'),
    ],
    next: [{ goto: PEST.EXTENT }],
  },

  {
    id: PEST.EXTENT,
    section: 'issue',
    text: 'How much are you seeing?',
    inputType: 'single_choice',
    options: [
      opt('signs_only', 'Signs only — droppings, damage, or bites, but nothing seen'),
      opt('once', 'Seen once'),
      opt('regularly', 'Seen every few days'),
      { value: 'daily', label: 'Seeing them every day', action: { setPriority: 'P2' } },
    ],
    next: [{ goto: QID.ISSUE_DETAIL }],
  },
]
