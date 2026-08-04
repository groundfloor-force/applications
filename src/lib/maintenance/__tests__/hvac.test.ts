import { describe, it, expect } from 'vitest'
import { startSession } from '../engine'
import { evaluateSeverity } from '../priority-rules'
import { buildRequestPayload } from '../request'
import { maintenanceIntakeWorkflow as wf } from '../workflows'
import { HVACQ } from '../workflows/hvac-v1'
import { QID, CATEGORY, FLAG } from '../ids'
import { drive, step } from './helpers'

const base = { [QID.CATEGORY]: CATEGORY.HVAC }

describe('HVAC intake', () => {
  it('no heat that is unsafely cold → P1 emergency', () => {
    const done = drive(wf, {
      ...base,
      [HVACQ.PROBLEM]: 'no_heat',
      [HVACQ.SYSTEM]: 'forced_air_furnace',
      [HVACQ.SEVERITY]: 'heat_unsafe',
    })
    expect(done.completed).toBe(true)
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyFlag).toBe(true)
    expect(sev.emergencyType).toBe('No heat')
    expect(sev.safetyFlags).toContain(FLAG.NO_HEAT_HABITABILITY)
    expect(sev.suggestedTrade).toBe('HVAC Technician')
  })

  it('no heat with a frozen-pipe worry also flags damage risk', () => {
    const done = drive(wf, {
      ...base,
      [HVACQ.PROBLEM]: 'no_heat',
      [HVACQ.SEVERITY]: 'heat_pipes',
    })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.safetyFlags).toContain(FLAG.FROZEN_PIPES)
    expect(sev.damageRisk).toBe('high')
  })

  it('no heat that is manageable is P2, not an emergency', () => {
    const done = drive(wf, { ...base, [HVACQ.PROBLEM]: 'no_heat', [HVACQ.SEVERITY]: 'heat_cold' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.emergencyFlag).toBe(false)
  })

  it('CO alarm short-circuits to the hazard stop and skips diagnostics', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.HVAC)
    s = step(wf, s, 'co_alarm')
    expect(s.currentQuestionId).toBe(HVACQ.HAZARD_STOP)
    s = step(wf, s, 'yes')
    expect(s.currentQuestionId).toBe(QID.MEDIA)

    const sev = evaluateSeverity(s.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyType).toBe('Carbon monoxide alarm')
    expect(sev.safetyFlags).toContain(FLAG.CARBON_MONOXIDE)
    // Diagnostics were never asked.
    expect(s.answers[HVACQ.SYSTEM]).toBeUndefined()
    expect(s.answers[HVACQ.SEVERITY]).toBeUndefined()
    expect(s.answers[HVACQ.SCOPE]).toBeUndefined()
  })

  it('a fuel-oil / gas smell routes to the gas trade', () => {
    const done = drive(wf, { ...base, [HVACQ.PROBLEM]: 'gas_smell' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.emergencyType).toBe('Gas smell')
    expect(sev.suggestedTrade).toBe('Gas-qualified technician')
  })

  it('no cooling with a vulnerable occupant is P2', () => {
    const done = drive(wf, { ...base, [HVACQ.PROBLEM]: 'no_cooling', [HVACQ.SEVERITY]: 'cool_vulnerable' })
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P2')
    expect(sev.safetyFlags).toContain(FLAG.HEAT_VULNERABLE_OCCUPANT)
  })

  it('no cooling that is only mild stays P3', () => {
    const done = drive(wf, { ...base, [HVACQ.PROBLEM]: 'no_cooling', [HVACQ.SEVERITY]: 'cool_mild' })
    expect(evaluateSeverity(done.answers, wf).priority).toBe('P3')
  })

  it('skips the severity question for symptoms it does not apply to', () => {
    const done = drive(wf, { ...base, [HVACQ.PROBLEM]: 'thermostat' })
    expect(done.path).not.toContain(HVACQ.SEVERITY)
    // The skippable question still hands off correctly.
    expect(done.path).toContain(HVACQ.SCOPE)
    expect(done.completed).toBe(true)
  })

  it('reports the specific symptom as the issue type', () => {
    const done = drive(wf, { ...base, [HVACQ.PROBLEM]: 'no_heat', [HVACQ.SEVERITY]: 'heat_cold' })
    const payload = buildRequestPayload(wf, done)
    expect(payload.category).toBe('Heating or cooling')
    expect(payload.issueType).toBe('No heat at all')
    expect(payload.summary).toContain('No heat at all')
  })
})
