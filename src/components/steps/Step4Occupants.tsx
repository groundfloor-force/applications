'use client'

import { FormData, Occupant } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'
import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'
import DateInput from '@/components/DateInput'

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
  const t = useT()
  const f = (field: keyof Occupant) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onUpdate({ [field]: e.target.value })

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ phone: formatPhone(e.target.value) })

  const handleEmployerPhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ employerPhone: formatPhone(e.target.value) })

  const handlePrevLandlordPhone = (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdate({ prevLandlordPhone: formatPhone(e.target.value) })

  const errKey = (k: string) => errors[`occ${index}_${k}`]
  const sameAsPrimary = occ.sameAsPrimary !== false  // default true

  return (
    <div className="form-section">
      <h3 className="section-title">{tpl(t.step4.occupantHeading, { n: index + 2 })}</h3>
      <p className="text-xs text-brand-gray mb-4">{t.step4.occupantSubtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <FormField label={t.common.firstName} required error={errKey('firstName')}>
          <input className="form-input" value={occ.firstName} onChange={f('firstName')} />
        </FormField>
        <FormField label={t.common.lastName} required error={errKey('lastName')}>
          <input className="form-input" value={occ.lastName} onChange={f('lastName')} />
        </FormField>
        <FormField label={t.common.email} required error={errKey('email')}>
          <input type="email" className="form-input" value={occ.email} onChange={f('email')} />
        </FormField>
        <FormField label={t.common.phone} required error={errKey('phone')}>
          <input type="tel" className="form-input" value={occ.phone} onChange={handlePhone} />
        </FormField>
        <FormField label={t.step2.dateOfBirth}>
          <DateInput value={occ.birthDate} onChange={(v) => onUpdate({ birthDate: v })} />
        </FormField>
        <FormField label={t.step4.relationship}>
          <input className="form-input" value={occ.relationship} onChange={f('relationship')} placeholder={t.step4.relationshipPlaceholder} />
        </FormField>
        <FormField label={t.step4.occupation} required error={errKey('occupation')}>
          <input className="form-input" value={occ.occupation} onChange={f('occupation')} placeholder={t.step4.occupationPlaceholder} />
        </FormField>
        <FormField label={t.step4.monthlyGross}>
          <input type="number" className="form-input" value={occ.monthlyGrossSalary} onChange={f('monthlyGrossSalary')} onWheel={(e) => (e.target as HTMLInputElement).blur()} placeholder="3000" />
        </FormField>
      </div>

      <h4 className="font-bold text-sm text-brand-dark mb-3">
        {t.step4.employmentInfo}
        <span className="font-normal text-brand-gray ml-2">{t.step4.employmentInfoHint}</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <FormField label={t.step4.employerName} required error={errKey('employerName')}
            hint={t.step4.employerNameHint}>
            <input className="form-input" value={occ.employerName} onChange={f('employerName')} />
          </FormField>
        </div>
        <FormField label={t.step4.positionHeld}>
          <input className="form-input" value={occ.positionHeld} onChange={f('positionHeld')} />
        </FormField>
        <FormField label={t.step4.employerPhone}>
          <input type="tel" className="form-input" value={occ.employerPhone} onChange={handleEmployerPhone} />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label={t.step4.employerStreet} required error={errKey('employerAddress')}>
            <input className="form-input" value={occ.employerAddress} onChange={f('employerAddress')} />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label={t.step2.addressLine2}>
            <input className="form-input" value={occ.employerAddressLine2} onChange={f('employerAddressLine2')} placeholder={t.step4.employerSuiteHint} />
          </FormField>
        </div>
        <FormField label={t.common.city}>
          <input className="form-input" value={occ.employerCity} onChange={f('employerCity')} />
        </FormField>
        <FormField label={t.common.province}>
          <select className="form-input" value={occ.employerProvince} onChange={f('employerProvince')}>
            <option value="">{t.common.selectEllipsis}</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label={t.common.postal}>
          <input className="form-input" value={occ.employerPostal} onChange={f('employerPostal')} />
        </FormField>
        <FormField label={t.step4.employmentStart}>
          <input type="date" className="form-input" value={occ.employmentFrom} onChange={f('employmentFrom')} />
        </FormField>
        <FormField label={t.step4.employmentEnd} hint={t.step4.employmentEndHint}>
          <input type="date" className="form-input" value={occ.employmentTo} onChange={f('employmentTo')} />
        </FormField>
      </div>

      {/* Address & Landlord Reference */}
      <div className="mt-6 pt-5 border-t border-brand-border">
        <h4 className="font-bold text-sm text-brand-dark mb-3">
          {t.step4.addressLandlord}
        </h4>
        <label className="flex items-start gap-2 cursor-pointer p-3 bg-brand-bg border border-brand-border hover:border-primary-300 transition-colors">
          <input
            type="checkbox"
            className="mt-0.5 flex-shrink-0 w-4 h-4 accent-primary-500"
            checked={sameAsPrimary}
            onChange={(e) => onUpdate({ sameAsPrimary: e.target.checked })}
          />
          <span className="text-sm text-brand-dark">
            {t.step4.sameAsPrimary}
            <span className="block text-xs text-brand-gray mt-0.5">
              {t.step4.sameAsPrimarySub}
            </span>
          </span>
        </label>

        {!sameAsPrimary && (
          <div className="mt-4 animate-fade-up">
            <p className="text-xs text-brand-gray mb-3 italic">
              {t.step4.coTenantsNote}
            </p>

            <h5 className="text-xs uppercase tracking-wide text-brand-gray font-bold mb-2 mt-3">
              {t.step2.currentAddress}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <FormField label={t.step4.streetAddress}>
                  <input className="form-input" value={occ.currentAddress || ''} onChange={f('currentAddress')} />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label={t.step4.aptUnit}>
                  <input className="form-input" value={occ.currentAddressLine2 || ''} onChange={f('currentAddressLine2')} />
                </FormField>
              </div>
              <FormField label={t.common.city}>
                <input className="form-input" value={occ.currentCity || ''} onChange={f('currentCity')} />
              </FormField>
              <FormField label={t.common.province}>
                <select className="form-input" value={occ.currentProvince || ''} onChange={f('currentProvince')}>
                  <option value="">{t.common.selectEllipsis}</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
              <FormField label={t.common.postal}>
                <input className="form-input" value={occ.currentPostal || ''} onChange={f('currentPostal')} />
              </FormField>
            </div>

            <h5 className="text-xs uppercase tracking-wide text-brand-gray font-bold mb-2 mt-2">
              {t.step4.prevLandlord}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t.step4.landlordFirstName}>
                <input className="form-input" value={occ.prevLandlordFirstName || ''} onChange={f('prevLandlordFirstName')} />
              </FormField>
              <FormField label={t.step4.landlordLastName}>
                <input className="form-input" value={occ.prevLandlordLastName || ''} onChange={f('prevLandlordLastName')} />
              </FormField>
              <FormField label={t.step4.landlordPhone}>
                <input type="tel" className="form-input" value={occ.prevLandlordPhone || ''} onChange={handlePrevLandlordPhone} />
              </FormField>
              <FormField label={t.step4.landlordEmail}>
                <input type="email" className="form-input" value={occ.prevLandlordEmail || ''} onChange={f('prevLandlordEmail')} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label={t.step4.reasonForLeaving}>
                  <input className="form-input" value={occ.prevReasonForLeaving || ''} onChange={f('prevReasonForLeaving')}
                    placeholder={t.step4.reasonPlaceholder} />
                </FormField>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Step4Occupants({ data, onChange, errors }: Props) {
  const t = useT()
  const updateOccupant = (index: number, updates: Partial<Occupant>) => {
    const updated = [...data.occupants]
    updated[index] = { ...updated[index], ...updates }
    onChange({ occupants: updated })
  }

  if (data.numOccupants <= 1) {
    return (
      <div className="text-center py-12">
        <div className="text-brand-border mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-brand-gray">
          {t.step4.noneNeeded}
        </p>
        <p className="text-sm text-brand-gray mt-2">
          {t.step4.clickContinue}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step4.title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        {t.step4.subtitle}
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
