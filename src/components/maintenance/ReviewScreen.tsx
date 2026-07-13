'use client'

import type { EngineState, WorkflowDefinition } from '@/lib/maintenance/types'
import { getQuestion } from '@/lib/maintenance/engine'
import { evaluateSeverity } from '@/lib/maintenance/priority-rules'
import { QID } from '@/lib/maintenance/ids'

const SECTIONS: { key: string; title: string }[] = [
  { key: 'issue', title: 'The issue' },
  { key: 'media', title: 'Photos' },
  { key: 'contact', title: 'Your contact details' },
  { key: 'property', title: 'Property' },
  { key: 'access', title: 'Access' },
  { key: 'comments', title: 'Additional details' },
]

const PRIORITY_LABEL: Record<string, string> = {
  P1: 'P1 · Emergency',
  P2: 'P2 · Urgent',
  P3: 'P3 · Standard',
}

interface Props {
  wf: WorkflowDefinition
  state: EngineState
  files: File[]
  mediaUnsafe: boolean
  onEdit: (questionId: string) => void
  onSubmit: () => void
  submitting: boolean
  error?: string
}

export default function ReviewScreen({
  wf,
  state,
  files,
  mediaUnsafe,
  onEdit,
  onSubmit,
  submitting,
  error,
}: Props) {
  const severity = evaluateSeverity(state.answers)
  const priorityClass =
    severity.priority === 'P1'
      ? 'bg-red-100 text-secondary'
      : severity.priority === 'P2'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-primary-50 text-primary-500'

  return (
    <div>
      <h1 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        Review your request
      </h1>
      <p className="text-brand-gray text-sm mb-6">
        Please check everything is correct. You can edit any answer before submitting.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${priorityClass}`}>
          {PRIORITY_LABEL[severity.priority]}
        </span>
        {severity.emergencyFlag && (
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-secondary text-white">
            {severity.emergencyType ?? 'Emergency'}
          </span>
        )}
        {severity.safetyFlags.map((f) => (
          <span key={f} className="px-3 py-1 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-200">
            {f.replace(/_/g, ' ')}
          </span>
        ))}
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
                    {mediaUnsafe
                      ? 'Marked unsafe to photograph'
                      : files.length > 0
                        ? `${files.length} photo${files.length > 1 ? 's' : ''} attached`
                        : 'No photos added yet'}
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
            .map((id) => ({ id, q: getQuestion(wf, id), label: state.labels[id] || String(state.answers[id] ?? '') }))
            .filter((r) => r.q && (r.label?.trim() ?? '') !== '')

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
