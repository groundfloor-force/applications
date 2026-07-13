import { describe, it, expect } from 'vitest'
import { startSession } from '../engine'
import { evaluateSeverity } from '../priority-rules'
import { buildRequestPayload } from '../request'
import { waterLeakWorkflowV1 as wf } from '../workflows/water-leak-v1'
import { APPL, APPLIANCE } from '../workflows/appliance-v1'
import { QID, CATEGORY } from '../ids'
import { drive, step } from './helpers'

describe('appliance intake', () => {
  it('gas smell → P1 emergency, gas trade, and skips diagnostics', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.APPLIANCE) // → q_appl_which
    s = step(wf, s, APPLIANCE.STOVE) // → q_appl_safety
    expect(s.currentQuestionId).toBe(APPL.SAFETY)
    s = step(wf, s, 'gas_smell') // → gas stop (no problem diagnostics)
    expect(s.currentQuestionId).toBe(APPL.GAS_STOP)
    s = step(wf, s, 'yes') // → straight to media

    const sev = evaluateSeverity(s.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyFlag).toBe(true)
    expect(sev.emergencyType).toBe('Gas smell')
    expect(sev.suggestedTrade).toBe('Gas-qualified technician')
    // The problem question was never asked.
    expect(s.answers[APPL.PROBLEM]).toBeUndefined()
    expect(s.currentQuestionId).toBe(QID.MEDIA)
  })

  it('fridge leak that cannot be stopped → P1, appliance+plumber', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.APPLIANCE,
      [APPL.WHICH]: APPLIANCE.FRIDGE,
      [APPL.SAFETY]: 'none',
      [APPL.PROBLEM]: 'leaking',
      [APPL.LEAK_ACTIVE]: 'uncontrolled',
    })
    expect(done.completed).toBe(true)
    const sev = evaluateSeverity(done.answers, wf)
    expect(sev.priority).toBe('P1')
    expect(sev.emergencyFlag).toBe(true)
    expect(sev.suggestedTrade).toBe('Appliance technician (possibly plumber)')
    // Went through the shared leak sub-flow.
    expect(done.path).toContain(APPL.LEAK_WHERE)
    expect(done.path).toContain(APPL.LEAK_SHUTOFF)
  })

  it('routine fridge "not cooling" is P3 and reaches submission via the catch-all', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.APPLIANCE,
      [APPL.WHICH]: APPLIANCE.FRIDGE,
      [APPL.SAFETY]: 'none',
      [APPL.PROBLEM]: 'not_cooling',
      [APPL.SYMPTOM_DETAIL]: 'Fridge is warm inside but the light works.',
    })
    expect(done.completed).toBe(true)
    expect(done.path).toContain(APPL.SYMPTOM_DETAIL)
    expect(done.path).toContain(APPL.USABILITY)

    const payload = buildRequestPayload(wf, done)
    expect(payload.priority).toBe('P3')
    expect(payload.category).toBe('Appliance')
    expect(payload.issueType).toBe('Refrigerator')
    expect(payload.suggestedTrade).toBe('Appliance Technician')
    expect(payload.summary.toLowerCase()).toContain('refrigerator')
  })

  it('gas/electric question only shows for stove and dryer', () => {
    const fridge = drive(wf, {
      [QID.CATEGORY]: CATEGORY.APPLIANCE,
      [APPL.WHICH]: APPLIANCE.FRIDGE,
      [APPL.SAFETY]: 'none',
      [APPL.PROBLEM]: 'no_power',
      [APPL.SYMPTOM_DETAIL]: 'No lights, nothing.',
    })
    expect(fridge.path).not.toContain(APPL.FUEL)

    let s = startSession(wf)
    s = step(wf, s, CATEGORY.APPLIANCE)
    s = step(wf, s, APPLIANCE.DRYER)
    s = step(wf, s, 'none') // safety → should reach the fuel question
    expect(s.currentQuestionId).toBe(APPL.FUEL)
  })
})
