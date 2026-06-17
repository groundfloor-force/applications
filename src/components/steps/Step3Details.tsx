'use client'

import { useEffect, useRef } from 'react'
import { FormData, emptyOccupant } from '@/lib/types'
import FormField from '@/components/FormField'
import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'
import DateInput from '@/components/DateInput'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
}

export default function Step3Details({ data, onChange, errors }: Props) {
  const t = useT()
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
        base.push(emptyOccupant())
      }
      onChange({ occupants: base.slice(0, needed) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.numOccupants])

  // Auto-sync security deposit to monthly rent until the applicant manually
  // edits the deposit. Once edited, leave it alone.
  const depositTouchedRef = useRef(
    data.securityDeposit !== '' && data.securityDeposit !== data.monthlyRent
  )

  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (depositTouchedRef.current) {
      onChange({ monthlyRent: v })
    } else {
      onChange({ monthlyRent: v, securityDeposit: v })
    }
  }

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    depositTouchedRef.current = true
    onChange({ securityDeposit: e.target.value })
  }

  const { property } = data

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step3.title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        {t.step3.subtitleA}{' '}
        <strong>
          {property ? `${property.address}${property.unit ? ` ${property.unit}` : ''}` : t.step3.subtitleB}
        </strong>.
      </p>

      <div className="form-section">
        <h3 className="section-title">{t.step3.leasingDetails}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.step3.monthlyRent} required error={errors.monthlyRent}>
            <input type="text" inputMode="decimal" autoComplete="off"
              className="form-input" value={data.monthlyRent}
              onChange={handleRentChange} placeholder="1500" />
          </FormField>
          <FormField label={t.step3.securityDeposit} required error={errors.securityDeposit}
            hint={t.step3.securityDepositHint}>
            <input type="text" inputMode="decimal" autoComplete="off"
              className="form-input" value={data.securityDeposit}
              onChange={handleDepositChange} placeholder="1500" />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label={t.step3.moveInDate} required error={errors.moveInDate} hint={t.step3.moveInHint}>
              <DateInput
                value={data.moveInDate}
                onChange={(v) => onChange({ moveInDate: v })}
              />
            </FormField>
            <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
              {t.step3.moveInDisclaimer}
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step3.occupantsVehicles}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.step3.numAdults} required error={errors.numOccupants} hint={t.step3.numAdultsHint}>
            <select
              className="form-input"
              value={data.numOccupants}
              onChange={(e) => onChange({ numOccupants: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? t.step3.adult : t.step3.adults}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t.step3.numVehicles} required error={errors.numVehicles}>
            <input className="form-input" inputMode="numeric" autoComplete="off"
              value={data.numVehicles} onChange={f('numVehicles')} placeholder="0" />
          </FormField>
        </div>

        {data.numOccupants > 1 && (
          <div className="mt-4 p-4 bg-primary-50  border border-primary-200 text-sm text-primary-700">
            {tpl(t.step3.multiOccupantsNote, {
              n: data.numOccupants,
              extra: data.numOccupants - 1,
              occupantLabel: data.numOccupants - 1 > 1 ? t.step3.occupants : t.step3.occupant,
            })}
          </div>
        )}
      </div>
    </div>
  )
}
