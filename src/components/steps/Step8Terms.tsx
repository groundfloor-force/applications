'use client'

import { FormData, FormConfig } from '@/lib/types'
import FormField from '@/components/FormField'

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
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-brand-gray flex-shrink-0">{label}</span>
      <span className="text-brand text-right" style={{ fontWeight: 700 }}>{value}</span>
    </div>
  )
}

export default function Step8Terms({ data, onChange, errors, config, submitting, onSubmit }: Props) {
  const { property, occupants = [] } = data

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        Review & Submit
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        Review your application before submitting. Please read the terms carefully.
      </p>

      {/* Application review cards */}
      <div className="form-section">
        <h3 className="section-title">Application Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {property && (
            <ReviewCard title="Property">
              <Row label="Address" value={`${property.address}${property.unit ? ` Unit ${property.unit}` : ''}`} />
              <Row label="City" value={property.city} />
              <Row label="Bedrooms" value={property.bedrooms} />
              <Row label="Rent" value={property.rent > 0 ? `$${property.rent.toLocaleString()}/mo` : undefined} />
            </ReviewCard>
          )}

          <ReviewCard title="Primary Applicant">
            <Row label="Name" value={`${data.firstName} ${data.lastName}`.trim() || '—'} />
            <Row label="Email" value={data.email} />
            <Row label="Phone" value={data.phone} />
            <Row label="DOB" value={data.birthDate} />
          </ReviewCard>

          <ReviewCard title="Household">
            <Row label="Move-In" value={data.moveInDate} />
            <Row label="Monthly Rent" value={data.monthlyRent ? `$${data.monthlyRent}` : undefined} />
            <Row label="Deposit" value={data.securityDeposit ? `$${data.securityDeposit}` : undefined} />
            <Row label="Adults" value={data.numOccupants} />
            <Row label="Vehicles" value={data.numVehicles} />
            <Row label="Children" value={data.children} />
            <Row label="Pets" value={data.pets} />
            <Row label="Viewed Unit" value={data.viewedUnit} />
            <Row label="Shown By" value={data.viewedByName} />
          </ReviewCard>

          <ReviewCard title="Employment">
            <Row label="Employer" value={data.employerName} />
            <Row label="Income doc" value={data.payStubFile ? data.payStubFile.name : 'Not attached'} />
          </ReviewCard>

          <ReviewCard title="Rental History">
            <Row label="Previous Landlord"
              value={`${data.prevLandlordFirstName} ${data.prevLandlordLastName}`.trim() || '—'} />
            <Row label="Landlord Phone" value={data.prevLandlordPhone} />
            <Row label="Prev. Rent" value={data.prevMonthlyRent ? `$${data.prevMonthlyRent}/mo` : undefined} />
            <Row label="Reason for Leaving" value={data.reasonForLeaving} />
          </ReviewCard>

          <ReviewCard title="Reference">
            <Row label="Name" value={`${data.ref1FirstName} ${data.ref1LastName}`.trim() || '—'} />
            <Row label="Phone" value={data.ref1Phone} />
            <Row label="Email" value={data.ref1Email} />
          </ReviewCard>

          {occupants.map((occ, i) => (
            <ReviewCard key={i} title={`Occupant ${i + 2}`}>
              <Row label="Name" value={`${occ.firstName} ${occ.lastName}`.trim()} />
              <Row label="Relationship" value={occ.relationship} />
              <Row label="Employer" value={occ.employerName} />
              <Row label="Monthly Income" value={occ.monthlyGrossSalary ? `$${occ.monthlyGrossSalary}` : undefined} />
            </ReviewCard>
          ))}

          {data.cosignerFirstName && (
            <ReviewCard title="Co-signer">
              <Row label="Name" value={`${data.cosignerFirstName} ${data.cosignerLastName}`.trim()} />
              <Row label="Relationship" value={data.cosignerRelationship} />
              <Row label="Email" value={data.cosignerEmail} />
            </ReviewCard>
          )}

        </div>
      </div>

      {/* Additional details */}
      <div className="form-section">
        <h3 className="section-title">Additional Information</h3>
        <FormField label="Is there anything else you would like to share?">
          <textarea
            className="form-input min-h-[100px]"
            value={data.additionalDetails}
            onChange={(e) => onChange({ additionalDetails: e.target.value })}
            placeholder="Optional — any context that may help your application..."
          />
        </FormField>
      </div>

      {/* Terms */}
      <div className="form-section">
        <h3 className="section-title">Terms & Conditions</h3>
        <div className="bg-brand-bg border border-brand-border  p-4 max-h-64 overflow-y-auto text-sm text-brand leading-relaxed whitespace-pre-wrap mb-4 terms-scroll">
          {config.termsText}
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 text-primary-500 border-brand-border rounded focus:ring-primary-500 flex-shrink-0"
            checked={data.termsAgreed}
            onChange={(e) => onChange({ termsAgreed: e.target.checked })}
          />
          <span className="text-sm text-brand group-hover:text-brand-dark">
            I have read and agree to the terms and conditions above. I declare that all information
            provided in this application is true and correct.
            <span className="required">*</span>
          </span>
        </label>
        {errors.termsAgreed && (
          <p className="text-xs text-secondary mt-2">{errors.termsAgreed}</p>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !data.termsAgreed}
          className="btn-primary px-12 py-4 text-base min-w-[240px] flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting...
            </>
          ) : (
            <>
              Submit Application
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
