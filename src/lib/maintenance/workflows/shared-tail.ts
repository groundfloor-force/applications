// ─────────────────────────────────────────────────────────────────────────────
// The shared tail every path converges on: photos → contact → property →
// access → comments. This run IS order-dependent — most of these questions have
// no `next` rule and rely on array-order fallthrough — so `tailQuestions` must
// stay contiguous and in this order in the composed workflow.
//
// `catchAllQuestions` sits immediately before it: the free-text landing spot for
// anything the guided intake doesn't cover yet.
// ─────────────────────────────────────────────────────────────────────────────

import type { Question } from '../types'
import { QID } from '../ids'
import { opt, YES_NO } from './shared'

export const catchAllQuestions: Question[] = [
  // Where every guided category flow ends. Optional — the guided answers
  // already carry the substance, this is just anything they missed.
  {
    id: QID.ISSUE_DETAIL,
    section: 'issue',
    text: 'Anything else we should know about the problem?',
    helpText:
      'When it started, anything you have already tried, and anything else that helps us send the ' +
      'right person.',
    inputType: 'long_text',
    optional: true,
    validation: { maxLength: 2000 },
    next: [{ goto: QID.MEDIA }],
  },

  // The landing spot for anything the guided intake does not cover yet. Reached
  // only via the unconditional default rules on q_category / q_plumbing_type,
  // so its presence in a submission is a signal that a category needs work.
  {
    id: QID.FALLBACK_DESC,
    section: 'issue',
    text: 'Please describe the issue.',
    helpText:
      'This issue type is not available in the guided intake yet. Tell us what is happening and we will ' +
      'still create a maintenance request.',
    inputType: 'long_text',
    validation: { minLength: 5, maxLength: 2000, message: 'Please add a little more detail.' },
    next: [{ goto: QID.MEDIA }],
  },
]

export const tailQuestions: Question[] = [
  // ── media ──────────────────────────────────────────────────────────────────
  {
    id: QID.MEDIA,
    section: 'media',
    text: 'Add photos of the issue',
    helpText:
      'Photos help us send the right person with the right parts. For an appliance, a photo of the ' +
      'model/serial label helps too. Add at least one, or mark that it is not safe to take a photo.',
    inputType: 'photo',
    media: { required: true, minCount: 1, allowUnsafeSkip: true },
    // → q_name (array order)
  },

  // ── contact ────────────────────────────────────────────────────────────────
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

  // ── property ───────────────────────────────────────────────────────────────
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

  // ── access ─────────────────────────────────────────────────────────────────
  {
    id: QID.SOMEONE_HOME,
    section: 'access',
    text: 'Is someone currently at the property?',
    inputType: 'single_choice',
    options: YES_NO,
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

  // ── comments (last question → END) ─────────────────────────────────────────
  { id: QID.COMMENTS, section: 'comments', text: 'Anything else you would like to add?', inputType: 'long_text', optional: true, next: [{ goto: 'END' }] },
]
