'use client'

import { useEffect } from 'react'
import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function Step3Details({ data, onChange, errors }: Props) {
  const f =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ [field]: e.target.value })

  // Keep occupants array in sync with numOccupants count
  useEffect(() => {
    const needed = Math.max(0, data.numOccupants - 1)
    if (data.occupants.length !== needed) {
      const base = [...data.occupants]
      while (base.length < needed) {
        base.push({
          firstName: '', lastName: '', email: '', phone: '', birthDate: '',
          relationship: '', occupation: '', employerName: '', employerAddress: '',
          employerAddressLine2: '', employerCity: '', employerProvince: '', employerPostal: '',
          employerPhone: '', employmentFrom: '', employmentTo: '', monthlyGrossSalary: '', positionHeld: '',
        })
      }
      onChange({ occupants: base.slice(0, needed) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.numOccupants])

  const { property } = data

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        Property & Household Details
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        Tell us more about the application specifics for{' '}
        <strong>
          {property ? `${property.address}${property.unit ? ` Unit ${property.unit}` : ''}` : 'the selected property'}
        </strong>.
      </p>

      <div className="form-section">
        <h3 className="section-title">Leasing Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Leasing Agent" required error={errors.leasingAgent}
              hint="N/A if you are applying before speaking with someone">
              <input className="form-input" value={data.leasingAgent} onChange={f('leasingAgent')} placeholder="Agent name or N/A" />
            </FormField>
          </div>
          <FormField label="Monthly Rent ($)" required error={errors.monthlyRent}>
            <input type="number" className="form-input" value={data.monthlyRent} onChange={f('monthlyRent')} placeholder="1500" />
          </FormField>
          <FormField label="Security Deposit ($)" required error={errors.securityDeposit}>
            <input type="number" className="form-input" value={data.securityDeposit} onChange={f('securityDeposit')} placeholder="1500" />
          </FormField>
          <FormField label="Requested Move-In Date" required error={errors.moveInDate}
            hint="The date you are requesting to receive the keys">
            <input type="date" className="form-input" value={data.moveInDate} onChange={f('moveInDate')} />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Occupants & Vehicles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Number of Adults (18+) Moving In" required error={errors.numOccupants}
            hint="This determines how many additional applicant sections you will need to fill out">
            <select
              className="form-input"
              value={data.numOccupants}
              onChange={(e) => onChange({ numOccupants: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'adult' : 'adults'}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Number of Vehicles" required error={errors.numVehicles}>
            <input className="form-input" value={data.numVehicles} onChange={f('numVehicles')} placeholder="0" />
          </FormField>
        </div>

        {data.numOccupants > 1 && (
          <div className="mt-4 p-4 bg-primary-50  border border-primary-200 text-sm text-primary-700">
            You have indicated <strong>{data.numOccupants} adults</strong>. In the next step, you
            will be asked to provide details for{' '}
            <strong>{data.numOccupants - 1} additional occupant{data.numOccupants - 1 > 1 ? 's' : ''}</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
