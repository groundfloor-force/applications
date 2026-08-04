'use client'

import type { EngineState, WorkflowDefinition } from '@/lib/maintenance/types'
import { getQuestion } from '@/lib/maintenance/engine'
import { evaluateSeverity } from '@/lib/maintenance/priority-rules'
import { QID } from '@/lib/maintenance/ids'
import { SECTIONS } from '@/lib/maintenance/sections'

const PRIORITY_LABEL: Record<string, string> = {
  P1: 'P1 · Emergency',
  P2: 'P2 · Urgent',
  P3: 'P3 · Standard',
}

interface Props {
  wf: WorkflowDefinition
  state: EngineState
  filesByQ: Record<string, File[]>
  unsafeByQ: Record<string, boolean>
  onEdit: (questionId: string) => void
  onSubmit: () => void
  submitting: boolean
  error?: string
}

function mediaSummary(files: File[], unsafe: boolean): string {
  if (unsafe) return 'Marked unsafe to photograph'
  if (files.length > 0) return `${files.length} photo${files.length > 1 ? 's' : ''} attached`
  return 'None added'
}

export default function ReviewScreen({
  wf,
  state,
  filesByQ,
  unsafeByQ,
  onEdit,
  onSubmit,
  submitting,
  error,
}: Props) {
  const severity = evaluateSeverity(state.answers, wf)
  const priorityText =
    severity.priority === 'P1'
      ? 'text-secondary'
      : severity.priority === 'P2'
        ? 'text-amber-700'
        : 'text-primary-500'

  return (
    <div>
      <h1 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        Review your request
      </h1>
      <p className="text-brand-gray text-sm mb-6">
        Please check everything is correct. You can edit any answer before submitting.
      </p>

      <div className="mb-6 border border-brand-border rounded-lg divide-y divide-brand-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-brand-gray">Priority</span>
          <span className={`text-sm font-semibold ${priorityText}`}>{PRIORITY_LABEL[severity.priority]}</span>
        </div>
        {severity.emergencyFlag && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-brand-gray">Emergency</span>
            <span className="text-sm font-semibold text-secondary">{severity.emergencyType ?? 'Emergency'}</span>
          </div>
        )}
        {severity.safetyFlags.length > 0 && (
          <div className="px-4 py-3">
            <span className="text-sm text-brand-gray">Safety flags</span>
            <p className="text-sm text-amber-700 mt-1">
              {severity.safetyFlags.map((f) => f.replace(/_/g, ' ')).join(', ')}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          if (section.key === 'media') {
            const answered = state.path.includes(QID.MEDIA)
            if (!answered) return null
            return (
              <section key="media">
                <h3 className="text-sm uppercase tracking-wide text-brand-gray mb-2" style={{ fontWeight: 600 }}>
                  {section.title}
                </h3>
                <div className="flex items-center justify-between gap-4 border border-brand-border rounded-xl px-4 py-3">
                  <span className="text-brand-dark text-sm">
                    {mediaSummary(filesByQ[QID.MEDIA] ?? [], !!unsafeByQ[QID.MEDIA])}
                  </span>
                  <button type="button" onClick={() => onEdit(QID.MEDIA)} className="text-sm text-primary-500 hover:underline flex-shrink-0">
                    Edit
                  </button>
                </div>
              </section>
            )
          }

          const rows = state.path
            .filter((id) => getQuestion(wf, id)?.section === section.key)
            .map((id) => {
              const q = getQuestion(wf, id)
              const isMedia = q?.inputType === 'photo' || q?.inputType === 'video'
              const label = isMedia
                ? mediaSummary(filesByQ[id] ?? [], !!unsafeByQ[id])
                : state.labels[id] || String(state.answers[id] ?? '')
              return { id, q, label, isMedia }
            })
            .filter((r) => r.q && (r.isMedia || (r.label?.trim() ?? '') !== ''))

          if (rows.length === 0) return null

          return (
            <section key={section.key}>
              <h3 className="text-sm uppercase tracking-wide text-brand-gray mb-2" style={{ fontWeight: 600 }}>
                {section.title}
              </h3>
              <div className="divide-y divide-brand-border border border-brand-border rounded-xl">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-brand-gray">{r.q!.text}</p>
                      <p className="text-brand-dark text-sm mt-0.5 break-words">{r.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(r.id)}
                      className="text-sm text-primary-500 hover:underline flex-shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-secondary text-sm rounded-xl">{error}</div>
      )}

      <div className="mt-8 pt-6 border-t border-brand-border">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="btn-primary px-8 py-4 w-full flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting…
            </>
          ) : (
            'Submit request'
          )}
        </button>
      </div>
    </div>
  )
}
