'use client'

interface Props {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}

export default function FormField({ label, required, hint, error, children }: Props) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-brand-gray mt-1.5">{hint}</p>}
      {error && (
        <p className="text-xs text-secondary mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
