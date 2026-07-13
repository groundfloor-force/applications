import { describe, it, expect } from 'vitest'
import {
  startSession,
  answer,
  goBack,
  editAnswer,
  reviseAnswer,
  serialize,
  deserialize,
} from '../engine'
import { buildRequestPayload } from '../request'
import { waterLeakWorkflowV1 as wf } from '../workflows/water-leak-v1'
import { QID, CATEGORY, PLUMBING_TYPE, WATER_FLOW } from '../ids'
import { drive, step } from './helpers'

describe('question engine navigation', () => {
  it('7. user can go backward and change an answer', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.PLUMBING) // → plumbing_type
    s = step(wf, s, PLUMBING_TYPE.LEAK) // → water_flow
    expect(s.currentQuestionId).toBe(QID.WATER_FLOW)

    s = goBack(wf, s) // back to plumbing_type
    expect(s.currentQuestionId).toBe(QID.PLUMBING_TYPE)

    // Change plumbing_type to a non-leak option → routes to the fallback flow.
    s = step(wf, s, PLUMBING_TYPE.CLOG)
    expect(s.currentQuestionId).toBe(QID.FALLBACK_DESC)
    expect(s.answers[QID.WATER_FLOW]).toBeUndefined()
  })

  it('8. changing an earlier answer removes invalid downstream answers', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.PLUMBING)
    s = step(wf, s, PLUMBING_TYPE.LEAK)
    s = step(wf, s, WATER_FLOW.WHEN_USED) // → fixture (branch 3)
    s = step(wf, s, 'kitchen_sink') // fixture → leak_location
    expect(s.currentQuestionId).toBe(QID.LEAK_LOCATION)
    expect(s.answers[QID.FIXTURE]).toBe('kitchen_sink')

    // Jump back and change the water status to "contained".
    s = editAnswer(wf, s, QID.WATER_FLOW)
    s = step(wf, s, WATER_FLOW.CONTAINED)

    // Branch-3 answers are gone, and we're now on the contained branch.
    expect(s.answers[QID.FIXTURE]).toBeUndefined()
    expect(s.answers[QID.LEAK_LOCATION]).toBeUndefined()
    expect(s.currentQuestionId).toBe(QID.LEAK_SOURCE)
  })

  it('9. a refreshed session resumes correctly', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.PLUMBING)
    s = step(wf, s, PLUMBING_TYPE.LEAK)
    s = step(wf, s, WATER_FLOW.CONTAINED) // → leak_source

    // Simulate a page refresh: serialise to storage and rehydrate.
    const restored = deserialize(serialize(s))
    expect(restored.currentQuestionId).toBe(s.currentQuestionId)
    expect(restored.answers).toEqual(s.answers)

    // Continuing from the restored state completes normally.
    const done = drive(wf, {}, restored)
    expect(done.completed).toBe(true)
    expect(done.answers[QID.PLUMBING_TYPE]).toBe(PLUMBING_TYPE.LEAK)
  })

  it('12. a basic non-plumbing request can still be submitted', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.ELECTRICAL,
      [QID.FALLBACK_DESC]: 'No power in the kitchen outlets since this morning.',
    })
    expect(done.completed).toBe(true)

    const payload = buildRequestPayload(wf, done)
    expect(payload.category).toBe('Electrical')
    expect(payload.qaHistory.length).toBeGreaterThan(0)
    expect(payload.description).toContain('No power')
    // Non-emergency electrical routes to the standard queue.
    expect(payload.priority).toBe('P3')
    expect(payload.suggestedTrade).toBe('Electrician')
  })

  it('uncontrolled branch skips low-priority diagnostics and reaches media', () => {
    let s = startSession(wf)
    s = step(wf, s, CATEGORY.PLUMBING)
    s = step(wf, s, PLUMBING_TYPE.LEAK)
    s = step(wf, s, WATER_FLOW.UNCONTROLLED) // → near_electrical
    expect(s.currentQuestionId).toBe(QID.NEAR_ELECTRICAL)
    s = step(wf, s, 'no') // → leak_source
    expect(s.currentQuestionId).toBe(QID.LEAK_SOURCE)
    s = step(wf, s, 'kitchen_sink') // uncontrolled → straight to media
    expect(s.currentQuestionId).toBe(QID.MEDIA)
  })

  it('rejects an invalid answer without advancing', () => {
    const s = startSession(wf)
    const res = answer(wf, s, 'not_a_real_option')
    expect(res.error).toBeTruthy()
    expect(res.state.currentQuestionId).toBe(QID.CATEGORY)
  })

  it('reviseAnswer keeps downstream answers when the branch is unchanged', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.LEAK,
      [QID.WATER_FLOW]: WATER_FLOW.CONTAINED,
      [QID.NAME]: 'Jordan Tenant',
      [QID.EMAIL]: 'jordan@example.com',
    })
    expect(done.completed).toBe(true)

    // Editing the name (non-branching) must NOT wipe the email collected later.
    const res = reviseAnswer(wf, done, QID.NAME, 'Jordan Renter')
    expect(res.error).toBeUndefined()
    expect(res.state.answers[QID.NAME]).toBe('Jordan Renter')
    expect(res.state.answers[QID.EMAIL]).toBe('jordan@example.com')
    expect(res.state.completed).toBe(true) // still at review
  })

  it('reviseAnswer re-walks and prunes when the branch diverges', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.LEAK,
      [QID.WATER_FLOW]: WATER_FLOW.CONTAINED,
    })
    expect(done.answers[QID.CONTAINMENT]).toBeDefined()

    // Change water status to "when used" → contained-branch answers must drop.
    const res = reviseAnswer(wf, done, QID.WATER_FLOW, WATER_FLOW.WHEN_USED)
    expect(res.state.answers[QID.CONTAINMENT]).toBeUndefined()
    expect(res.state.completed).toBe(false)
    expect(res.state.currentQuestionId).toBe(QID.FIXTURE)
  })

  it('pet-details question is skipped when there are no pets', () => {
    const done = drive(wf, {
      [QID.CATEGORY]: CATEGORY.PLUMBING,
      [QID.PLUMBING_TYPE]: PLUMBING_TYPE.LEAK,
      [QID.WATER_FLOW]: WATER_FLOW.CONTAINED,
      [QID.PETS]: 'no',
    })
    expect(done.path).not.toContain(QID.PET_DETAILS)
    expect(done.completed).toBe(true)
  })
})
