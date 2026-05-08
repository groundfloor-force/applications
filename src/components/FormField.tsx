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
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-secondary mt-1">{error}</p>}
    </div>
  )
}
