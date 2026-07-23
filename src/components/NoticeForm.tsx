'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FormField from '@/components/FormField'
import DateInput from '@/components/DateInput'
import SignaturePad from '@/components/SignaturePad'
import {
  NOTICE_REASONS,
  NOTICE_REASON_OTHER,
  OCCUPANTS_OPTIONS,
  validateNotice,
  type NoticeFormData,
} from '@/lib/notices'

type UnitOption = { id: string; name: string }

const INITIAL: NoticeFormData = {
  unitId: '',
  unitName: '',
  moveOutDate: '',
  fullName: '',
  email: '',
  reason: '',
  details: '',
  forwardingAddress: '',
  forwardingPostal: '',
  occupantsMoving: '',
  roommateDetails: '',
  signatureData: '',
}

export default function NoticeForm() {
  const [data, setData] = useState<NoticeFormData>(INITIAL)
  const [units, setUnits] = useState<UnitOption[] | null>(null)
  const [unitsError, setUnitsError] = useState(false)
  const [unitQuery, setUnitQuery] = useState('')
  const [unitOpen, setUnitOpen] = useState(false)
  const unitBoxRef = useRef<HTMLDivElement | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof NoticeFormData | 'submit', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<null | { itemId: string }>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/units')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { units: UnitOption[] }) => {
        if (!cancelled) setUnits(json.units)
      })
      .catch(() => {
        if (!cancelled) setUnitsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Close the unit dropdown when clicking outside it
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (unitBoxRef.current && !unitBoxRef.current.contains(e.target as Node)) setUnitOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const filteredUnits = useMemo(() => {
    if (!units) return []
    const q = unitQuery.trim().toLowerCase()
    if (!q) return units.slice(0, 50)
    return units.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 50)
  }, [units, unitQuery])

  const set = <K extends keyof NoticeFormData>(k: K, v: NoticeFormData[K]) => {
    setData((prev) => ({ ...prev, [k]: v }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const selectUnit = (u: UnitOption) => {
    setData((prev) => ({ ...prev, unitId: u.id, unitName: u.name }))
    setUnitQuery(u.name)
    setUnitOpen(false)
    if (errors.unitId) setErrors((prev) => ({ ...prev, unitId: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clientErrors = validateNotice(data)
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      let result: { itemId?: string; error?: string; requestId?: string } = {}
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

      setSuccess({ itemId: result.itemId ?? '' })
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
          Notice Received
        </h1>
        <p className="text-brand-gray mb-2">
          Your notice to vacate has been submitted. Our team will review it and follow
          up with you by email to confirm the details and next steps.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
          Notice to Vacate
        </h1>
        <p className="text-brand-gray text-sm">
          Use this form to give Ground Floor Property Management your official notice
          that you are moving out of your unit.
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-secondary text-sm">
          {errors.submit}
        </div>
      )}

      <div className="space-y-5">
        <FormField
          label="Your Address"
          required
          hint="Start typing your street address and select your unit from the list."
          error={errors.unitId}
        >
          <div ref={unitBoxRef} className="relative">
            <input
              type="text"
              className="form-input"
              placeholder={units ? 'e.g. 21 Newcombe Dr - 106' : 'Loading addresses…'}
              disabled={!units && !unitsError}
              value={unitQuery}
              onChange={(e) => {
                setUnitQuery(e.target.value)
                setUnitOpen(true)
                // Typing invalidates any previous selection until a new one is made
                if (data.unitId) setData((prev) => ({ ...prev, unitId: '', unitName: '' }))
              }}
              onFocus={() => setUnitOpen(true)}
            />
            {unitsError && (
              <p className="text-xs text-secondary mt-1.5">
                We could not load the address list. Please refresh the page, or contact
                our office if the problem continues.
              </p>
            )}
            {unitOpen && units && filteredUnits.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-brand-border shadow-lg">
                {filteredUnits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                      onClick={() => selectUnit(u)}
                    >
                      {u.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {unitOpen && units && unitQuery.trim() && filteredUnits.length === 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-brand-border shadow-lg px-3 py-2 text-sm text-brand-gray">
                No matching address found. Check your spelling, or contact our office.
              </div>
            )}
          </div>
        </FormField>

        <FormField
          label="Requested Move-Out Date"
          required
          hint="Move-out date must be on the last day of the month, not the 1st."
          error={errors.moveOutDate}
        >
          <DateInput
            className="form-input"
            value={data.moveOutDate}
            onChange={(v) => set('moveOutDate', v)}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Full Name" required error={errors.fullName}>
            <input
              type="text"
              autoComplete="name"
              className="form-input"
              value={data.fullName}
              onChange={(e) => set('fullName', e.target.value)}
            />
          </FormField>
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
        </div>

        <FormField label="Reason for Moving Out" required error={errors.reason}>
          <select
            className="form-input"
            value={data.reason}
            onChange={(e) => set('reason', e.target.value)}
          >
            <option value="">Select a reason…</option>
            {NOTICE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Additional Details of Notice"
          required={data.reason === NOTICE_REASON_OTHER}
          hint={
            data.reason === NOTICE_REASON_OTHER
              ? 'Required — please explain your reason for moving out.'
              : 'Anything else we should know about your notice (optional).'
          }
          error={errors.details}
        >
          <textarea
            rows={4}
            maxLength={2000}
            className="form-input"
            value={data.details}
            onChange={(e) => set('details', e.target.value)}
          />
        </FormField>

        <FormField
          label="Forwarding Address"
          hint="Where you are moving to. This is important for the security deposit remittance (if applicable after move out)."
          error={errors.forwardingAddress}
        >
          <input
            type="text"
            autoComplete="off"
            className="form-input"
            value={data.forwardingAddress}
            onChange={(e) => set('forwardingAddress', e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Forwarding Postal Code" error={errors.forwardingPostal}>
            <input
              type="text"
              autoComplete="off"
              className="form-input"
              value={data.forwardingPostal}
              onChange={(e) => set('forwardingPostal', e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Are all occupants moving out?" required error={errors.occupantsMoving}>
          <select
            className="form-input"
            value={data.occupantsMoving}
            onChange={(e) => set('occupantsMoving', e.target.value)}
          >
            <option value="">Select an option…</option>
            {OCCUPANTS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Additional details regarding occupants moving out"
          hint="If anyone is staying in the unit, tell us who wishes to stay and who is moving out."
          error={errors.roommateDetails}
        >
          <input
            type="text"
            className="form-input"
            value={data.roommateDetails}
            onChange={(e) => set('roommateDetails', e.target.value)}
          />
        </FormField>

        <FormField label="Signature" required hint="Please sign below." error={errors.signatureData}>
          <SignaturePad
            value={data.signatureData}
            onChange={(dataUrl) => set('signatureData', dataUrl)}
          />
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
              Submit Notice
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
