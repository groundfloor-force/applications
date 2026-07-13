// ─────────────────────────────────────────────────────────────────────────────
// Maintenance intake — generic question engine
//
// Framework-agnostic and domain-agnostic. It loads a WorkflowDefinition, tracks
// the branch taken, validates answers, evaluates branching rules, prunes
// downstream answers when an earlier answer changes, supports back/edit
// navigation, and is fully JSON-serialisable so a session survives a refresh.
//
// It contains NO plumbing/priority knowledge — that lives in the workflow data
// and priority-rules.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  WorkflowDefinition,
  Question,
  EngineState,
  AnswerValue,
  AnswerMap,
  AnswerOption,
  QAHistoryEntry,
} from './types'
import { evalPredicate } from './conditions'

export const END = 'END'

export const UNSAFE_SKIP = 'UNSAFE_SKIP'

export function getQuestion(wf: WorkflowDefinition, id: string | null): Question | null {
  if (!id) return null
  return wf.questions.find((q) => q.id === id) ?? null
}

/** Resolve the options for a question, applying dynamicOptions if present. */
export function resolveOptions(
  wf: WorkflowDefinition,
  q: Question,
  answers: AnswerMap,
): AnswerOption[] {
  if (q.dynamicOptions) {
    const key = answers[q.dynamicOptions.basedOn]
    const mapped = typeof key === 'string' ? q.dynamicOptions.map[key] : undefined
    return mapped ?? q.dynamicOptions.default
  }
  return q.options ?? []
}

function isVisible(q: Question, answers: AnswerMap): boolean {
  return q.visibleIf ? evalPredicate(q.visibleIf, answers) : true
}

/** The immediate next question id per a question's own rules (no visibility skipping). */
function rawNext(wf: WorkflowDefinition, q: Question, answers: AnswerMap): string {
  // An explicitly chosen option's `goto` wins.
  const chosen = answers[q.id]
  if (typeof chosen === 'string' && q.options) {
    const opt = q.options.find((o) => o.value === chosen)
    if (opt?.goto) return opt.goto
  }
  if (q.next && q.next.length) {
    for (const rule of q.next) {
      if (!rule.when || evalPredicate(rule.when, answers)) return rule.goto
    }
  }
  const i = wf.questions.findIndex((x) => x.id === q.id)
  const nxt = wf.questions[i + 1]
  return nxt ? nxt.id : END
}

/** The next *visible* question id, skipping any whose visibleIf is false. */
export function selectNext(wf: WorkflowDefinition, q: Question, answers: AnswerMap): string {
  let nextId = rawNext(wf, q, answers)
  const guard = new Set<string>([q.id])
  while (nextId !== END) {
    if (guard.has(nextId)) return END // defensive: never loop
    guard.add(nextId)
    const nq = getQuestion(wf, nextId)
    if (!nq) return END
    if (isVisible(nq, answers)) return nextId
    nextId = rawNext(wf, nq, answers)
  }
  return END
}

// ── Session lifecycle ────────────────────────────────────────────────────────

export function startSession(wf: WorkflowDefinition): EngineState {
  return {
    workflowId: wf.id,
    workflowVersion: wf.version,
    path: [],
    currentQuestionId: wf.entry,
    answers: {},
    labels: {},
    completed: false,
  }
}

export function currentQuestion(wf: WorkflowDefinition, state: EngineState): Question | null {
  return getQuestion(wf, state.currentQuestionId)
}

function labelForValue(options: AnswerOption[], value: AnswerValue): string {
  if (Array.isArray(value)) {
    return value.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ')
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value == null) return ''
  return options.find((o) => o.value === value)?.label ?? String(value)
}

export interface ValidationResult {
  ok: boolean
  error?: string
}

