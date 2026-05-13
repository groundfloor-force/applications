'use client'

import { useEffect, useState } from 'react'
import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'
import { useT } from '@/lib/locale-context'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
  onFieldBlur?: (field: string) => void
}

export default function Step5RentalHistory({ data, onChange, errors, onFieldBlur }: Props) {
  const t = useT()
  const [touched, setTouched] = useState<Set<string>>(new Set())

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

  const f =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ [field]: e.target.value })

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step5.title}
      </h2>
      <p className="text-sm text-brand-gray mb-2">
        {t.step5.intro}
      </p>
      <div className="bg-amber-50 border border-amber-200  p-3 text-sm text-amber-800 mb-3">
        {t.step5.firstRental}
      </div>
      <div className="bg-amber-50 border border-amber-200  p-3 text-sm text-amber-800 mb-6">
        {t.step5.homeowner}
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step5.prevLandlord}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.step5.landlordFirstName} required error={err('prevLandlordFirstName')}>
            <input className="form-input" value={data.prevLandlordFirstName}
              onChange={f('prevLandlordFirstName')} onBlur={blur('prevLandlordFirstName')} />
          </FormField>
          <FormField label={t.step5.landlordLastName} required error={err('prevLandlordLastName')}>
            <input className="form-input" value={data.prevLandlordLastName}
              onChange={f('prevLandlordLastName')} onBlur={blur('prevLandlordLastName')} />
          </FormField>
          <FormField label={t.step5.landlordPhone} required error={err('prevLandlordPhone')}>
            <input type="tel" className="form-input" value={data.prevLandlordPhone}
              onChange={(e) => onChange({ prevLandlordPhone: formatPhone(e.target.value) })}
              onBlur={blur('prevLandlordPhone')} />
          </FormField>
          <FormField label={t.step5.landlordEmail} required error={err('prevLandlordEmail')}>
            <input type="email" className="form-input" value={data.prevLandlordEmail}
              onChange={f('prevLandlordEmail')} onBlur={blur('prevLandlordEmail')} />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step5.tenancyDetails}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.step5.prevMonthlyRent}>
            <input type="number" className="form-input" value={data.prevMonthlyRent} onChange={f('prevMonthlyRent')} onWheel={(e) => (e.target as HTMLInputElement).blur()} placeholder="1200" />
          </FormField>
          <div /> {/* spacer */}
          <FormField label={t.step5.rentedFrom} hint={t.step5.rentedFromHint}>
            <input type="month" className="form-input" value={data.rentedFrom} onChange={f('rentedFrom')} />
          </FormField>
          <FormField label={t.step5.rentedTo} hint={t.step5.rentedToHint}>
            <input type="month" className="form-input" value={data.rentedTo} onChange={f('rentedTo')} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label={t.step5.reasonForLeaving} required error={err('reasonForLeaving')}>
              <textarea
                className="form-input min-h-[80px]"
                value={data.reasonForLeaving}
                onChange={f('reasonForLeaving')}
                onBlur={blur('reasonForLeaving')}
                placeholder={t.step5.reasonPlaceholder}
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  )
}
