'use client'

import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
  onFieldBlur?: (field: string) => void
}

export default function Step7References({ data, onChange, errors, onFieldBlur }: Props) {
  void onFieldBlur // available for future use
  const f =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ [field]: e.target.value })

  const hasCosigner =
    data.cosignerFirstName || data.cosignerLastName || data.cosignerEmail || data.cosignerPhone

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        References & Co-signer
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        Please provide at least one personal or professional reference, and a co-signer if you have
        been asked to provide one.
      </p>

      <div className="form-section">
        <h3 className="section-title">Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="First Name">
            <input className="form-input" value={data.ref1FirstName} onChange={f('ref1FirstName')} />
          </FormField>
          <FormField label="Last Name">
            <input className="form-input" value={data.ref1LastName} onChange={f('ref1LastName')} />
          </FormField>
          <FormField label="Phone">
            <input type="tel" className="form-input" value={data.ref1Phone}
              onChange={(e) => onChange({ ref1Phone: formatPhone(e.target.value) })} />
          </FormField>
          <FormField label="Email">
            <input type="email" className="form-input" value={data.ref1Email} onChange={f('ref1Email')} />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Co-signer</h3>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          Only complete this section if you have been specifically asked to provide a co-signer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Co-signer First Name">
            <input className="form-input" value={data.cosignerFirstName} onChange={f('cosignerFirstName')} />
          </FormField>
          <FormField label="Co-signer Last Name">
            <input className="form-input" value={data.cosignerLastName} onChange={f('cosignerLastName')} />
          </FormField>
          <FormField label="Relationship to Applicant">
            <input className="form-input" value={data.cosignerRelationship} onChange={f('cosignerRelationship')} placeholder="e.g. Parent, Sibling" />
          </FormField>
          <div /> {/* spacer */}
          <FormField label="Co-signer Email">
            <input type="email" className="form-input" value={data.cosignerEmail} onChange={f('cosignerEmail')} />
          </FormField>
          <FormField label="Co-signer Phone">
            <input type="tel" className="form-input" value={data.cosignerPhone}
              onChange={(e) => onChange({ cosignerPhone: formatPhone(e.target.value) })} />
          </FormField>
        </div>
        {hasCosigner && (
          <p className="mt-3 text-xs text-brand-gray">
            Co-signer information has been entered and will be included with your application.
          </p>
        )}
      </div>
    </div>
  )
}
