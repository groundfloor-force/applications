'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  startSession,
  currentQuestion,
  getQuestion,
  resolveOptions,
  answer,
  reviseAnswer,
  goBack,
  UNSAFE_SKIP,
} from '@/lib/maintenance/engine'
import { evalPredicate } from '@/lib/maintenance/conditions'
import type { AnswerValue, EngineState, WorkflowDefinition } from '@/lib/maintenance/types'
import { loadState, saveState, clearState } from '@/lib/maintenance/persistence'
import { SECTION_ORDER } from '@/lib/maintenance/sections'
import QuestionScreen, { type SafetyNote } from './QuestionScreen'
import ReviewScreen from './ReviewScreen'
import WelcomeScreen from './WelcomeScreen'

type Success = { requestId: string; priority: string; emergencyFlag: boolean }

export default function MaintenanceIntake({ workflow }: { workflow: WorkflowDefinition }) {
  const wf = workflow
  const [state, setState] = useState<EngineState>(() => startSession(wf))
  // Photos are kept per-question (Files can't live in the engine state).
  const [filesByQ, setFilesByQ] = useState<Record<string, File[]>>({})
  const [unsafeByQ, setUnsafeByQ] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [pending, setPending] = useState<AnswerValue>('')
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | undefined>()
  const [success, setSuccess] = useState<Success | null>(null)
  const hydrated = useRef(false)

  // Resume a saved session (text answers only; photos are re-collected).
  useEffect(() => {
    const saved = loadState()
    if (saved && saved.workflowId === wf.id && saved.workflowVersion === wf.version) {
      setState(saved)
      // Resume a draft in progress straight away — skip the intro.
      if (saved.path.length > 0 || saved.completed) setStarted(true)
    }
    hydrated.current = true
  }, [])

  // Persist after every change (persistence strips photo answers).
  useEffect(() => {
    if (hydrated.current) saveState(state, wf)
  }, [state])

  const activeQuestion = editing ? getQuestion(wf, editing) : currentQuestion(wf, state)
  const activeId = editing ?? state.currentQuestionId
  const curFiles = activeId ? (filesByQ[activeId] ?? []) : []
  const curUnsafe = activeId ? (unsafeByQ[activeId] ?? false) : false
  const options = useMemo(
    () => (activeQuestion ? resolveOptions(wf, activeQuestion, state.answers) : []),
    [activeQuestion, state.answers],
  )

  // Reset the pending value whenever the active question changes.
  useEffect(() => {
    const q = activeId ? getQuestion(wf, activeId) : null
    if (!q) return
    const existing = state.answers[q.id]
    if (q.inputType === 'multi_choice') setPending(Array.isArray(existing) ? existing : [])
    else setPending(typeof existing === 'string' ? existing : '')
    setError(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const safetyNotes: SafetyNote[] = useMemo(() => {
    if (!activeQuestion?.safetyMessages) return []
    const probe = { ...state.answers, [activeQuestion.id]: pending }
    return activeQuestion.safetyMessages
      .filter((m) => !m.when || evalPredicate(m.when, probe))
      .map((m) => ({ text: m.text, level: m.level ?? 'warning' }))
  }, [activeQuestion, state.answers, pending])

  const commit = (value: AnswerValue) => {
    const res = editing
      ? reviseAnswer(wf, state, editing, value)
      : answer(wf, state, value)
    if (res.error) {
      setError(res.error)
      return
    }
    setError(undefined)
    setEditing(null)
    setState(res.state)
  }

  const isChoice = activeQuestion?.inputType === 'single_choice' || activeQuestion?.inputType === 'yes_no'
  const hasSafety = !!(activeQuestion?.safetyMessages && activeQuestion.safetyMessages.length)
  const autoAdvance = !editing && !!activeQuestion && isChoice && !activeQuestion.emergencyBanner && !hasSafety

  const handleSelectChoice = (value: string) => {
    setError(undefined)
    setPending(value)
    if (autoAdvance) commit(value)
  }

  const handleContinue = () => {
    if (!activeQuestion) return
    if (activeQuestion.inputType === 'photo' || activeQuestion.inputType === 'video') {
      commit(curUnsafe ? UNSAFE_SKIP : curFiles.map((f) => f.name))
      return
    }
    commit(pending)
  }

  const handleBack = () => {
    setSubmitError(undefined)
    if (editing) {
      setEditing(null) // cancel the edit, return to review
      return
    }
    setState((s) => goBack(wf, s))
  }

  const handleEdit = (questionId: string) => {
    setSubmitError(undefined)
    setEditing(questionId)
  }

  const reset = () => {
    clearState()
    setState(startSession(wf))
    setFilesByQ({})
    setUnsafeByQ({})
    setEditing(null)
    setStarted(false)
    setSuccess(null)
    setSubmitError(undefined)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    // Gather every photo across all photo questions on the taken path.
    const allFiles = state.path.flatMap((qid) => filesByQ[qid] ?? [])

    // Vercel rejects request bodies over ~4.5 MB before the function runs, so a
    // large batch of photos would fail with a cryptic platform error. Guard it
    // here with actionable guidance instead.
    const totalBytes = allFiles.reduce((sum, f) => sum + f.size, 0)
    if (totalBytes > 4_000_000) {
      setSubmitError(
        'Your photos are too large to upload together (over 4 MB). Please remove one or more photos and try again.',
      )
      return
    }

    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const answers = { ...state.answers }
      for (const qid of state.path) {
        const q = getQuestion(wf, qid)
        if (q && (q.inputType === 'photo' || q.inputType === 'video')) {
          answers[qid] = unsafeByQ[qid] ? UNSAFE_SKIP : (filesByQ[qid] ?? []).map((f) => f.name)
        }
      }
      const submitState: EngineState = { ...state, answers }

      const payload = new FormData()
      payload.append('state', JSON.stringify(submitState))
      allFiles.forEach((f) => payload.append('files', f, f.name))

      const res = await fetch('/api/maintenance', { method: 'POST', body: payload })
      let result: { requestId?: string; priority?: string; emergencyFlag?: boolean; error?: string } = {}
      try {
        result = await res.json()
      } catch {
        /* ignore */
      }
      if (!res.ok) throw new Error(result.error || `Submission failed (HTTP ${res.status})`)

      clearState()
      setSuccess({
        requestId: result.requestId ?? '',
        priority: result.priority ?? '',
        emergencyFlag: !!result.emergencyFlag,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 bg-primary-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl text-brand-dark mb-3" style={{ fontWeight: 700 }}>
          Request received
        </h1>
        {success.emergencyFlag ? (
          <p className="text-brand-gray mb-2">
            This has been flagged as an <strong className="text-secondary">emergency</strong> and our team has been
            alerted. If anyone is in danger or there is a risk to safety, call emergency services.
          </p>
        ) : (
          <p className="text-brand-gray mb-2">
            Thanks — our maintenance team has your request and will follow up shortly.
          </p>
        )}
        {success.requestId && (
          <p className="text-xs text-brand-gray mt-2">
            Reference: <span className="font-mono">{success.requestId}</span>
          </p>
        )}
        <button type="button" onClick={reset} className="btn-primary px-8 py-4 mt-8">
          Start a new work order
        </button>
      </div>
    )
  }

  // ── Welcome / intro (only at the very start of a fresh request) ──────────────
  if (!started) {
    return <WelcomeScreen onStart={() => setStarted(true)} />
  }

  // ── Review (only when not mid-edit) ──────────────────────────────────────────
  if (!editing && state.completed) {
    return (
      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-brand-gray hover:text-brand-dark mb-6 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <ReviewScreen
          wf={wf}
          state={state}
          filesByQ={filesByQ}
          unsafeByQ={unsafeByQ}
          onEdit={handleEdit}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      </div>
    )
  }

  if (!activeQuestion) return null

  // ── Progress ─────────────────────────────────────────────────────────────────
  const sectionIdx = Math.max(0, SECTION_ORDER.indexOf(activeQuestion.section ?? 'issue'))
  const progress = Math.round(((sectionIdx + 0.5) / SECTION_ORDER.length) * 100)

  const isMediaQ = activeQuestion.inputType === 'photo' || activeQuestion.inputType === 'video'
  const mediaReady = !isMediaQ ? true : activeQuestion.optional ? true : curUnsafe || curFiles.length > 0
  const continueDisabled =
    (activeQuestion.inputType === 'multi_choice' && (!Array.isArray(pending) || pending.length === 0)) || !mediaReady

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={!editing && state.path.length === 0}
            className="text-sm text-brand-gray hover:text-brand-dark inline-flex items-center gap-1 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {editing ? 'Cancel' : 'Back'}
          </button>
          <span className="text-xs text-brand-gray">{editing ? 'Editing answer' : `Step ${state.path.length + 1}`}</span>
        </div>
        {!editing && (
          <div className="h-1.5 bg-brand-border overflow-hidden">
            <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <QuestionScreen
        question={activeQuestion}
        options={options}
        value={pending}
        onChange={setPending}
        onSelectChoice={handleSelectChoice}
        files={curFiles}
        onFilesChange={(f) => activeId && setFilesByQ((p) => ({ ...p, [activeId]: f }))}
        mediaUnsafe={curUnsafe}
        onMediaUnsafeChange={(v) => activeId && setUnsafeByQ((p) => ({ ...p, [activeId]: v }))}
        safetyNotes={safetyNotes}
        error={error}
      />

      {!autoAdvance && (
        <div className="mt-8">
          <button
            type="button"
            onClick={handleContinue}
            disabled={continueDisabled}
            className="btn-primary px-8 py-4 w-full flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {editing ? 'Save changes' : 'Continue'}
            {!editing && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
