'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { FormData, FormConfig } from '@/lib/types'
import { initialFormData } from '@/lib/types'
import { useT, useLocale } from '@/lib/locale-context'
import ProgressBar from './ProgressBar'
import StepDocuments from './StepDocuments'
import IdleWarning from './IdleWarning'
import Step1Property from './steps/Step1Property'
import Step2Applicant from './steps/Step2Applicant'
import Step3Details from './steps/Step3Details'
import Step4Occupants from './steps/Step4Occupants'
import Step5RentalHistory from './steps/Step5RentalHistory'
import Step6Employment from './steps/Step6Employment'
import Step7References from './steps/Step7References'
import Step8Terms from './steps/Step8Terms'
import { saveFormToStorage, loadFormFromStorage, clearFormFromStorage, formatSavedAt } from '@/lib/utils'

const TOTAL_STEPS = 8

type ValidationMessages = ReturnType<typeof useT>['validation']

function validate(step: number, data: FormData, v: ValidationMessages): Record<string, string> {
  const e: Record<string, string> = {}

  if (step === 2) {
    if (!data.firstName.trim()) e.firstName = v.firstNameRequired
    if (!data.lastName.trim()) e.lastName = v.lastNameRequired
    if (!data.email.trim()) e.email = v.emailRequired
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = v.emailInvalid
    if (!data.phone.trim()) e.phone = v.phoneRequired
    if (!data.currentAddress.trim()) e.currentAddress = v.streetRequired
    if (!data.currentCity.trim()) e.currentCity = v.cityRequired
    if (!data.currentProvince.trim()) e.currentProvince = v.provinceRequired
    if (!data.birthDate) e.birthDate = v.birthDateRequired
    if (!data.children.trim()) e.children = v.childrenRequired
    if (!data.viewedUnit) e.viewedUnit = v.viewedRequired
    if (!data.leasingAgent.trim()) e.leasingAgent = v.leasingAgentRequired
  }

  if (step === 3) {
    if (!data.monthlyRent) e.monthlyRent = v.monthlyRentRequired
    if (!data.securityDeposit) e.securityDeposit = v.securityDepositRequired
    if (!data.moveInDate) e.moveInDate = v.moveInRequired
    if (!data.numVehicles.trim()) e.numVehicles = v.numVehiclesRequired
  }

  if (step === 4) {
    data.occupants.forEach((occ, i) => {
      if (!occ.firstName.trim()) e[`occ${i}_firstName`] = v.firstNameRequired
      if (!occ.lastName.trim()) e[`occ${i}_lastName`] = v.lastNameRequired
      if (!occ.email.trim()) e[`occ${i}_email`] = v.emailRequired
      if (!occ.phone.trim()) e[`occ${i}_phone`] = v.phoneRequired
      if (!occ.occupation.trim()) e[`occ${i}_occupation`] = v.occupationRequired
      if (!occ.employerName.trim()) e[`occ${i}_employerName`] = v.employerNameRequired
      if (!occ.employerAddress.trim()) e[`occ${i}_employerAddress`] = v.employerAddressRequired
    })
  }

  if (step === 5) {
    if (!data.prevLandlordFirstName.trim()) e.prevLandlordFirstName = v.prevLandlordFirstRequired
    if (!data.prevLandlordLastName.trim()) e.prevLandlordLastName = v.prevLandlordLastRequired
    if (!data.prevLandlordPhone.trim()) e.prevLandlordPhone = v.prevLandlordPhoneRequired
    if (!data.prevLandlordEmail.trim()) e.prevLandlordEmail = v.prevLandlordEmailRequired
    if (!data.reasonForLeaving.trim()) e.reasonForLeaving = v.reasonForLeavingRequired
  }

  if (step === 6) {
    if (!data.employerName.trim()) e.employerName = v.employerNameRequired
  }

  // Co-signer email is required as soon as any co-signer detail is filled in
  // (because we need it later for lease signing). Validate on the last step
  // so we don't block the applicant earlier if they leave the section blank.
  if (step === 8) {
    if (!data.termsAgreed) e.termsAgreed = v.termsRequired
    if (!data.signatureData) e.signatureData = v.signatureRequired
    const cosignerStarted = !!(
      data.cosignerFirstName ||
      data.cosignerLastName ||
      data.cosignerPhone ||
      data.cosignerEmail
    )
    if (cosignerStarted) {
      if (!data.cosignerEmail.trim()) e.cosignerEmail = v.cosignerEmailRequired
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.cosignerEmail))
        e.cosignerEmail = v.cosignerEmailInvalid
    }
  }

  return e
}

