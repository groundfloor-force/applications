'use client'

import { FormData, FormConfig } from '@/lib/types'
import FormField from '@/components/FormField'
import { useT, useLocale } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'
import MultiFileUploader from '@/components/MultiFileUploader'
import SignaturePad from '@/components/SignaturePad'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
  config: FormConfig
  submitting: boolean
  onSubmit: () => void
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-brand-bg  border border-brand-border p-4">
      <p className="text-xs uppercase tracking-widest text-primary-500 mb-3" style={{ fontWeight: 600 }}>{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:gap-4 text-sm">
      <span className="text-brand-gray flex-shrink-0">{label}</span>
      <span className="text-brand sm:text-right break-words" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  )
}

export default function Step8Terms({ data, onChange, errors, config, submitting, onSubmit }: Props) {
  const t = useT()
  const locale = useLocale()
  const { property, occupants = [] } = data
  const termsText = locale === 'fr'
    ? (config.termsTextFr?.trim() || config.termsText)
    : config.termsText

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step8.title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        {t.step8.subtitle}
      </p>

      {/* Application review cards */}
      <div className="form-section">
        <h3 className="section-title">{t.step8.summary}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {data.properties && data.properties.length > 1 ? (
            <ReviewCard title={tpl(t.step8.propertiesCard, { n: data.properties.length })}>
              {data.properties.map((p, i) => (
                <Row
                  key={p.id}
                  label={`${i + 1}. ${p.address}${p.unit ? ` ${p.unit}` : ''}`}
                  value={`${p.city}${p.rent > 0 ? ` · $${p.rent.toLocaleString()}${t.step1.perMonth}` : ''}`}
                />
              ))}
            </ReviewCard>
          ) : property && (
            <ReviewCard title={t.step8.propertyCard}>
              <Row label={t.step8.rowAddress} value={`${property.address}${property.unit ? ` ${property.unit}` : ''}`} />
              <Row label={t.step8.rowCity} value={property.city} />
              <Row label={t.step8.rowBedrooms} value={property.bedrooms} />
              <Row label={t.step8.rowRent} value={property.rent > 0 ? `$${property.rent.toLocaleString()}${t.step1.perMonth}` : undefined} />
            </ReviewCard>
          )}

          <ReviewCard title={t.step8.primaryApplicant}>
            <Row label={t.step8.rowName} value={`${data.firstName} ${data.lastName}`.trim() || '—'} />
            <Row label={t.step8.rowEmail} value={data.email} />
            <Row label={t.step8.rowPhone} value={data.phone} />
            <Row label={t.step8.rowDob} value={data.birthDate} />
          </ReviewCard>

          <ReviewCard title={t.step8.householdCard}>
            <Row label={t.step8.rowMoveIn} value={data.moveInDate} />
            <Row label={t.step8.rowMonthlyRent} value={data.monthlyRent ? `$${data.monthlyRent}` : undefined} />
            <Row label={t.step8.rowDeposit} value={data.securityDeposit ? `$${data.securityDeposit}` : undefined} />
            <Row label={t.step8.rowAdults} value={data.numOccupants} />
            <Row label={t.step8.rowVehicles} value={data.numVehicles} />
            <Row label={t.step8.rowChildren} value={data.children} />
            <Row label={t.step8.rowPets} value={data.pets} />
            <Row label={t.step8.rowViewedUnit} value={data.viewedUnit} />
            <Row label={t.step8.rowLeasingAgent} value={data.leasingAgent} />
          </ReviewCard>

          <ReviewCard title={t.step8.employmentCard}>
            <Row label={t.step8.rowEmployer} value={data.employerName} />
            <Row label={t.step8.rowDocuments} value={data.documents.length > 0 ? `${data.documents.length} ${t.step8.filesAttached}` : t.step8.noneAttached} />
          </ReviewCard>

          <ReviewCard title={t.step8.rentalHistoryCard}>
            <Row label={t.step8.rowPrevLandlord}
              value={`${data.prevLandlordFirstName} ${data.prevLandlordLastName}`.trim() || '—'} />
            <Row label={t.step8.rowLandlordPhone} value={data.prevLandlordPhone} />
            <Row label={t.step8.rowPrevRent} value={data.prevMonthlyRent ? `$${data.prevMonthlyRent}${t.step1.perMonth}` : undefined} />
            <Row label={t.step8.rowReasonLeaving} value={data.reasonForLeaving} />
          </ReviewCard>

          <ReviewCard title={t.step8.referenceCard}>
            <Row label={t.step8.rowName} value={`${data.ref1FirstName} ${data.ref1LastName}`.trim() || '—'} />
            <Row label={t.step8.rowPhone} value={data.ref1Phone} />
            <Row label={t.step8.rowEmail} value={data.ref1Email} />
          </ReviewCard>

          {occupants.map((occ, i) => (
            <ReviewCard key={i} title={tpl(t.step8.occupantCard, { n: i + 2 })}>
              <Row label={t.step8.rowName} value={`${occ.firstName} ${occ.lastName}`.trim()} />
              <Row label={t.step8.rowRelationship} value={occ.relationship} />
              <Row label={t.step8.rowEmployer} value={occ.employerName} />
              <Row label={t.step8.rowMonthlyIncome} value={occ.monthlyGrossSalary ? `$${occ.monthlyGrossSalary}` : undefined} />
              {occ.sameAsPrimary === false && (
                <>
                  <Row label={t.step8.rowOwnAddress}
                    value={[occ.currentAddress, occ.currentCity].filter(Boolean).join(', ') || '—'} />
                  <Row label={t.step8.rowOwnLandlord}
                    value={`${occ.prevLandlordFirstName || ''} ${occ.prevLandlordLastName || ''}`.trim() || '—'} />
                </>
              )}
            </ReviewCard>
          ))}

          {data.cosignerFirstName && (
            <ReviewCard title={t.step8.cosignerCard}>
              <Row label={t.step8.rowName} value={`${data.cosignerFirstName} ${data.cosignerLastName}`.trim()} />
              <Row label={t.step8.rowRelationship} value={data.cosignerRelationship} />
              <Row label={t.step8.rowEmail} value={data.cosignerEmail} />
            </ReviewCard>
          )}

        </div>
      </div>

      {/* Additional details */}
      <div className="form-section">
        <h3 className="section-title">{t.step8.additionalInfo}</h3>
        <FormField label={t.step8.additionalInfoLabel}>
          <textarea
            className="form-input min-h-[100px]"
            value={data.additionalDetails}
            onChange={(e) => onChange({ additionalDetails: e.target.value })}
            placeholder={t.step8.additionalInfoPlaceholder}
          />
        </FormField>

        <div className="mt-5 pt-5 border-t border-brand-border">
          <MultiFileUploader
            files={data.supportingDocs}
            onChange={(files) => onChange({ supportingDocs: files })}
            label={t.step8.supportingDocsTitle}
            hint={t.step8.supportingDocsHint}
          />
        </div>
      </div>

      {/* Terms */}
      <div className="form-section">
        <h3 className="section-title">{t.step8.termsTitle}</h3>
        <div className="bg-brand-bg border border-brand-border p-4 max-h-48 sm:max-h-64 overflow-y-auto text-sm text-brand leading-relaxed whitespace-pre-wrap mb-4 terms-scroll">
          {termsText}
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 text-primary-500 border-brand-border rounded focus:ring-primary-500 flex-shrink-0"
            checked={data.termsAgreed}
            onChange={(e) => onChange({ termsAgreed: e.target.checked })}
          />
          <span className="text-sm text-brand group-hover:text-brand-dark">
            {t.step8.termsAgree}
            <span className="required">*</span>
          </span>
        </label>
        {errors.termsAgreed && (
          <p className="text-xs text-secondary mt-2">{errors.termsAgreed}</p>
        )}
      </div>

      {/* Signature */}
      <div className="form-section">
        <h3 className="section-title">{t.step8.signatureTitle}</h3>
        <p className="text-sm text-brand-gray mb-3">{t.step8.signatureIntro}</p>
        <SignaturePad
          value={data.signatureData}
          onChange={(dataUrl) => onChange({
            signatureData: dataUrl,
            signedAt: dataUrl ? new Date().toISOString() : '',
          })}
          clearLabel={t.step8.signatureClear}
        />
        {(data.firstName || data.lastName) && (
          <p className="text-xs text-brand-gray mt-2">
            {t.step8.signatureSignedAs}: <span className="text-brand-dark" style={{ fontWeight: 600 }}>{`${data.firstName} ${data.lastName}`.trim()}</span>
          </p>
        )}
        {errors.signatureData && (
          <p className="text-xs text-secondary mt-2">{errors.signatureData}</p>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !data.termsAgreed || !data.signatureData}
          className="btn-primary px-6 sm:px-12 py-4 text-base w-full sm:w-auto sm:min-w-[240px] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {t.common.submitting}
            </>
          ) : (
            <>
              {t.step8.submitApplication}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {errors.submit && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200  text-secondary text-sm text-center">
          {errors.submit}
        </div>
      )}
    </div>
  )
}
