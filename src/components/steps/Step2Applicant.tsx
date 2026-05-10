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

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

export default function Step2Applicant({ data, onChange, errors, onFieldBlur }: Props) {
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
        Primary Applicant Information
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        Please provide your details exactly as they appear on your government-issued ID.
        If there are multiple applicants, you will enter their information in a later step.
      </p>

      <div className="form-section">
        <h3 className="section-title">Personal Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name" required error={err('firstName')}>
            <input className="form-input" value={data.firstName}
              onChange={f('firstName')} onBlur={blur('firstName')} placeholder="First" />
          </FormField>
          <FormField label="Last Name" required error={err('lastName')}>
            <input className="form-input" value={data.lastName}
              onChange={f('lastName')} onBlur={blur('lastName')} placeholder="Last" />
          </FormField>
          <FormField label="Email Address" required error={err('email')}>
            <input type="email" className="form-input" value={data.email}
              onChange={f('email')} onBlur={blur('email')} placeholder="you@example.com" />
          </FormField>
          <FormField label="Phone Number" required error={err('phone')}>
            <input type="tel" className="form-input" value={data.phone}
              onChange={handlePhone} onBlur={blur('phone')} placeholder="(506) 555-0100" />
          </FormField>
          <FormField label="Date of Birth" error={err('birthDate')}>
            <input type="date" className="form-input" value={data.birthDate}
              onChange={f('birthDate')} onBlur={blur('birthDate')} />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Current Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Street Address" required error={err('currentAddress')}>
              <input className="form-input" value={data.currentAddress}
                onChange={f('currentAddress')} onBlur={blur('currentAddress')} placeholder="123 Main Street" />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField label="Street Address Line 2">
              <input className="form-input" value={data.currentAddressLine2}
                onChange={f('currentAddressLine2')} placeholder="Apt, Suite, Unit (optional)" />
            </FormField>
          </div>
          <FormField label="City" required error={err('currentCity')}>
            <input className="form-input" value={data.currentCity}
              onChange={f('currentCity')} onBlur={blur('currentCity')} placeholder="Moncton" />
          </FormField>
          <FormField label="Province">
            <select className="form-input" value={data.currentProvince} onChange={f('currentProvince')}>
              <option value="">Select province</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Postal Code">
            <input className="form-input" value={data.currentPostal}
              onChange={f('currentPostal')} placeholder="E1A 1A1" />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Unit Viewing</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Have you seen this unit?" required error={err('viewedUnit')}>
            <select className="form-input" value={data.viewedUnit}
              onChange={f('viewedUnit')} onBlur={blur('viewedUnit')}>
              <option value="">Select...</option>
              <option value="No">No</option>
              <option value="Yes - In Person">Yes — In Person</option>
              <option value="Yes - Virtual Tour">Yes — Virtual Tour</option>
              <option value="Scheduled">Viewing Scheduled</option>
            </select>
          </FormField>
          {(data.viewedUnit === 'Yes - In Person' || data.viewedUnit === 'Yes - Virtual Tour') && (
            <FormField label="Who showed you the unit?" hint="Name of the person who conducted the viewing">
              <input className="form-input" value={data.viewedByName}
                onChange={f('viewedByName')} placeholder="e.g. Sarah Jones" />
            </FormField>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Household</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Number of Children (ages and gender)" required error={err('children')}
            hint='e.g. "2 children — boy age 5, girl age 8" or "None"'>
            <input className="form-input" value={data.children}
              onChange={f('children')} onBlur={blur('children')} placeholder="None" />
          </FormField>
          <FormField label="Pets (type and number)" hint='e.g. "1 cat" or "None"'>
            <input className="form-input" value={data.pets} onChange={f('pets')} placeholder="None" />
          </FormField>
        </div>
      </div>
    </div>
  )
}