interface Props {
  config: FormConfig
  autofill?: boolean
}

const TEST_PROPERTY = {
  id: '474955392',
  name: '45 Fairview Knoll #3',
  address: '45 Fairview Knoll Dr',
  unit: '3',
  city: 'Moncton',
  postal: 'E1A 9G3',
  rent: 1350,
  bedrooms: '2 Bed',
  bathrooms: '1 Bath',
  pictureUrl: '',
  available: 'NOW',
  laundry: 'IS-HU',
  status: 'VACANT',
  parking: '1',
  pets: 'Y/Y',
  balcony: 'NO',
  floor: 'Basement',
}

const TEST_DATA: Omit<FormData, 'documents' | 'occupantDocs'> = {
  property: TEST_PROPERTY,
  properties: [TEST_PROPERTY],
  firstName: 'Jessica',
  lastName: 'Tester',
  email: 'jessica.tester@example.com',
  phone: '506-555-1001',
  birthDate: '1992-04-18',
  currentAddress: '88 Queen St',
  currentAddressLine2: 'Apt 5B',
  currentCity: 'Moncton',
  currentProvince: 'NB',
  currentPostal: 'E1C 1B2',
  children: '1',
  childrenList: [{ name: 'Sophie Tester', birthDate: '2020-06-10', gender: 'Female' }],
  pets: '1 cat',
  petNames: 'Whiskers',
  petPhotos: [],
  sin: '',
  idDocs: [],
  leasingAgent: 'Sarah Jones',
  securityDeposit: '1350',
  monthlyRent: '1350',
  numOccupants: 4,
  numVehicles: '2',
  moveInDate: '2025-08-01',
  viewedUnit: 'Yes - In Person',
  occupants: [
    {
      firstName: 'Daniel',
      lastName: 'Tester',
      email: 'daniel.tester@example.com',
      phone: '506-555-1002',
      birthDate: '1990-09-05',
      relationship: 'Spouse',
      occupation: 'Employed',
      employerName: 'Moncton City Hall',
      employerAddress: '655 Main St',
      employerAddressLine2: '',
      employerCity: 'Moncton',
      employerProvince: 'NB',
      employerPostal: 'E1C 1E8',
      employerPhone: '506-555-2000',
      employmentFrom: '2019-03-01',
      employmentTo: '',
      monthlyGrossSalary: '5200',
      positionHeld: 'Senior Analyst',
      sameAsPrimary: true,
      currentAddress: '', currentAddressLine2: '', currentCity: '',
      currentProvince: '', currentPostal: '',
      prevLandlordFirstName: '', prevLandlordLastName: '',
      prevLandlordPhone: '', prevLandlordEmail: '',
      prevReasonForLeaving: '',
    },
    {
      firstName: 'Olivia',
      lastName: 'Roommate',
      email: 'olivia.roommate@example.com',
      phone: '506-555-1003',
      birthDate: '1998-01-22',
      relationship: 'Roommate',
      occupation: 'Student',
      employerName: 'Universite de Moncton',
      employerAddress: '18 Ave Antonine-Maillet',
      employerAddressLine2: '',
      employerCity: 'Moncton',
      employerProvince: 'NB',
      employerPostal: 'E1A 3E9',
      employerPhone: '506-858-4000',
      employmentFrom: '2022-09-01',
      employmentTo: '',
      monthlyGrossSalary: '1800',
      positionHeld: 'Teaching Assistant',
      sameAsPrimary: false,
      currentAddress: '42 University Ave',
      currentAddressLine2: 'Apt 12',
      currentCity: 'Moncton',
      currentProvince: 'NB',
      currentPostal: 'E1A 0E1',
      prevLandlordFirstName: 'Marie',
      prevLandlordLastName: 'Leblanc',
      prevLandlordPhone: '506-555-7777',
      prevLandlordEmail: 'marie.leblanc@example.com',
      prevReasonForLeaving: 'Moving in with friends to share rent',
    },
    {
      firstName: 'Ryan',
      lastName: 'Tester',
      email: 'ryan.tester@example.com',
      phone: '506-555-1004',
      birthDate: '2001-07-14',
      relationship: 'Child',
      occupation: 'Part-time employed',
      employerName: 'Tim Hortons',
      employerAddress: '500 St George Blvd',
      employerAddressLine2: '',
      employerCity: 'Moncton',
      employerProvince: 'NB',
      employerPostal: 'E1E 2B8',
      employerPhone: '506-555-3000',
      employmentFrom: '2023-06-01',
      employmentTo: '',
      monthlyGrossSalary: '1200',
      positionHeld: 'Team Member',
      sameAsPrimary: true,
      currentAddress: '', currentAddressLine2: '', currentCity: '',
      currentProvince: '', currentPostal: '',
      prevLandlordFirstName: '', prevLandlordLastName: '',
      prevLandlordPhone: '', prevLandlordEmail: '',
      prevReasonForLeaving: '',
    },
  ],
  prevLandlordFirstName: 'Robert',
  prevLandlordLastName: 'Landlord',
  prevMonthlyRent: '1150',
  rentedFrom: '2021-09-01',
  rentedTo: '2025-07-31',
  reasonForLeaving: 'Looking for a larger space for the family',
  prevLandlordPhone: '506-555-4000',
  prevLandlordEmail: 'robert.landlord@example.com',
  employerName: 'Atlantic Health Sciences',
  monthlyGrossSalary: '4800',
  ref1FirstName: 'Patricia',
  ref1LastName: 'Friend',
  ref1Phone: '506-555-5000',
  ref1Email: 'patricia.friend@example.com',
  cosignerFirstName: 'Margaret',
  cosignerLastName: 'Tester',
  cosignerRelationship: 'Parent',
  cosignerEmail: 'margaret.tester@example.com',
  cosignerPhone: '506-555-6000',
  cosignerDocs: [],
  supportingDocs: [],
  additionalDetails: 'TEST APPLICATION — please delete. We are a quiet, responsible family and have excellent rental history.',
  termsAgreed: true,
  signatureData: '',
  signedAt: '',
}

