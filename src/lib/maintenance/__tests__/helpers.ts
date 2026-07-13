import type { AnswerMap, AnswerValue, WorkflowDefinition } from '../types'
import { answer, currentQuestion, resolveOptions, startSession, UNSAFE_SKIP } from '../engine'
import type { EngineState } from '../types'

/** Answer whatever question is current, then advance. Throws on validation error. */
export function step(
  wf: WorkflowDefinition,
  state: EngineState,
  value: AnswerValue,
): EngineState {
  const res = answer(wf, state, value)
  if (res.error) throw new Error(`answer rejected for ${state.currentQuestionId}: ${res.error}`)
  return res.state
}

/**
 * Drive a session to completion. For each question, use `provided[qid]` if
 * present, otherwise pick a sensible valid default for the input type.
 */
export function drive(
  wf: WorkflowDefinition,
  provided: Record<string, AnswerValue> = {},
  start?: EngineState,
): EngineState {
  let state = start ?? startSession(wf)
  let guard = 0
  while (!state.completed && guard++ < 200) {
    const q = currentQuestion(wf, state)
    if (!q) break
    let value: AnswerValue
    if (q.id in provided) {
      value = provided[q.id]
    } else if (q.optional) {
      value = ''
    } else {
      switch (q.inputType) {
        case 'single_choice':
        case 'yes_no': {
          value = resolveOptions(wf, q, state.answers)[0]?.value ?? ''
          break
        }
        case 'multi_choice':
          value = [resolveOptions(wf, q, state.answers)[0]?.value ?? '']
          break
        case 'email':
          value = 'tenant@example.com'
          break
        case 'phone':
          value = '5195551234'
          break
        case 'photo':
        case 'video':
          value = q.media?.allowUnsafeSkip ? UNSAFE_SKIP : ['photo1.jpg']
          break
        default:
          value = 'test answer'
      }
    }
    state = step(wf, state, value)
  }
  return state
}

export function answersOf(state: EngineState): AnswerMap {
  return state.answers
}
