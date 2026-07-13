'use client'

import type { AnswerOption, AnswerValue, Question } from '@/lib/maintenance/types'
import MultiFileUploader from '@/components/MultiFileUploader'

export interface SafetyNote {
  text: string
  level: 'warning' | 'danger'
}

interface Props {
  question: Question
  options: AnswerOption[]
  value: AnswerValue
  onChange: (value: AnswerValue) => void
  /** Choice selection — the orchestrator decides whether to auto-advance. */
  onSelectChoice: (value: string) => void
  files: File[]
  onFilesChange: (files: File[]) => void
  mediaUnsafe: boolean
  onMediaUnsafeChange: (v: boolean) => void
  safetyNotes: SafetyNote[]
  error?: string
}

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-4 border-2 transition-colors text-base ${
        selected
          ? 'border-primary-500 bg-primary-50 text-brand-dark'
          : 'border-brand-border bg-white text-brand-dark hover:border-primary-300'
      }`}
      style={{ fontWeight: selected ? 600 : 400, borderRadius: 12 }}
      aria-pressed={selected}
    >
      {label}
    </button>
  )
}

export default function QuestionScreen({
  question,
  options,
  value,
  onChange,
  onSelectChoice,
  files,
  onFilesChange,
  mediaUnsafe,
  onMediaUnsafeChange,
  safetyNotes,
  error,
}: Props) {
  const isChoice = question.inputType === 'single_choice' || question.inputType === 'yes_no'
  const isMulti = question.inputType === 'multi_choice'
  const strValue = typeof value === 'string' ? value : ''
  const arrValue = Array.isArray(value) ? value : []

  return (
    <div>
      {question.emergencyBanner && (
        <div className="mb-5 rounded-xl border-2 border-secondary bg-red-50 px-5 py-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-secondary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-secondary font-semibold text-sm uppercase tracking-wide">Emergency</p>
            <p className="text-brand-dark text-sm mt-0.5">This looks urgent. Please read the safety guidance below.</p>
          </div>
        </div>
      )}

      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {question.text}
      </h2>
      {question.helpText && <p className="text-brand-gray text-sm mb-5">{question.helpText}</p>}

      {safetyNotes.length > 0 && (
        <div className="space-y-3 mb-6">
          {safetyNotes.map((note, i) => (
            <div
              key={i}
              className={`rounded-xl px-4 py-3 text-sm border ${
                note.level === 'danger'
                  ? 'border-secondary bg-red-50 text-secondary'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
            >
              {note.text}
            </div>
          ))}
        </div>
      )}

      {isChoice && (
        <div className="space-y-3">
          {options.map((o) => (
            <ChoiceButton
              key={o.value}
              label={o.label}
              selected={strValue === o.value}
              onClick={() => onSelectChoice(o.value)}
            />
          ))}
        </div>
      )}

      {isMulti && (
        <div className="space-y-3">
          {options.map((o) => {
            const on = arrValue.includes(o.value)
            return (
              <ChoiceButton
                key={o.value}
                label={o.label}
                selected={on}
                onClick={() =>
                  onChange(on ? arrValue.filter((v) => v !== o.value) : [...arrValue, o.value])
                }
              />
            )
          })}
        </div>
      )}

      {question.inputType === 'long_text' && (
        <textarea
          rows={6}
          maxLength={2000}
          className="form-input"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}

      {(question.inputType === 'short_text' || question.inputType === 'address') && (
        <input
          type="text"
          className="form-input"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={question.inputType === 'address' ? 'street-address' : 'off'}
          autoFocus
        />
      )}

      {question.inputType === 'email' && (
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className="form-input"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}

      {question.inputType === 'phone' && (
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="form-input"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )}

      {question.inputType === 'date' && (
        <input
          type="date"
          className="form-input"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {question.inputType === 'time_window' && (
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Weekday mornings, after 5pm"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {(question.inputType === 'photo' || question.inputType === 'video') && (
        <div>
          <div className={mediaUnsafe ? 'opacity-40 pointer-events-none' : ''}>
            <MultiFileUploader
              files={files}
              onChange={onFilesChange}
              accept=".jpg,.jpeg,.png,.heic,.webp"
              capture
              uploadLabel="Add a photo"
            />
          </div>
          {question.media?.allowUnsafeSkip && (
            <label className="mt-4 flex items-center gap-3 text-sm text-brand-dark cursor-pointer">
              <input
                type="checkbox"
                checked={mediaUnsafe}
                onChange={(e) => onMediaUnsafeChange(e.target.checked)}
                className="w-5 h-5"
              />
              I cannot safely take a photo or video.
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-secondary mt-3 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
