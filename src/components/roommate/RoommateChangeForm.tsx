'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProgressBar from '@/components/ProgressBar'
import IdleWarning from '@/components/IdleWarning'
import { useT, useLocale } from '@/lib/locale-context'
import { formatSavedAt } from '@/lib/utils'
import type { RoommateChangeData } from '@/lib/types'
import {
  buildRoommateChangeSummary,
  clearRoommateForm,
  initialRoommateChangeData,
  loadRoommateForm,
  ROOMMATE_SUCCESS_KEY,
  saveRoommateForm,
  validateRoommateStep,
} from '@/lib/roommate-change'
import RmStepProperty from './RmStepProperty'
import RmStepTenants from './RmStepTenants'
import RmStepStayLeave from './RmStepStayLeave'
import RmStepIncoming from './RmStepIncoming'
import RmStepConfirm from './RmStepConfirm'
import RmStepFee from './RmStepFee'
import RmStepReview from './RmStepReview'

const TOTAL_STEPS = 7

const TEST_ROOMMATE_DATA: RoommateChangeData = {
  unitId: '11476929693',
  unitName: '45 Fairview Knoll Drive - 3',
  tenants: [
    {
      firstName: 'Jessica',
      lastName: 'Tester',
      email: 'jessica.tester@example.com',
      phone: '506-555-1001',
      status: 'staying',
    },
    {
      firstName: 'Olivia',
      lastName: 'Roommate',
      email: 'olivia.roommate@example.com',
      phone: '506-555-1003',
      status: 'leaving',
    },
  ],
  hasIncoming: true,
  incoming: [
    {
      firstName: 'Daniel',
      lastName: 'Tester',
      email: 'daniel.tester@example.com',
      phone: '506-555-1002',
      status: '',
    },
  ],
  effectiveDate: '2026-10-01',
  noticeAcknowledged: true,
  feeAgreed: true,
  signatureData: '',
  signedAt: '',
}

export default function RoommateChangeForm({ autofill }: { autofill?: boolean }) {
  const router = useRouter()
  const t = useT()
  const locale = useLocale()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<RoommateChangeData>(
    autofill ? TEST_ROOMMATE_DATA : initialRoommateChangeData,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [savedBanner, setSavedBanner] = useState<{ step: number; savedAt: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (autofill) return
    const saved = loadRoommateForm()
    if (saved && saved.step > 1) {
      setSavedBanner({ step: saved.step, savedAt: saved.savedAt })
    }
  }, [autofill])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [step])

  useEffect(() => {
    if (autofill) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveRoommateForm(step, data), 800)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data, step, autofill])

  const onChange = useCallback((updates: Partial<RoommateChangeData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const visibleErrors = useMemo(
    () => Object.fromEntries(Object.entries(errors).filter(([k]) => touched.has(k))),
    [errors, touched],
  )

  const handleNext = () => {
    const errs = validateRoommateStep(step, data, t.rm.validation)
    if (Object.keys(errs).length > 0) {
      setTouched((prev) => new Set([...prev, ...Object.keys(errs)]))
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors({})
    setTouched(new Set())
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  const handleBack = () => {
    setErrors({})
    setTouched(new Set())
    setStep((s) => Math.max(s - 1, 1))
  }

  const handleJumpToStep = (target: number) => {
    if (target >= step) return
    setErrors({})
    setTouched(new Set())
    setStep(target)
  }

  const handleSubmit = async () => {
    const errs = validateRoommateStep(7, data, t.rm.validation)
    if (Object.keys(errs).length > 0) {
      setTouched(new Set(Object.keys(errs)))
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const res = await fetch('/api/roommate-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, locale }),
      })
      let result: { error?: string; requestId?: string } = {}
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

      try {
        sessionStorage.setItem(ROOMMATE_SUCCESS_KEY, JSON.stringify({
          ...buildRoommateChangeSummary(data),
          locale,
        }))
      } catch {
        // ignore
      }
      clearRoommateForm()
      router.push(`/apply/roommate/success?lang=${locale}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrors({ submit: message })
      setTouched((prev) => new Set([...prev, 'submit']))
      setSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleResumeYes = () => {
    const saved = loadRoommateForm()
    if (!saved) return
    setData(saved.data)
    setStep(saved.step)
    setSavedBanner(null)
  }

  const handleResumeFresh = () => {
    clearRoommateForm()
    setData(initialRoommateChangeData())
    setStep(1)
    setSavedBanner(null)
  }

  const labels = [
    t.rm.progressProperty,
    t.rm.progressTenants,
    t.rm.progressStayLeave,
    t.rm.progressIncoming,
    t.rm.progressConfirm,
    t.rm.progressFee,
    t.rm.progressReview,
  ]

  return (
    <div>
      <IdleWarning onClear={handleResumeFresh} />

      {savedBanner && step === 1 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up">
          <div className="flex-1">
            <p className="text-sm text-amber-800" style={{ fontWeight: 600 }}>{t.rm.resumeTitle}</p>
            <p className="text-xs text-amber-600">
              {t.resume.lastSavedPrefix} {formatSavedAt(savedBanner.savedAt)}{t.resume.lastSavedSuffix}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleResumeYes} className="px-4 py-1.5 bg-amber-500 text-white text-sm hover:bg-amber-600 transition-all" style={{ fontWeight: 600 }}>
              {t.resume.resume}
            </button>
            <button onClick={handleResumeFresh} className="px-4 py-1.5 border border-amber-300 text-amber-700 text-sm hover:bg-amber-100 transition-all" style={{ fontWeight: 600 }}>
              {t.resume.startFresh}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs uppercase tracking-widest text-brand-gray mb-2" style={{ fontWeight: 600 }}>
        {t.rm.title}
      </p>

      <ProgressBar current={step} total={TOTAL_STEPS} onJump={handleJumpToStep} labels={labels} />

      <div className="min-h-[400px]">
        {step === 1 && <RmStepProperty data={data} onChange={onChange} errors={visibleErrors} />}
        {step === 2 && <RmStepTenants data={data} onChange={onChange} errors={visibleErrors} />}
        {step === 3 && <RmStepStayLeave data={data} onChange={onChange} errors={visibleErrors} />}
        {step === 4 && <RmStepIncoming data={data} onChange={onChange} errors={visibleErrors} />}
        {step === 5 && <RmStepConfirm data={data} onJump={handleJumpToStep} />}
        {step === 6 && <RmStepFee data={data} onChange={onChange} errors={visibleErrors} />}
        {step === 7 && (
          <RmStepReview
            data={data}
            submitting={submitting}
            errors={visibleErrors}
            onJump={handleJumpToStep}
            onChange={onChange}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center mt-10 pt-6 border-t border-brand-border">
        <button
          type="button"
          onClick={handleBack}
          disabled={step <= 1}
          className="btn-secondary disabled:opacity-30 w-full sm:w-auto"
        >
          {t.common.back}
        </button>

        {step < TOTAL_STEPS && (
          <button type="button" onClick={handleNext} className="btn-primary w-full sm:w-auto">
            {t.common.continue}
            <svg className="w-4 h-4 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
