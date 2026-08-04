// What a coordinator actually reads on the Monday item: the issue type, the
// summary, and the description. Every guided category should produce something
// specific — "No heat at all", not "Heating or cooling".

import { describe, it, expect } from 'vitest'
import { buildRequestPayload } from '../request'
import { maintenanceIntakeWorkflow as wf } from '../workflows'
import { HVACQ } from '../workflows/hvac-v1'
import { ELEC } from '../workflows/electrical-v1'
import { PLMB } from '../workflows/plumbing-v1'
import { DOOR } from '../workflows/door-lock-v1'
import { WALL } from '../workflows/walls-ceilings-v1'
import { HAND } from '../workflows/handyman-v1'
import { PEST } from '../workflows/pest-v1'
import { QID, CATEGORY, PLUMBING_TYPE } from '../ids'
import { drive } from './helpers'

const CASES: { name: string; answers: Record<string, string>; issueType: string; summaryHas: string }[] = [
  {
    name: 'HVAC',
    answers: { [QID.CATEGORY]: CATEGORY.HVAC, [HVACQ.PROBLEM]: 'no_heat', [HVACQ.SEVERITY]: 'heat_cold' },
    issueType: 'No heat at all',
    summaryHas: 'No heat at all',
  },
  {
    name: 'electrical',
    answers: { [QID.CATEGORY]: CATEGORY.ELECTRICAL, [ELEC.PROBLEM]: 'lights' },
    issueType: 'Lights flickering, dimming, or not working',
    summaryHas: 'Lights flickering',
  },
  {
    name: 'plumbing clog',
    answers: {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.CLOG,
      [PLMB.CLOG_WHAT]: 'kitchen_sink',
      [PLMB.CLOG_STATE]: 'slow',
    },
    // Plumbing keeps its own issueType rule (the plumbing type).
    issueType: 'Clog or slow drain',
    summaryHas: 'Kitchen sink',
  },
  {
    name: 'doors & locks',
    answers: { [QID.CATEGORY]: CATEGORY.DOOR_LOCK, [DOOR.WHICH]: 'interior', [DOOR.PROBLEM]: 'sticking' },
    issueType: 'An interior door',
    summaryHas: 'Sticking or hard to open',
  },
  {
    name: 'walls & ceilings',
    answers: { [QID.CATEGORY]: CATEGORY.WALLS_CEILINGS, [WALL.WHAT]: 'peeling' },
    issueType: 'Peeling paint or wallpaper',
    summaryHas: 'Peeling paint',
  },
  {
    name: 'handyman',
    answers: { [QID.CATEGORY]: CATEGORY.HANDYMAN, [HAND.WHAT]: 'assemble', [HAND.URGENCY]: 'soon' },
    issueType: 'Assemble something',
    summaryHas: 'Assemble something',
  },
  {
    name: 'pests',
    answers: { [QID.CATEGORY]: CATEGORY.PESTS, [PEST.WHAT]: 'ants', [PEST.WHERE]: 'kitchen', [PEST.EXTENT]: 'once' },
    issueType: 'Ants',
    summaryHas: 'Ants',
  },
]

describe('request payload per category', () => {
  for (const c of CASES) {
    it(`${c.name}: names the specific symptom`, () => {
      const done = drive(wf, { ...c.answers, [QID.ISSUE_DETAIL]: 'Started on Tuesday.' })
      const payload = buildRequestPayload(wf, done)
      expect(payload.issueType).toBe(c.issueType)
      expect(payload.summary).toContain(c.summaryHas)
      expect(payload.description).toContain('Started on Tuesday.')
    })
  }

  it('calls out the emergency type in the summary', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.DOOR_LOCK,
      [DOOR.WHICH]: 'exterior_entry',
      [DOOR.PROBLEM]: 'break_in',
      [DOOR.SECURE]: 'no_unsecured',
    })
    const payload = buildRequestPayload(wf, done)
    expect(payload.emergencyFlag).toBe(true)
    expect(payload.summary).toContain('Flagged as an emergency: Break-in damage.')
  })

  it('leaves the free-text fallback path unchanged', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.OTHER,
      [QID.FALLBACK_DESC]: 'The hallway light timer is set wrong.',
    })
    const payload = buildRequestPayload(wf, done)
    expect(payload.issueType).toBe('Other')
    expect(payload.summary).toContain('The hallway light timer is set wrong.')
    expect(payload.description).toContain('The hallway light timer is set wrong.')
  })
})
