import { describe, it, expect } from 'vitest'
import { evaluateSeverity } from '../priority-rules'
import { evalPredicate } from '../conditions'
import { waterLeakWorkflowV1 as wf } from '../workflows/water-leak-v1'
import {
  QID,
  CATEGORY,
  PLUMBING_TYPE,
  WATER_FLOW,
  LEAK_AMOUNT,
  YNU,
  CEILING_RISK,
} from '../ids'
import type { AnswerMap } from '../types'

const leakBase = {
  [QID.CATEGORY]: CATEGORY.PLUMBING,
  [QID.PLUMBING_TYPE]: PLUMBING_TYPE.LEAK,
}

describe('priority rules', () => {
  it('1. uncontrolled sink leak becomes P1 Emergency', () => {
    const a: AnswerMap = { ...leakBase, [QID.WATER_FLOW]: WATER_FLOW.UNCONTROLLED, [QID.LEAK_SOURCE]: 'kitchen_sink' }
    const s = evaluateSeverity(a)
    expect(s.priority).toBe('P1')
    expect(s.emergencyFlag).toBe(true)
    expect(s.emergencyType).toBe('Uncontrolled Water')
  })

  it('2. contained sink leak becomes P2 Urgent', () => {
    const a: AnswerMap = { ...leakBase, [QID.WATER_FLOW]: WATER_FLOW.CONTAINED, [QID.LEAK_SOURCE]: 'kitchen_sink' }
    const s = evaluateSeverity(a)
    expect(s.priority).toBe('P2')
    expect(s.emergencyFlag).toBe(false)
  })

  it('3. slow leak only when used becomes P3 Standard', () => {
    const a: AnswerMap = { ...leakBase, [QID.WATER_FLOW]: WATER_FLOW.WHEN_USED, [QID.LEAK_AMOUNT]: LEAK_AMOUNT.SLOW_DRIP }
    expect(evaluateSeverity(a).priority).toBe('P3')
  })

  it('4. large leak only when used becomes P2 Urgent', () => {
    const a: AnswerMap = { ...leakBase, [QID.WATER_FLOW]: WATER_FLOW.WHEN_USED, [QID.LEAK_AMOUNT]: LEAK_AMOUNT.LARGE }
    expect(evaluateSeverity(a).priority).toBe('P2')
  })

  it('5. water near electricity creates a safety flag (and forces P1)', () => {
    const a: AnswerMap = { ...leakBase, [QID.WATER_FLOW]: WATER_FLOW.UNCONTROLLED, [QID.NEAR_ELECTRICAL]: YNU.YES }
    const s = evaluateSeverity(a)
    expect(s.safetyFlags).toContain('water_near_electrical')
    expect(s.priority).toBe('P1')
    expect(s.emergencyFlag).toBe(true)
  })

  it('6. sagging ceiling creates a safety flag and a warning message', () => {
    const a: AnswerMap = { ...leakBase, [QID.WATER_FLOW]: WATER_FLOW.DAMAGE_ONLY, [QID.CEILING_RISK]: CEILING_RISK.YES }
    const s = evaluateSeverity(a)
    expect(s.safetyFlags).toContain('ceiling_collapse_risk')
    expect(s.damageRisk).toBe('high')

    // The config carries the matching safety warning for this answer.
    const ceilingQ = wf.questions.find((q) => q.id === QID.CEILING_RISK)!
    const warning = ceilingQ.safetyMessages?.find((m) => m.when && evalPredicate(m.when, a))
    expect(warning).toBeTruthy()
    expect(warning!.text).toMatch(/sagging|damaged ceiling/i)
  })
})
