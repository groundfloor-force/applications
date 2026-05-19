'use client'

import { useT } from '@/lib/locale-context'

const MAX_MB = 50
const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  label?: string
  hint?: string
  compact?: boolean
  uploadLabel?: string
}

export default function MultiFileUploader({
  files,
  onChange,
  accept = DEFAULT_ACCEPT,
  label,
  hint,
  compact = false,
  uploadLabel,
}: Props) {
  const t = useT()

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    const valid: File[] = []
    for (const f of incoming) {
      if (f.size > MAX_MB * 1024 * 1024) {
        alert(`"${f.name}" is too large (max ${MAX_MB} MB). Skipped.`)
        continue
      }
      valid.push(f)
    }
    if (valid.length > 0) onChange([...files, ...valid])
    e.target.value = ''
  }

  const remove = (i: number) => onChange(files.filter((_, j) => j !== i))

  return (
    <div>
      {label && (
        <p className="text-sm text-brand-dark mb-2" style={{ fontWeight: 600 }}>
          {label}
        </p>
      )}
      {hint && <p className="text-xs text-brand-gray mb-3">{hint}</p>}

      {files.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 p-2 bg-primary-50 border border-primary-200"
            >
              <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-brand-dark truncate flex-1">{file.name}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-secondary hover:underline flex-shrink-0"
              >
                {t.step6.remove}
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className={
          compact
            ? 'inline-flex items-center gap-2 cursor-pointer text-sm text-primary-500 hover:underline'
            : 'block border-2 border-dashed border-brand-border hover:border-primary-300 px-4 py-4 text-center transition-colors cursor-pointer'
        }
        style={{ fontWeight: compact ? 600 : 400 }}
      >
        {!compact && (
          <svg className="w-7 h-7 mx-auto text-brand-border mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        )}
        <span className={compact ? 'inline-flex items-center gap-2' : 'block text-sm text-primary-500'} style={{ fontWeight: 600 }}>
          {compact && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          {files.length === 0 ? (uploadLabel ?? t.step6.incomeDocs) : t.step6.addAnother}
        </span>
        {!compact && (
          <p className="text-[11px] text-brand-gray mt-1">PDF, JPG, PNG, DOCX — max {MAX_MB} MB</p>
        )}
        <input type="file" className="sr-only" accept={accept} multiple onChange={handleFiles} />
      </label>
    </div>
  )
}
