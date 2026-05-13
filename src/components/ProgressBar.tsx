'use client'

import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'

export default function ProgressBar({
  current,
  total,
  onJump,
}: {
  current: number
  total: number
  onJump?: (step: number) => void
}) {
  const t = useT()
  const STEP_LABELS = [
    t.progress.yourDetails,
    t.progress.household,
    t.progress.occupants,
    t.progress.rentalHistory,
    t.progress.employment,
    t.progress.references,
    t.progress.reviewSubmit,
  ]
  const pct = Math.round(((current - 1) / (total - 1)) * 100)

  return (
    <div className="mb-10 animate-fade-in">
      {/* Step indicators */}
      <div className="flex items-center justify-between mb-4">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isActive = stepNum === current
          const isComplete = stepNum < current
          const canJump = isComplete && !!onJump

          const circle = (
            <div
              className={`relative z-10 w-7 h-7 flex items-center justify-center text-xs transition-all duration-300 ${
                isActive
                  ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                  : isComplete
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-brand-gray border border-brand-border'
              } ${canJump ? 'cursor-pointer hover:ring-4 hover:ring-primary-100' : ''}`}
              style={{ fontWeight: 600 }}
            >
              {isComplete ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNum
              )}
            </div>
          )

          return (
            <div key={label} className="flex flex-col items-center flex-1 relative">
              {/* Connector line */}
              {i > 0 && (
                <div className="absolute top-3.5 right-1/2 w-full h-px -translate-y-1/2">
                  <div
                    className={`h-full transition-colors duration-300 ${
                      isComplete || isActive ? 'bg-primary-500' : 'bg-brand-border'
                    }`}
                  />
                </div>
              )}

              {/* Circle (clickable if completed) */}
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onJump?.(stepNum)}
                  className="relative z-10 p-0 bg-transparent border-0"
                  aria-label={`Go back to step ${stepNum}: ${label}`}
                  title={`Edit ${label}`}
                >
                  {circle}
                </button>
              ) : (
                circle
              )}

              {/* Label — hidden on mobile */}
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onJump?.(stepNum)}
                  className={`hidden sm:block text-center mt-2 text-xs leading-tight transition-colors duration-300 text-primary-400 hover:text-primary-600 hover:underline bg-transparent border-0 p-0 cursor-pointer`}
                  style={{ fontWeight: 400 }}
                >
                  {label}
                </button>
              ) : (
                <span
                  className={`hidden sm:block text-center mt-2 text-xs leading-tight transition-colors duration-300 ${
                    isActive ? 'text-primary-500' : 'text-brand-gray'
                  }`}
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile label */}
      <div className="sm:hidden">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-sm text-primary-500" style={{ fontWeight: 600 }}>
            {tpl(t.progress.stepOf, { n: current, total })}
            <span className="text-brand-gray ml-1" style={{ fontWeight: 400 }}>
              — {STEP_LABELS[current - 1]}
            </span>
          </span>
          <span className="text-xs text-brand-gray">{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-brand-border overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
