'use client'

import { FormData, Occupant } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
}

const PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

function OccupantForm({
  index,
  occ,
  onUpdate,
  errors,
}: {
  index: number
  occ: Occupant
  onUpdate: (updates: Partial<Occupant>) => void
  errors: Record<string, string>
}) {
  const f = (field: keyof Occupant) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onUpdate({ [field]: e.target.value })

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ phone: formatPhone(e.target.value) })

  const handleEmployerPhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ employerPhone: formatPhone(e.target.value) })

  const errKey = (k: string) => errors[`occ${index}_${k}`]

  return (
    <div className="form-section border-l-4 border-primary-500">
      <h3 className="section-title">Occupant {index + 2} Information</h3>
      <p className="text-xs text-gray-400 mb-4">Required for all occupants 18 years and older</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <FormField label="First Name" required error={errKey('firstName')}>
          <input className="form-input" value={occ.firstName} onChange={f('firstName')} />
        </FormField>
        <FormField label="Last Name" required error={errKey('lastName')}>
          <input className="form-input" value={occ.lastName} onChange={f('lastName')} />
        </FormField>
        <FormField label="Email" required error={errKey('email')}>
          <input type="email" className="form-input" value={occ.email} onChange={f('email')} />
        </FormField>
        <FormField label="Phone Number" required error={errKey('phone')}>
          <input type="tel" className="form-input" value={occ.phone} onChange={handlePhone} />
        </FormField>
        <FormField label="Date of Birth">
          <input type="date" className="form-input" value={occ.birthDate} onChange={f('birthDate')} />
        </FormField>
        <FormField label="Relationship to Primary Applicant">
          <input className="form-input" value={occ.relationship} onChange={f('relationship')} placeholder="e.g. Spouse, Partner, Roommate" />
        </FormField>
        <FormField label="Occupation" required error={errKey('occupation')}>
          <input className="form-input" value={occ.occupation} onChange={f('occupation')} placeholder="e.g. Software Developer" />
        </FormField>
        <FormField label="Monthly Gross Salary ($)">
          <input type="number" className="form-input" value={occ.monthlyGrossSalary} onChange={f('monthlyGrossSalary')} placeholder="3000" />
        </FormField>
      </div>

      <h4 className="font-bold text-sm text-gray-700 mb-3">
        Employment Information
        <span className="font-normal text-gray-400 ml-2">(if unemployed or retired, use your current address)</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField label="Employer Name" required error={errKey('employerName')}
            hint="If unemployed or retired, please indicate here">
            <input className="form-input" value={occ.employerName} onChange={f('employerName')} />
          </FormField>
        </div>
        <FormField label="Position Held">
          <input className="form-input" value={occ.positionHeld} onChange={f('positionHeld')} />
        </FormField>
        <FormField label="Employer Phone">
          <input type="tel" className="form-input" value={occ.employerPhone} onChange={handleEmployerPhone} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Employer Street Address" required error={errKey('employerAddress')}>
            <input className="form-input" value={occ.employerAddress} onChange={f('employerAddress')} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label="Address Line 2">
            <input className="form-input" value={occ.employerAddressLine2} onChange={f('employerAddressLine2')} placeholder="Suite, Unit (optional)" />
          </FormField>
        </div>
        <FormField label="City">
          <input className="form-input" value={occ.employerCity} onChange={f('employerCity')} />
        </FormField>
        <FormField label="Province">
          <select className="form-input" value={occ.employerProvince} onChange={f('employerProvince')}>
            <option value="">Select...</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="Postal Code">
          <input className="form-input" value={occ.employerPostal} onChange={f('employerPostal')} />
        </FormField>
        <FormField label="Employment Start Date">
          <input type="date" className="form-input" value={occ.employmentFrom} onChange={f('employmentFrom')} />
        </FormField>
        <FormField label="Employment End Date" hint="Leave blank if currently employed">
          <input type="date" className="form-input" value={occ.employmentTo} onChange={f('employmentTo')} />
        </FormField>
      </div>
    </div>
  )
}

export default function Step4Occupants({ data, onChange, errors }: Props) {
  const updateOccupant = (index: number, updates: Partial<Occupant>) => {
    const updated = [...data.occupants]
    updated[index] = { ...updated[index], ...updates }
    onChange({ occupants: updated })
  }

  if (data.numOccupants <= 1) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-300 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-gray-500">
          You indicated only 1 adult. No additional occupant information is needed.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Click <strong>Next</strong> to continue.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-primary-500 mb-1">
        Additional Occupants
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Required for all occupants 18 years of age or older. Please complete a section for each
        additional adult who will be living in the unit.
      </p>

      {data.occupants.map((occ, i) => (
        <OccupantForm
          key={i}
          index={i}
          occ={occ}
          onUpdate={(u) => updateOccupant(i, u)}
          errors={errors}
        />
      ))}
    </div>
  )
}
