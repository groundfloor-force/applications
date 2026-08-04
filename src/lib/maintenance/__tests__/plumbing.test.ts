import { describe, it, expect } from 'vitest'
import { startSession } from '../engine'
import { evaluateSeverity } from '../priority-rules'
import { buildRequestPayload } from '../request'
import { maintenanceIntakeWorkflow as wf } from '../workflows'
import { PLMB } from '../workflows/plumbing-v1'
import { QID, CATEGORY, PLUMBING_TYPE, WATER_FLOW, FLAG } from '../ids'
import { drive, step } from './helpers'

const clog = { [QID.CATEGORY]: CATEGORY.PLUMBING, [QID.PLUMBING_TYPE]: PLUMBING_TYPE.CLOG }

describe('plumbing — clogs', () => {
  it('an overflowing toilet is a P1 emergency', () => {
    const done = drive(wf, { ...clog, [PLMB.CLOG_WHAT]: 'toilet', [PLMB.CLOG_STATE]: 'overflowing', [PLMB.CLOG_SOLE_TOILET]: 'no' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyFlag).toBe(true)
    expect(sev.emergencyType).toBe('Overflowing drain')
    expect(sev.damageRisk).toBe('high')
    expect(sev.suggestedTrade).toBe('Plumber')
  })

  it('a fully blocked sole toilet is P2 and flagged', () => {
    const done = drive(wf, { ...clog, [PLMB.CLOG_WHAT]: 'toilet', [PLMB.CLOG_STATE]: 'fully_blocked', [PLMB.CLOG_SOLE_TOILET]: 'yes' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.SOLE_TOILET)
  })

  it('sewage backing up skips diagnostics and goes straight to photos', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.PLUMBING)
    s = step(wf, s, PLUMBING_TYPE.CLOG)
    s = step(wf, s, 'sewage_backup')
    expect(s.currentQuestionId).toBe(QID.MEDIA)

    const sev = evaluateSeverity(s.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyType).toBe('Sewage backup')
    expect(sev.safetyFlags).toContain(FLAG.SEWAGE_BACKUP)
    expect(s.answers[PLMB.CLOG_STATE]).toBeUndefined()
  })

  it('a slow sink drain is routine', () => {
    const done = drive(wf, { ...clog, [PLMB.CLOG_WHAT]: 'kitchen_sink', [PLMB.CLOG_STATE]: 'slow' })
    expect(evaluateSeverity(done.answers, wf).priority).toBe('P3')
    // The sole-toilet question only applies to toilets.
    expect(done.path).not.toContain(PLMB.CLOG_SOLE_TOILET)
  })
})

describe('plumbing — supply and pressure', () => {
  it('suspected frozen pipes is a P1 emergency with high damage risk', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.NO_WATER,
      [PLMB.SUPPLY_SCOPE]: 'all_taps',
      [PLMB.SUPPLY_CAUSE]: 'frozen_suspected',
    })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyType).toBe('Possible frozen pipes')
    expect(sev.safetyFlags).toContain(FLAG.FROZEN_PIPES)
    expect(sev.damageRisk).toBe('high')
  })

  it('"no hot water" reaches the same supply questions as "no water"', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.NO_HOT_WATER,
      [PLMB.SUPPLY_SCOPE]: 'hot_only',
      [PLMB.SUPPLY_CAUSE]: 'water_heater_issue',
    })
    expect(done.path).toContain(PLMB.SUPPLY_SCOPE)
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.WATER_HEATER)
  })

  it('low pressure walks scope → when → shared cause', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.LOW_PRESSURE,
      [PLMB.PRESSURE_SCOPE]: 'all_fixtures',
      [PLMB.PRESSURE_WHEN]: 'suddenly',
      [PLMB.SUPPLY_CAUSE]: 'none',
    })
    expect(done.path).toEqual(expect.arrayContaining([PLMB.PRESSURE_SCOPE, PLMB.PRESSURE_WHEN, PLMB.SUPPLY_CAUSE]))
    expect(evaluateSeverity(done.answers, wf).priority).toBe('P2')
  })
})

describe('plumbing — broken fixtures', () => {
  it('a leaking fixture hands off to the full leak tree', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.BROKEN_FIXTURE,
      [PLMB.FIXTURE_WHICH]: 'kitchen_faucet',
      [PLMB.FIXTURE_STATE]: 'leaking',
      [QID.WATER_FLOW]: WATER_FLOW.CONTAINED,
    })
    expect(done.path).toContain(QID.WATER_FLOW)
    expect(done.path).toContain(QID.CONTAINMENT)

    // The widened summary gate means the good leak prose still applies.
    const payload = buildRequestPayload(wf, done)
    expect(payload.summary.toLowerCase()).toContain('contained')
    expect(payload.priority).toBe('P2')
  })

  it('a dead sump pump is P2 — that is a flooded basement waiting to happen', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.BROKEN_FIXTURE,
      [PLMB.FIXTURE_WHICH]: 'sump_pump',
      [PLMB.FIXTURE_STATE]: 'wont_turn_on',
    })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.SUMP_PUMP)
  })

  it('a running toilet that will not shut off is P2 with damage risk', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.BROKEN_FIXTURE,
      [PLMB.FIXTURE_WHICH]: 'toilet',
      [PLMB.FIXTURE_STATE]: 'wont_shut_off',
    })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.damageRisk).toBe('moderate')
  })
})