export function validateAnswer(
  q: Question,
  options: AnswerOption[],
  value: AnswerValue,
): ValidationResult {
  const required = !q.optional
  const empty =
    value == null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)

  // Media questions: honour the "cannot safely capture" escape hatch.
  if (q.inputType === 'photo' || q.inputType === 'video') {
    if (value === UNSAFE_SKIP) {
      if (q.media?.allowUnsafeSkip) return { ok: true }
      return { ok: false, error: 'A photo or video is required for this question.' }
    }
    const count = Array.isArray(value) ? value.length : empty ? 0 : 1
    const min = q.media?.minCount ?? 1
    if ((q.media?.required ?? required) && count < min) {
      return { ok: false, error: `Please add at least ${min} photo or video.` }
    }
    return { ok: true }
  }

  if (empty) {
    return required ? { ok: false, error: 'This field is required.' } : { ok: true }
  }

  if (q.inputType === 'single_choice' || q.inputType === 'yes_no') {
    const values = new Set(options.map((o) => o.value))
    if (options.length && typeof value === 'string' && !values.has(value)) {
      return { ok: false, error: 'Please choose one of the listed options.' }
    }
  }

  if (q.inputType === 'multi_choice') {
    const values = new Set(options.map((o) => o.value))
    const arr = Array.isArray(value) ? value : []
    if (options.length && !arr.every((v) => values.has(v))) {
      return { ok: false, error: 'Please choose from the listed options.' }
    }
  }

  if (typeof value === 'string') {
    const v = value.trim()
    if (q.inputType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return { ok: false, error: 'Please enter a valid email address.' }
    }
    if (q.inputType === 'phone' && v.replace(/\D/g, '').length < 7) {
      return { ok: false, error: 'Please enter a valid phone number.' }
    }
    if (q.validation) {
      if (q.validation.minLength && v.length < q.validation.minLength) {
        return { ok: false, error: q.validation.message ?? 'Answer is too short.' }
      }
      if (q.validation.maxLength && v.length > q.validation.maxLength) {
        return { ok: false, error: q.validation.message ?? 'Answer is too long.' }
      }
      if (q.validation.pattern && !new RegExp(q.validation.pattern).test(v)) {
        return { ok: false, error: q.validation.message ?? 'Answer is not in the expected format.' }
      }
    }
  }

  return { ok: true }
}

export interface AnswerResult {
  state: EngineState
  error?: string
}

/**
 * Record an answer for the current question and advance. If the answer differs
 * from a previously stored value (e.g. after going back or editing), every
 * downstream answer is pruned so an abandoned branch can't leak into the result.
 */
export function answer(
  wf: WorkflowDefinition,
  state: EngineState,
  value: AnswerValue,
): AnswerResult {
  const q = currentQuestion(wf, state)
  if (!q) return { state, error: 'No active question.' }

  const options = resolveOptions(wf, q, state.answers)
  const check = validateAnswer(q, options, value)
  if (!check.ok) return { state, error: check.error }

  const prev = state.answers[q.id]
  const changed = JSON.stringify(prev) !== JSON.stringify(value)

  // The new branch prefix ends at the question we just answered.
  const basePath = state.path.filter((id) => id !== q.id)
  const newPath = [...basePath, q.id]

  const answers: AnswerMap = { ...state.answers, [q.id]: value }
  const labels = { ...state.labels, [q.id]: labelForValue(options, value) }

  if (changed) {
    // Drop answers/labels for anything no longer on the retained path.
    for (const key of Object.keys(answers)) {
      if (!newPath.includes(key)) {
        delete answers[key]
        delete labels[key]
      }
    }
  }

  const nextId = selectNext(wf, q, answers)
  const completed = nextId === END

  return {
    state: {
      ...state,
      path: newPath,
      answers,
      labels,
      currentQuestionId: completed ? null : nextId,
      completed,
    },
  }
}

/** Step back to the previously answered question (its answer is kept for prefill). */
export function goBack(wf: WorkflowDefinition, state: EngineState): EngineState {
  if (state.path.length === 0) return state
  const last = state.path[state.path.length - 1]
  return {
    ...state,
    path: state.path.slice(0, -1),
    currentQuestionId: last,
    completed: false,
  }
}

/**
 * Jump back to an already-answered question to edit it (e.g. from the review
 * screen). Truncates the path and clears that answer plus everything after it,
 * so re-answering re-walks the branch from scratch.
 */
export function editAnswer(
  wf: WorkflowDefinition,
  state: EngineState,
  questionId: string,
): EngineState {
  void wf
  const idx = state.path.indexOf(questionId)
  if (idx === -1) return state
  const keep = state.path.slice(0, idx)
  const dropped = state.path.slice(idx)
  const answers = { ...state.answers }
  const labels = { ...state.labels }
  for (const d of dropped) {
    delete answers[d]
    delete labels[d]
  }
  return {
    ...state,
    path: keep,
    answers,
    labels,
    currentQuestionId: questionId,
    completed: false,
  }
}

/** The ordered question-and-answer history for the branch actually taken. */
export function buildHistory(wf: WorkflowDefinition, state: EngineState): QAHistoryEntry[] {
  return state.path.map((id) => {
    const q = getQuestion(wf, id)
    return {
      questionId: id,
      question: q?.text ?? id,
      inputType: q?.inputType ?? 'short_text',
      answerValue: state.answers[id] ?? null,
      answerLabel: state.labels[id] ?? String(state.answers[id] ?? ''),
    }
  })
}

/** Serialise/deserialise are plain JSON — a session survives a page refresh. */
export function serialize(state: EngineState): string {
  return JSON.stringify(state)
}

export function deserialize(raw: string): EngineState {
  return JSON.parse(raw) as EngineState
}
