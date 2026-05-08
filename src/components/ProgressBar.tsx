'use client'

// Labels for steps 2–8 (displayed as 1–7 since step 1 is pre-form property selection)
const STEP_LABELS = [
  'Your Details',
  'Household',
  'Occupants',
  'Rental History',
  'Employment',
  'References',
  'Review & Submit',
]

export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current - 1) / (total - 1)) * 100)
  const label = STEP_LABELS[current - 1] ?? ''

  return (
    <div className="mb-8">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm text-primary-500" style={{ fontWeight: 600 }}>
          Step {current} of {total}
          {label && (
            <span className="text-gray-400" style={{ fontWeight: 400 }}>
              {' '}— {label}
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400" style={{ fontWeight: 300 }}>{pct}% complete</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
