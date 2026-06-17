'use client'

import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'
import { useT } from '@/lib/locale-context'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
}

const MAX_MB = 50
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx'

export default function Step6Employment({ data, onChange, errors }: Props) {
  const t = useT()
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid: File[] = []
    for (const f of files) {
      if (f.size > MAX_MB * 1024 * 1024) {
        alert(`"${f.name}" is too large (max ${MAX_MB} MB). Skipped.`)
        continue
      }
      valid.push(f)
    }
    if (valid.length > 0) {
      onChange({ documents: [...data.documents, ...valid] })
    }
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    onChange({ documents: data.documents.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step6.title}
      </h2>
      <p className="text-sm text-brand-gray mb-2">
        {t.step6.subtitle}
      </p>
      <div className="bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-3">
        Accepted formats: PDF, JPG, PNG, DOCX — max {MAX_MB} MB per file
      </div>
      <div className="bg-primary-50 border border-primary-200 p-3 text-sm text-primary-700 mb-6">
        <p className="mb-1" style={{ fontWeight: 600 }}>{t.step6.emailLaterTitle}</p>
        <p>{t.step6.emailLaterBody}</p>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step8.primaryApplicant} — {t.step6.employer}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label={t.step6.employer} required error={errors.employerName}
              hint={t.step6.employerHint}>
              <input
                className="form-input"
                autoCapitalize="words"
                value={data.employerName}
                onChange={(e) => onChange({ employerName: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label={t.step6.monthlyGross} hint={t.step6.monthlyGrossHint}>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="form-input"
              value={data.monthlyGrossSalary}
              onChange={(e) => onChange({ monthlyGrossSalary: e.target.value })}
              placeholder="4500"
            />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step6.incomeDocs} — {data.firstName || t.step8.primaryApplicant}</h3>

        {/* Uploaded files list */}
        {data.documents.length > 0 && (
          <div className="space-y-2 mb-4">
            {data.documents.map((file, i) => (
              <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-200">
                <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-dark truncate" style={{ fontWeight: 600 }}>{file.name}</p>
                  <p className="text-xs text-brand-gray">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-xs text-secondary hover:underline flex-shrink-0"
                >
                  {t.step6.remove}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload area */}
        <div className="border-2 border-dashed border-brand-border hover:border-primary-300 p-6 text-center transition-colors">
          <svg className="w-10 h-10 mx-auto text-brand-border mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-brand-gray">
            <label className="cursor-pointer text-primary-500 hover:underline font-bold">
              {t.step6.incomeDocs}
              <input
                type="file"
                className="sr-only"
                accept={ACCEPT}
                multiple
                onChange={handleFiles}
              />
            </label>
          </p>
          <p className="text-xs text-brand-gray mt-1">PDF, JPG, PNG, DOCX — max {MAX_MB} MB</p>
        </div>

        {data.documents.length === 0 && (
          <p className="mt-3 text-sm text-brand-gray">
            Don&apos;t have your pay stub handy? You can still submit — but your application will not be
            reviewed until income verification is received. Please email it to us as soon as possible.
          </p>
        )}
      </div>

      {/* Occupant income verification */}
      {data.occupants.length > 0 && (
        <div className="form-section">
          <h3 className="section-title">{t.step6.incomeDocs} — {t.step4.title}</h3>
          <p className="text-xs text-brand-gray mb-4">
            {t.step6.incomeDocsHint}
          </p>
          {data.occupants.map((occ, i) => (
            <OccupantUpload
              key={i}
              index={i}
              name={`${occ.firstName} ${occ.lastName}`.trim() || `Occupant ${i + 2}`}
              files={data.occupantDocs[i] ?? []}
              onChange={(files) => {
                const updated = [...data.occupantDocs]
                updated[i] = files
                onChange({ occupantDocs: updated })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OccupantUpload({
  index,
  name,
  files,
  onChange,
}: {
  index: number
  name: string
  files: File[]
  onChange: (files: File[]) => void
}) {
  const t = useT()
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    const valid = newFiles.filter((f) => {
      if (f.size > MAX_MB * 1024 * 1024) {
        alert(`"${f.name}" is too large (max ${MAX_MB} MB). Skipped.`)
        return false
      }
      return true
    })
    if (valid.length > 0) onChange([...files, ...valid])
    e.target.value = ''
  }

  return (
    <div className={`${index > 0 ? 'mt-6 pt-6 border-t border-brand-border' : ''}`}>
      <p className="text-sm text-brand-dark mb-3" style={{ fontWeight: 600 }}>{name}</p>

      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 p-2 bg-primary-50 border border-primary-200">
              <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-brand-dark truncate flex-1">{file.name}</span>
              <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-xs text-secondary hover:underline flex-shrink-0">{t.step6.remove}</button>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-primary-500 hover:underline" style={{ fontWeight: 600 }}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t.step6.addAnother}
        <input type="file" className="sr-only" accept={ACCEPT} multiple onChange={handleFiles} />
      </label>
    </div>
  )
}
