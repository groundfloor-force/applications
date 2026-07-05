'use client'

import { useState } from 'react'
import FormField from '@/components/FormField'
import { compressImage } from '@/lib/compress-image'

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  subject: string
  comment: string
}

const INITIAL: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  subject: '',
  comment: '',
}

const MAX_MB = 50

export default function SupportForm() {
  const [data, setData] = useState<FormState>(INITIAL)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<null | { itemId: string; matchedProperty?: string; pod?: string }>(null)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setData((prev) => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!data.firstName.trim()) e.firstName = 'Required'
    if (!data.lastName.trim()) e.lastName = 'Required'
    if (!data.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Invalid email address'
    if (!data.phone.trim()) e.phone = 'Required'
    if (!data.address.trim()) e.address = 'Required'
    if (!data.subject.trim()) e.subject = 'Required'
    if (!data.comment.trim()) e.comment = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`"${f.name}" is too large (max ${MAX_MB} MB).`)
      return
    }
    setFile(await compressImage(f))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const payload = new FormData()
      payload.append('data', JSON.stringify(data))
      if (file) payload.append('file', file, file.name)

      const res = await fetch('/api/support', { method: 'POST', body: payload })
      let result: { itemId?: string; matchedProperty?: string; pod?: string; error?: string; requestId?: string } = {}
      try {
        result = await res.json()
      } catch {
        // ignore
      }

      if (!res.ok) {
        const base = result.error || `Submission failed (HTTP ${res.status})`
        const ref = result.requestId ? ` [ref: ${result.requestId}]` : ''
        throw new Error(`${base}${ref}`)
      }

      setSuccess({
        itemId: result.itemId ?? '',
        matchedProperty: result.matchedProperty,
        pod: result.pod,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrors({ submit: message })
      setSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 mx-auto mb-6 bg-primary-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl text-brand-dark mb-3" style={{ fontWeight: 700 }}>
          Request Received
        </h1>
        <p className="text-brand-gray mb-2">
          Thanks for reaching out. A member of our team will get back to you shortly.
        </p>
        {success.matchedProperty && (
          <p className="text-xs text-brand-gray mt-4">
            Matched property: <span className="text-brand-dark">{success.matchedProperty}</span>
            {success.pod ? ` · Routed to ${success.pod}` : ''}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setSuccess(null)
            setData(INITIAL)
            setFile(null)
          }}
          className="btn-secondary mt-8"
        >
          Submit another request
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
          Support Request
        </h1>
        <p className="text-brand-gray text-sm">
          Have a maintenance issue, question, or concern? Send it to the Ground Floor team below.
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-secondary text-sm">
          {errors.submit}
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" required error={errors.firstName}>
            <input
              type="text"
              autoComplete="given-name"
              className="form-input"
              value={data.firstName}
              onChange={(e) => set('firstName', e.target.value)}
            />
          </FormField>
          <FormField label="Last Name" required error={errors.lastName}>
            <input
              type="text"
              autoComplete="family-name"
              className="form-input"
              value={data.lastName}
              onChange={(e) => set('lastName', e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Email" required error={errors.email}>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              className="form-input"
              value={data.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </FormField>
          <FormField label="Phone" required error={errors.phone}>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              className="form-input"
              value={data.phone}
              onChange={(e) => set('phone', e.target.value)}
            />
          </FormField>
        </div>

        <FormField
          label="Address"
          required
          hint="If you are a current tenant with Ground Floor, please specify your address and unit number if applicable. If you are not a tenant, please indicate N/A."
          error={errors.address}
        >
          <input
            type="text"
            autoComplete="street-address"
            className="form-input"
            value={data.address}
            onChange={(e) => set('address', e.target.value)}
          />
        </FormField>

        <FormField
          label="Subject"
          required
          hint="Please give us a subject line description of what you are inquiring about."
          error={errors.subject}
        >
          <input
            type="text"
            maxLength={255}
            className="form-input"
            value={data.subject}
            onChange={(e) => set('subject', e.target.value)}
          />
          <p className="text-[11px] text-brand-gray mt-1 text-right">{data.subject.length}/255</p>
        </FormField>

        <FormField label="How can we help?" required error={errors.comment}>
          <textarea
            rows={6}
            maxLength={2000}
            className="form-input"
            value={data.comment}
            onChange={(e) => set('comment', e.target.value)}
          />
          <p className="text-[11px] text-brand-gray mt-1 text-right">{data.comment.length}/2000</p>
        </FormField>

        <FormField label="Attachment" hint={`PDF, JPG, PNG, DOCX — max ${MAX_MB} MB (optional)`}>
          {file ? (
            <div className="flex items-center gap-3 p-2 bg-primary-50 border border-primary-200">
              <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-brand-dark truncate flex-1">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-secondary hover:underline flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-brand-border hover:border-primary-300 px-4 py-4 text-center transition-colors cursor-pointer">
              <svg className="w-7 h-7 mx-auto text-brand-border mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="block text-sm text-primary-500" style={{ fontWeight: 600 }}>
                Choose a file or drop it here
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={handleFile}
              />
            </label>
          )}
        </FormField>
      </div>

      <div className="mt-10 pt-6 border-t border-brand-border flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary px-8 py-4 w-full sm:w-auto sm:min-w-[220px] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting...
            </>
          ) : (
            <>
              Submit Request
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
