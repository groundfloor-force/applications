import { describe, it, expect } from 'vitest'
import { startSession } from '../engine'
import { evaluateSeverity } from '../priority-rules'
import { buildRequestPayload } from '../request'
import { maintenanceIntakeWorkflow as wf } from '../workflows'
import { ELEC } from '../workflows/electrical-v1'
import { QID, CATEGORY, FLAG } from '../ids'
import { drive, step } from './helpers'

const base = { [QID.CATEGORY]: CATEGORY.ELECTRICAL }

describe('electrical intake', () => {
  it('sparks → P1 emergency, hazard stop, no diagnostics', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.ELECTRICAL)
    s = step(wf, s, 'sparks')
    expect(s.currentQuestionId).toBe(ELEC.HAZARD_STOP)
    s = step(wf, s, 'yes')
    expect(s.currentQuestionId).toBe(QID.MEDIA)

    const sev = evaluateSeverity(s.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyType).toBe('Electrical sparks')
    expect(sev.safetyFlags).toContain(FLAG.ELECTRICAL_SPARKS)
    expect(s.answers[ELEC.BREAKER]).toBeUndefined()
  })

  it('water in an outlet dispatches a plumber AND an electrician', () => {
    // Guards the ordering in priority-rules.ts: `tradeFromAction` is applied
    // last, so this option must deliberately name no trade of its own.
    const done = drive(wf, { ...base, [ELEC.PROBLEM]: 'water_on_electrical' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.safetyFlags).toContain(FLAG.WATER_NEAR_ELECTRICAL)
    expect(sev.suggestedTrade).toBe('Plumber + Electrician')
    expect(sev.priority).toBe('P1')
  })

  it('a breaker that trips again after a reset is P2', () => {
    const done = drive(wf, { ...base, [ELEC.PROBLEM]: 'breaker_trips', [ELEC.BREAKER]: 'reset_tripped_again' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.BREAKER_TRIPS)
  })

  it('total power loss that takes the heat with it escalates to P1', () => {
    const done = drive(wf, {
      ...base,
      [ELEC.PROBLEM]: 'no_power_whole',
      [ELEC.POWER_SCOPE]: 'just_my_unit',
      [ELEC.HEAT_AFFECTED]: 'yes_cold',
    })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyFlag).toBe(true)
    expect(sev.emergencyType).toBe('No heat')
    expect(sev.safetyFlags).toContain(FLAG.NO_HEAT_HABITABILITY)
  })

  it('total power loss with the unit still comfortable stays P2', () => {
    const done = drive(wf, {
      ...base,
      [ELEC.PROBLEM]: 'no_power_whole',
      [ELEC.POWER_SCOPE]: 'just_my_unit',
      [ELEC.HEAT_AFFECTED]: 'yes_ok',
    })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.emergencyFlag).toBe(false)
  })

  it('an area-wide outage is flagged rather than dispatched as urgent', () => {
    const done = drive(wf, {
      ...base,
      [ELEC.PROBLEM]: 'no_power_whole',
      [ELEC.POWER_SCOPE]: 'street_area',
      [ELEC.HEAT_AFFECTED]: 'no',
    })
    expect(evaluateSeverity(done.answers, wf).safetyFlags).toContain(FLAG.AREA_POWER_OUTAGE)
  })

  it('skips the heat question for a partial outage', () => {
    const done = drive(wf, { ...base, [ELEC.PROBLEM]: 'no_power_partial' })
    expect(done.path).not.toContain(ELEC.HEAT_AFFECTED)
    expect(done.path).toContain(ELEC.BREAKER)
    expect(done.completed).toBe(true)
  })

  it('a dead outlet is routine work for an electrician', () => {
    const done = drive(wf, { ...base, [ELEC.PROBLEM]: 'outlet_switch' })
    const payload = buildRequestPayload(wf, done)
    expect(payload.priority).toBe('P3')
    expect(payload.suggestedTrade).toBe('Electrician')
    expect(payload.issueType).toBe('An outlet or switch is not working')
  })

  it('a non-working smoke alarm is P2', () => {
    const done = drive(wf, { ...base, [ELEC.PROBLEM]: 'smoke_alarm' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.ALARM_INOPERATIVE)
  })
})
