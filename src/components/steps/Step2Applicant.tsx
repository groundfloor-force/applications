'use client'

import { useEffect, useState } from 'react'
import { FormData, ChildDetail } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'
import { useT } from '@/lib/locale-context'
import DateInput from '@/components/DateInput'
import MultiFileUploader from '@/components/MultiFileUploader'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
  onFieldBlur?: (field: string) => void
}

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

export default function Step2Applicant({ data, onChange, errors, onFieldBlur }: Props) {
  const t = useT()
  const [touched, setTouched] = useState<Set<string>>(new Set())

  // When parent pushes errors (after Next click), reveal them all
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setTouched((prev) => new Set([...prev, ...Object.keys(errors)]))
    }
  }, [errors])

  const blur = (field: string) => () => {
    setTouched((prev) => new Set([...prev, field]))
    onFieldBlur?.(field)
  }

  const err = (field: string) => touched.has(field) ? errors[field] : undefined

  const f = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ [field]: e.target.value })

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ phone: formatPhone(e.target.value) })
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step2.title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        {t.step2.subtitle}
      </p>

      <div className="form-section">
        <h3 className="section-title">{t.step2.aboutYou}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.common.firstName} required error={err('firstName')}>
            <input className="form-input" value={data.firstName}
              onChange={f('firstName')} onBlur={blur('firstName')} />
          </FormField>
          <FormField label={t.common.lastName} required error={err('lastName')}>
            <input className="form-input" value={data.lastName}
              onChange={f('lastName')} onBlur={blur('lastName')} />
          </FormField>
          <FormField label={t.common.email} required error={err('email')}>
            <input type="email" className="form-input" value={data.email}
              onChange={f('email')} onBlur={blur('email')} placeholder="you@example.com" />
          </FormField>
          <FormField label={t.common.phone} required error={err('phone')}>
            <input type="tel" className="form-input" value={data.phone}
              onChange={handlePhone} onBlur={blur('phone')} placeholder="(506) 555-0100" />
          </FormField>
          <FormField label={t.step2.dateOfBirth} required error={err('birthDate')}>
            <DateInput
              value={data.birthDate}
              onChange={(v) => onChange({ birthDate: v })}
              onBlur={blur('birthDate')}
            />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step2.currentAddress}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label={t.common.addressFull} required error={err('currentAddress')}>
              <input className="form-input" value={data.currentAddress}
                onChange={f('currentAddress')} onBlur={blur('currentAddress')} />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label={t.step2.addressLine2} hint={t.step2.addressLine2Hint}>
              <input className="form-input" value={data.currentAddressLine2}
                onChange={f('currentAddressLine2')} />
            </FormField>
          </div>
          <FormField label={t.common.city} required error={err('currentCity')}>
            <input className="form-input" value={data.currentCity}
              onChange={f('currentCity')} onBlur={blur('currentCity')} />
          </FormField>
          <FormField label={t.common.province}>
            <select className="form-input" value={data.currentProvince} onChange={f('currentProvince')}>
              <option value="">{t.common.selectEllipsis}</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label={t.common.postal}>
            <input className="form-input" value={data.currentPostal}
              onChange={f('currentPostal')} placeholder="E1A 1A1" />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step2.unitViewing}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.step2.viewedQuestion} required error={err('viewedUnit')}>
            <select className="form-input" value={data.viewedUnit}
              onChange={f('viewedUnit')} onBlur={blur('viewedUnit')}>
              <option value="">{t.common.selectEllipsis}</option>
              <option value="No">{t.step2.viewedNo}</option>
              <option value="Yes - In Person">{t.step2.viewedYesPerson}</option>
              <option value="Yes - Virtual Tour">{t.step2.viewedYesVirtual}</option>
            </select>
          </FormField>
          {(data.viewedUnit === 'Yes - In Person' || data.viewedUnit === 'Yes - Virtual Tour') && (
            <FormField label={t.step2.viewedByName} hint={t.step2.viewedByHint}>
              <input className="form-input" value={data.viewedByName}
                onChange={f('viewedByName')} />
            </FormField>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step2.household}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.step2.children} required error={err('children')} hint={t.step2.childrenHint}>
            <input className="form-input" value={data.children}
              onChange={f('children')} onBlur={blur('children')} />
          </FormField>
          <FormField label={t.step2.petsLabel} hint={t.step2.petsHint}>
            <input className="form-input" value={data.pets} onChange={f('pets')} />
          </FormField>
        </div>

        {/* Optional child details */}
        <div className="mt-5 pt-5 border-t border-brand-border">
          <p className="text-sm text-brand-dark mb-1" style={{ fontWeight: 600 }}>
            {t.step2.childDetailsTitle}
          </p>
          <p className="text-xs text-brand-gray mb-3">{t.step2.childDetailsHint}</p>

          {data.childrenList.length > 0 && (
            <div className="space-y-3 mb-3">
              {data.childrenList.map((child, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
                  <FormField label={t.step2.childName}>
                    <input
                      className="form-input"
                      value={child.name}
                      onChange={(e) => {
                        const next = [...data.childrenList]
                        next[i] = { ...next[i], name: e.target.value }
                        onChange({ childrenList: next })
                      }}
                    />
                  </FormField>
                  <FormField label={t.step2.childBirthDate}>
                    <DateInput
                      value={child.birthDate}
                      onChange={(v) => {
                        const next = [...data.childrenList]
                        next[i] = { ...next[i], birthDate: v }
                        onChange({ childrenList: next })
                      }}
                    />
                  </FormField>
                  <button
                    type="button"
                    onClick={() => onChange({ childrenList: data.childrenList.filter((_, j) => j !== i) })}
                    className="h-[56px] px-3 text-sm text-secondary hover:underline whitespace-nowrap self-end"
                  >
                    {t.step2.removeChild}
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              onChange({
                childrenList: [...data.childrenList, { name: '', birthDate: '' } as ChildDetail],
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-brand-border hover:border-primary-400 hover:bg-primary-50 text-sm text-primary-600 transition-all"
            style={{ fontWeight: 600 }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {t.step2.addChild}
          </button>
        </div>

        {/* Pet photo */}
        <div className="mt-5 pt-5 border-t border-brand-border">
          <MultiFileUploader
            files={data.petPhotos}
            onChange={(files) => onChange({ petPhotos: files })}
            accept=".jpg,.jpeg,.png,.heic,.pdf"
            label={t.step2.petPhotoLabel}
            hint={t.step2.petPhotoHint}
          />
        </div>
      </div>
    </div>
  )
}
