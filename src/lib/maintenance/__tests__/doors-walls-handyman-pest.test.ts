import { describe, it, expect } from 'vitest'
import { evaluateSeverity } from '../priority-rules'
import { buildRequestPayload } from '../request'
import { maintenanceIntakeWorkflow as wf } from '../workflows'
import { DOOR } from '../workflows/door-lock-v1'
import { WALL } from '../workflows/walls-ceilings-v1'
import { HAND } from '../workflows/handyman-v1'
import { PEST } from '../workflows/pest-v1'
import { QID, CATEGORY, CEILING_RISK, FLAG } from '../ids'
import { drive } from './helpers'

describe('doors & locks', () => {
  const base = { [QID.CATEGORY]: CATEGORY.DOOR_LOCK }

  it('break-in damage is a P1 emergency', () => {
    const done = drive(wf, { ...base, [DOOR.WHICH]: 'exterior_entry', [DOOR.PROBLEM]: 'break_in', [DOOR.SECURE]: 'no_unsecured' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyFlag).toBe(true)
    expect(sev.safetyFlags).toEqual(expect.arrayContaining([FLAG.BREAK_IN, FLAG.UNIT_NOT_SECURE]))
    expect(sev.suggestedTrade).toBe('Locksmith')
  })

  it('a broken lock on an exterior door that cannot be secured is P1', () => {
    const done = drive(wf, { ...base, [DOOR.WHICH]: 'exterior_entry', [DOOR.PROBLEM]: 'wont_lock', [DOOR.SECURE]: 'no_unsecured' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyType).toBe('Unit cannot be secured')
  })

  it('the same broken lock is only P2 when the unit still locks', () => {
    const done = drive(wf, { ...base, [DOOR.WHICH]: 'exterior_entry', [DOOR.PROBLEM]: 'wont_lock', [DOOR.SECURE]: 'yes' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.emergencyFlag).toBe(false)
  })

  it('an interior door never asks whether the unit is secure', () => {
    const done = drive(wf, { ...base, [DOOR.WHICH]: 'interior', [DOOR.PROBLEM]: 'sticking' })
    expect(done.path).not.toContain(DOOR.SECURE)
    expect(done.completed).toBe(true)
    expect(evaluateSeverity(done.answers, wf).priority).toBe('P3')
  })

  it('a lockout goes straight to the detail question', () => {
    const done = drive(wf, { ...base, [DOOR.WHICH]: 'exterior_entry', [DOOR.PROBLEM]: 'locked_out' })
    expect(done.path).not.toContain(DOOR.SECURE)
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.TENANT_LOCKED_OUT)
  })
})

describe('walls & ceilings', () => {
  const base = { [QID.CATEGORY]: CATEGORY.WALLS_CEILINGS }

  it('a fallen ceiling with an injury is a P1 emergency', () => {
    const done = drive(wf, { ...base, [WALL.WHAT]: 'ceiling_fallen', [WALL.SAFETY]: 'someone_hurt' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyType).toBe('Ceiling collapse') // earliest emergency wins
    expect(sev.safetyFlags).toEqual(expect.arrayContaining([FLAG.CEILING_COLLAPSE, FLAG.INJURY]))
    expect(done.path).toContain(WALL.SAFETY)
  })

  it('a water stain hands off to the leak module damage branch', () => {
    const done = drive(wf, {
      ...base,
      [WALL.WHAT]: 'water_stain',
      [QID.DAMAGE_LOCATION]: 'ceiling',
      [QID.CEILING_RISK]: CEILING_RISK.YES,
    })
    expect(done.path).toEqual(expect.arrayContaining([QID.DAMAGE_LOCATION, QID.DAMAGE_WET, QID.CEILING_RISK]))
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.safetyFlags).toContain(FLAG.CEILING_COLLAPSE_RISK)

    // The widened summary gate gives it the leak prose rather than the generic one.
    const payload = buildRequestPayload(wf, done)
    expect(payload.summary.toLowerCase()).toContain('water damage')
  })

  it('mold is flagged for coordinator review', () => {
    const done = drive(wf, { ...base, [WALL.WHAT]: 'mold' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.coordinatorReview).toBe(true)
    expect(sev.safetyFlags).toContain(FLAG.POSSIBLE_MOLD)
  })

  it('a hole through to the outside escalates to P2', () => {
    const done = drive(wf, { ...base, [WALL.WHAT]: 'hole_damage', [WALL.EXTERIOR]: 'yes' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.EXTERIOR_BREACH)
  })

  it('an interior-only hole is routine drywall work', () => {
    const done = drive(wf, { ...base, [WALL.WHAT]: 'hole_damage', [WALL.EXTERIOR]: 'no' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P3')
    expect(sev.suggestedTrade).toBe('Drywall / plaster repair')
  })

  it('skips the exterior question for a sagging ceiling', () => {
    const done = drive(wf, { ...base, [WALL.WHAT]: 'ceiling_sagging' })
    expect(done.path).not.toContain(WALL.EXTERIOR)
    expect(done.completed).toBe(true)
  })
})

describe('handyman', () => {
  const base = { [QID.CATEGORY]: CATEGORY.HANDYMAN }

  it('a job that blocks use of the home is P2', () => {
    const done = drive(wf, { ...base, [HAND.WHAT]: 'shelving_closet', [HAND.URGENCY]: 'blocking' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.suggestedTrade).toBe('General Maintenance')
  })

  it('a convenience job stays P3', () => {
    const done = drive(wf, { ...base, [HAND.WHAT]: 'blinds_curtains', [HAND.URGENCY]: 'whenever' })
    expect(evaluateSeverity(done.answers, wf).priority).toBe('P3')
  })

  it('a safety concern is flagged', () => {
    const done = drive(wf, { ...base, [HAND.WHAT]: 'hardware', [HAND.URGENCY]: 'safety' })
    expect(evaluateSeverity(done.answers, wf).safetyFlags).toContain(FLAG.GENERAL_SAFETY_CONCERN)
  })
})

describe('pests', () => {
  const base = { [QID.CATEGORY]: CATEGORY.PESTS }

  it('bedbugs get coordinator review and a pest-control trade', () => {
    const done = drive(wf, { ...base, [PEST.WHAT]: 'bedbugs', [PEST.WHERE]: 'bedroom', [PEST.EXTENT]: 'regularly' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.coordinatorReview).toBe(true)
    expect(sev.safetyFlags).toContain(FLAG.BEDBUGS)
    expect(sev.suggestedTrade).toBe('Pest control')
  })

  it('rodents are flagged and reviewed', () => {
    const done = drive(wf, { ...base, [PEST.WHAT]: 'rodents', [PEST.WHERE]: 'kitchen', [PEST.EXTENT]: 'signs_only' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.RODENTS)
  })

  it('a few ants seen once is routine', () => {
    const done = drive(wf, { ...base, [PEST.WHAT]: 'ants', [PEST.WHERE]: 'kitchen', [PEST.EXTENT]: 'once' })
    const payload = buildRequestPayload(wf, done)
    expect(payload.priority).toBe('P3')
    expect(payload.suggestedTrade).toBe('Pest control')
    expect(payload.issueType).toBe('Ants')
  })

  it('daily sightings escalate to P2', () => {
    const done = drive(wf, { ...base, [PEST.WHAT]: 'ants', [PEST.WHERE]: 'kitchen', [PEST.EXTENT]: 'daily' })
    expect(evaluateSeverity(done.answers, wf).priority).toBe('P2')
  })
})
