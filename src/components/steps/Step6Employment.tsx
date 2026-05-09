'use client'

import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
}

const MAX_MB = 50

export default function Step6Employment({ data, onChange, errors }: Props) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file && file.size > MAX_MB * 1024 * 1024) {
      alert(`File is too large. Maximum size is ${MAX_MB} MB.`)
      e.target.value = ''
      return
    }
    onChange({ payStubFile: file })
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        Employment & Income Verification
      </h2>
      <p className="text-sm text-brand-gray mb-2">
        To make this process faster, please upload a copy of your most recent pay stub.
        Applications will not be processed without this information.
        Bank statements are also permitted.
      </p>
      <div className="bg-amber-50 border border-amber-200  p-3 text-sm text-amber-800 mb-6">
        Accepted formats: PDF, JPG, PNG, DOCX — max {MAX_MB} MB
      </div>

      <div className="form-section">
        <h3 className="section-title">Primary Applicant — Employer</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Employer Name" required error={errors.employerName}
              hint="If unemployed or retired, please indicate here">
              <input
                className="form-input"
                value={data.employerName}
                onChange={(e) => onChange({ employerName: e.target.value })}
                placeholder="Company name or 'Unemployed' / 'Retired'"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Income Verification Upload</h3>
        <FormField label="Pay Stub / Bank Statement" required error={errors.payStubFile}>
          <div className={`mt-1 border-2 border-dashed  p-6 text-center transition-colors ${
            data.payStubFile ? 'border-primary-400 bg-primary-50' : 'border-brand-border hover:border-primary-300'
          }`}>
            {data.payStubFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{data.payStubFile.name}</span>
                </div>
                <p className="text-xs text-brand-gray">
                  {(data.payStubFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => onChange({ payStubFile: null })}
                  className="text-xs text-secondary hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg className="w-10 h-10 mx-auto text-brand-border" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-brand-gray">
                  <label className="cursor-pointer text-primary-500 hover:underline font-bold">
                    Click to upload a file
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.docx"
                      onChange={handleFileChange}
                    />
                  </label>
                  {' '}or drag and drop
                </p>
                <p className="text-xs text-brand-gray">PDF, JPG, PNG, DOCX up to {MAX_MB} MB</p>
              </div>
            )}
          </div>
        </FormField>

        {!data.payStubFile && (
          <p className="mt-3 text-sm text-brand-gray">
            Don&apos;t have your pay stub handy? You can still submit — but your application will not be
            reviewed until income verification is received. Please email it to us as soon as possible.
          </p>
        )}
      </div>
    </div>
  )
}