export default function ApplicationForm({ config, autofill }: Props) {
  const router = useRouter()
  const t = useT()
  const locale = useLocale()
  const [step, setStep] = useState(autofill ? 2 : 0)
  const [data, setData] = useState<FormData>(autofill ? { ...TEST_DATA, documents: [], occupantDocs: [] } : initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [savedBanner, setSavedBanner] = useState<{ step: number; savedAt: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Check for saved form on mount
  useEffect(() => {
    if (autofill) return
    const saved = loadFormFromStorage()
    if (saved && saved.step > 0) {
      setSavedBanner({ step: saved.step, savedAt: saved.savedAt })
    }
  }, [autofill])

  // Scroll to top whenever the step changes. Doing this in an effect (rather
  // than inline after setState) ensures the new step content has been
  // committed to the DOM before the scroll happens; otherwise smooth-scroll
  // can race against layout and not reach the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [step])

  // Autosave debounced on data/step changes
  useEffect(() => {
    if (autofill || step === 0) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveFormToStorage(step, data as unknown as Record<string, unknown>)
    }, 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [data, step, autofill])

  // Attach a synthetic pay stub file when autofilling
  useEffect(() => {
    if (!autofill) return
    const content = [
      'GROUND FLOOR PM — TEST PAY STUB',
      '================================',
      'Employee:   Jessica Tester',
      'Employer:   Atlantic Health Sciences',
      'Period:     2025-04-01 to 2025-04-30',
      'Gross Pay:  $4,800.00',
      'Deductions: $1,200.00',
      'Net Pay:    $3,600.00',
      '',
      '** FOR TESTING PURPOSES ONLY — PLEASE DELETE **',
    ].join('\n')
    const blob = new Blob([content], { type: 'application/pdf' })
    const file = new File([blob], 'test-paystub.pdf', { type: 'application/pdf' })
    setData((prev) => ({ ...prev, documents: [file], petPhotos: [], cosignerDocs: [], supportingDocs: [] }))
  }, [autofill])

  const onChange = useCallback((updates: Partial<FormData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const onFieldBlur = useCallback((field: string) => {
    setTouched((prev) => new Set([...prev, field]))
    setErrors((prev) => {
      // Re-validate silently — errors updated but only visible for touched fields
      return prev
    })
  }, [])

  // Only show errors for fields the user has touched (or all after hitting Next)
  const visibleErrors = useMemo(
    () => Object.fromEntries(Object.entries(errors).filter(([k]) => touched.has(k))),
    [errors, touched]
  )

  const handleNext = () => {
    const errs = validate(step, data, t.validation)
    if (Object.keys(errs).length > 0) {
      // Mark all error fields as touched so they all show
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

  // Jump to a step from the progress bar — only allowed for completed (earlier) steps.
  // ProgressBar emits bar-step numbers (1..7) which map to actual form steps 2..8.
  const handleJumpToStep = (barStep: number) => {
    const targetStep = barStep + 1
    if (targetStep >= step) return
    setErrors({})
    setTouched(new Set())
    setStep(targetStep)
  }

  const handleSubmit = async () => {
    const errs = validate(8, data, t.validation)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const formPayload = new FormData()

      // Serialize everything except File arrays
      const { documents, occupantDocs, petPhotos, cosignerDocs, supportingDocs, idDocs, ...rest } = data
      formPayload.append('data', JSON.stringify(rest))
      formPayload.append('locale', locale)

      // Primary applicant documents
      documents.forEach((file, i) => {
        formPayload.append(`doc_${i}`, file, file.name)
      })

      // Occupant documents
      occupantDocs.forEach((files, occIdx) => {
        files.forEach((file, fileIdx) => {
          formPayload.append(`occdoc_${occIdx}_${fileIdx}`, file, file.name)
        })
      })

      // Pet photos
      petPhotos.forEach((file, i) => {
        formPayload.append(`petphoto_${i}`, file, file.name)
      })

      // Co-signer proof of income / savings
      cosignerDocs.forEach((file, i) => {
        formPayload.append(`cosignerdoc_${i}`, file, file.name)
      })

      // Supporting documents (Review step)
      supportingDocs.forEach((file, i) => {
        formPayload.append(`supdoc_${i}`, file, file.name)
      })

      // Government photo ID (optional)
      idDocs.forEach((file, i) => {
        formPayload.append(`iddoc_${i}`, file, file.name)
      })

      const res = await fetch('/api/submit', { method: 'POST', body: formPayload })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Submission failed')

      clearFormFromStorage()
      router.push(`/apply/success?token=${result.token ?? ''}&lang=${locale}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrors({ submit: message })
      setSubmitting(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const stepProps = { data, onChange, errors: visibleErrors, onFieldBlur }

  const handleResumeYes = () => {
    const saved = loadFormFromStorage()
    if (!saved) return
    setData((prev) => ({ ...prev, ...(saved.data as Partial<FormData>) }))
    setStep(saved.step)
    setSavedBanner(null)
  }

  const handleResumeFresh = () => {
    clearFormFromStorage()
    setSavedBanner(null)
  }

  const handleIdleClear = () => {
    clearFormFromStorage()
    setData(initialFormData)
    setStep(0)
  }

  return (
    <div>
      <IdleWarning onClear={handleIdleClear} />

      {/* Resume saved application banner */}
      {savedBanner && step === 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-up">
          <div className="flex-1">
            <p className="text-sm text-amber-800" style={{ fontWeight: 600 }}>{t.resume.title}</p>
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

      {/* ── Steps 0–1: full-width screens (documents / property search) ── */}
      {step <= 1 && (
        <div className="min-h-[400px]">
          {step === 0 && <StepDocuments onBegin={() => setStep(1)} />}
          {step === 1 && <Step1Property {...stepProps} onNext={handleNext} />}
        </div>
      )}

      {/* ── Steps 2–8: form layout with progress bar + optional property sidebar ── */}
      {step > 1 && (
        <>
          <ProgressBar current={step - 1} total={TOTAL_STEPS - 1} onJump={handleJumpToStep} />

          <div className="lg:flex lg:gap-8 lg:items-start">
            {/* Property sidebar — desktop only, sticks while scrolling */}
            {data.property && (
              <div className="hidden lg:block lg:w-64 flex-shrink-0 lg:sticky lg:top-24">
                <div className="border border-brand-border bg-white overflow-hidden">
                  {/* Photo (primary property) */}
                  <div className="h-36 bg-brand-bg relative overflow-hidden">
                    {data.property.pictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.property.pictureUrl}
                        alt={data.property.address}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #e6f0f9 0%, #f1f4f8 100%)' }}>
                        <svg className="w-10 h-10 text-primary-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          <polyline strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span className="text-xs text-primary-300" style={{ fontWeight: 600 }}>Photo coming soon</span>
                      </div>
                    )}
                  </div>
                  {/* Details */}
                  <div className="p-4">
                    <p className="text-xs text-primary-500 uppercase tracking-widest mb-1" style={{ fontWeight: 600 }}>
                      {data.properties.length > 1 ? `${t.step8.propertyCard} (${data.properties.length})` : t.step8.propertyCard}
                    </p>
                    {data.properties.length > 1 ? (
                      <div className="space-y-2 mb-3">
                        {data.properties.map((p, i) => (
                          <div key={p.id} className="flex gap-2 items-start">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-brand-dark text-xs leading-snug truncate" style={{ fontWeight: 600 }}>
                                {p.address}{p.unit ? `, Unit ${p.unit}` : ''}
                              </p>
                              <p className="text-[10px] text-brand-gray">
                                {p.city}{p.rent > 0 && ` · $${p.rent.toLocaleString()}/mo`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <p className="text-brand-dark text-sm leading-snug mb-1" style={{ fontWeight: 600 }}>
                          {data.property.address}{data.property.unit ? `, Unit ${data.property.unit}` : ''}
                        </p>
                        <p className="text-xs text-brand-gray mb-2">{data.property.city}</p>
                        {data.property.rent > 0 && (
                          <p className="text-lg text-primary-500 mb-2" style={{ fontWeight: 700 }}>
                            ${data.property.rent.toLocaleString()}<span className="text-xs text-brand-gray ml-1" style={{ fontWeight: 400 }}>/mo</span>
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {data.property.bedrooms && (
                            <span className="text-xs bg-brand-bg text-brand-dark px-2 py-0.5 border border-brand-border">{data.property.bedrooms}</span>
                          )}
                          {data.property.bathrooms && (
                            <span className="text-xs bg-brand-bg text-brand-dark px-2 py-0.5 border border-brand-border">{data.property.bathrooms}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile property banner */}
            {data.property && (
              <div className="lg:hidden mb-6 border border-brand-border bg-white overflow-hidden">
                {data.properties.length > 1 ? (
                  <div className="p-3">
                    <p className="text-xs text-primary-500 uppercase tracking-widest mb-2" style={{ fontWeight: 600 }}>
                      {t.step8.propertyCard} ({data.properties.length})
                    </p>
                    <div className="space-y-1.5">
                      {data.properties.map((p, i) => (
                        <div key={p.id} className="flex gap-2 items-start">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-brand-dark text-sm leading-snug" style={{ fontWeight: 600 }}>
                            {p.address}{p.unit ? `, Unit ${p.unit}` : ''}
                            <span className="text-xs text-brand-gray ml-2 font-normal">
                              {p.city}{p.rent > 0 && ` · $${p.rent.toLocaleString()}/mo`}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex">
                    <div className="w-28 flex-shrink-0 bg-brand-bg relative overflow-hidden">
                      {data.property.pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={data.property.pictureUrl} alt={data.property.address}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e6f0f9 0%, #f1f4f8 100%)' }}>
                          <svg className="w-8 h-8 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <p className="text-xs text-primary-500 uppercase tracking-widest mb-0.5" style={{ fontWeight: 600 }}>{t.step8.propertyCard}</p>
                      <p className="text-brand-dark text-sm leading-snug" style={{ fontWeight: 600 }}>
                        {data.property.address}{data.property.unit ? `, Unit ${data.property.unit}` : ''} — {data.property.city}
                      </p>
                      {data.property.rent > 0 && (
                        <p className="text-xs text-primary-500 mt-1" style={{ fontWeight: 600 }}>${data.property.rent.toLocaleString()}/mo</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form content */}
            <div className="flex-1 min-w-0">
              <div className="min-h-[400px]">
                {step === 2 && <Step2Applicant {...stepProps} />}
                {step === 3 && <Step3Details {...stepProps} />}
                {step === 4 && <Step4Occupants {...stepProps} />}
                {step === 5 && <Step5RentalHistory {...stepProps} />}
                {step === 6 && <Step6Employment {...stepProps} />}
                {step === 7 && <Step7References {...stepProps} />}
                {step === 8 && (
                  <Step8Terms
                    {...stepProps}
                    config={config}
                    submitting={submitting}
                    onSubmit={handleSubmit}
                  />
                )}
              </div>

              {/* Navigation */}
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
          </div>
        </>
      )}
    </div>
  )
}
