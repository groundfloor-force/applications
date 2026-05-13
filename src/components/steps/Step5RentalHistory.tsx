'use client'

import { useEffect, useState } from 'react'
import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
  onFieldBlur?: (field: string) => void
}

export default function Step5RentalHistory({ data, onChange, errors, onFieldBlur }: Props) {
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
        Rental History
      </h2>
      <p className="text-sm text-brand-gray mb-2">
        Providing your current landlord&apos;s information is paramount to processing this application.
        Accurate phone numbers and/or email address are required in order to process your application
        in a timely manner.
      </p>
      <div className="bg-amber-50 border border-amber-200  p-3 text-sm text-amber-800 mb-3">
        If this is your first rental, enter your parents&apos; or guardian&apos;s information and note
        &ldquo;First Rental&rdquo; in the Reason for Leaving field.
      </div>
      <div className="bg-amber-50 border border-amber-200  p-3 text-sm text-amber-800 mb-6">
        If you are a homeowner, list yourself as the landlord and note &ldquo;Homeowner&rdquo; or
        &ldquo;Sold Home&rdquo; in the Reason for Leaving field.
      </div>

      <div className="form-section">
        <h3 className="section-title">Previous Landlord</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Landlord First Name" required error={err('prevLandlordFirstName')}>
            <input className="form-input" value={data.prevLandlordFirstName}
              onChange={f('prevLandlordFirstName')} onBlur={blur('prevLandlordFirstName')} />
          </FormField>
          <FormField label="Landlord Last Name" required error={err('prevLandlordLastName')}>
            <input className="form-input" value={data.prevLandlordLastName}
              onChange={f('prevLandlordLastName')} onBlur={blur('prevLandlordLastName')} />
          </FormField>
          <FormField label="Landlord Phone" required error={err('prevLandlordPhone')}>
            <input type="tel" className="form-input" value={data.prevLandlordPhone}
              onChange={(e) => onChange({ prevLandlordPhone: formatPhone(e.target.value) })}
              onBlur={blur('prevLandlordPhone')} />
          </FormField>
          <FormField label="Landlord Email" required error={err('prevLandlordEmail')}>
            <input type="email" className="form-input" value={data.prevLandlordEmail}
              onChange={f('prevLandlordEmail')} onBlur={blur('prevLandlordEmail')} />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Tenancy Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Previous Monthly Rent ($)">
            <input type="number" className="form-input" value={data.prevMonthlyRent} onChange={f('prevMonthlyRent')} onWheel={(e) => (e.target as HTMLInputElement).blur()} placeholder="1200" />
          </FormField>
          <div /> {/* spacer */}
          <FormField label="Rented From" hint="Month and year you moved in">
            <input type="month" className="form-input" value={data.rentedFrom} onChange={f('rentedFrom')} />
          </FormField>
          <FormField label="Rented To" hint="Month and year you moved out (or current)">
            <input type="month" className="form-input" value={data.rentedTo} onChange={f('rentedTo')} />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Reason for Leaving" required error={err('reasonForLeaving')}>
              <textarea
                className="form-input min-h-[80px]"
                value={data.reasonForLeaving}
                onChange={f('reasonForLeaving')}
                onBlur={blur('reasonForLeaving')}
                placeholder="e.g. Looking for a larger space, relocating for work..."
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  )
}
