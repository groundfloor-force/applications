'use client'

import { FormData } from '@/lib/types'
import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'
import { useT } from '@/lib/locale-context'
import MultiFileUploader from '@/components/MultiFileUploader'

interface Props {
  data: FormData
  onChange: (u: Partial<FormData>) => void
  errors: Record<string, string>
  onFieldBlur?: (field: string) => void
}

export default function Step7References({ data, onChange, errors, onFieldBlur }: Props) {
  void onFieldBlur // available for future use
  const t = useT()
  const f =
    (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ [field]: e.target.value })

  const cosignerStarted =
    !!(data.cosignerFirstName || data.cosignerLastName || data.cosignerPhone || data.cosignerEmail)

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        {t.step7.title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">
        {t.step7.subtitle}
      </p>

      <div className="form-section">
        <h3 className="section-title">{t.step7.reference}</h3>
        <p className="text-xs text-brand-gray mb-4">{t.step7.referenceSub}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.common.firstName}>
            <input className="form-input" autoCapitalize="words"
              value={data.ref1FirstName} onChange={f('ref1FirstName')} />
          </FormField>
          <FormField label={t.common.lastName}>
            <input className="form-input" autoCapitalize="words"
              value={data.ref1LastName} onChange={f('ref1LastName')} />
          </FormField>
          <FormField label={t.common.phone}>
            <input type="tel" inputMode="tel"
              className="form-input" value={data.ref1Phone}
              onChange={(e) => onChange({ ref1Phone: formatPhone(e.target.value) })} />
          </FormField>
          <FormField label={t.common.email}>
            <input type="email" inputMode="email" autoCapitalize="off" spellCheck={false}
              className="form-input" value={data.ref1Email} onChange={f('ref1Email')} />
          </FormField>
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t.step7.cosigner}</h3>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          {t.step7.cosignerSub} {t.step7.cosignerNotApplicable}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={t.common.firstName}>
            <input className="form-input" autoCapitalize="words"
              value={data.cosignerFirstName} onChange={f('cosignerFirstName')} />
          </FormField>
          <FormField label={t.common.lastName}>
            <input className="form-input" autoCapitalize="words"
              value={data.cosignerLastName} onChange={f('cosignerLastName')} />
          </FormField>
          <FormField label={t.step7.relationship}>
            <input className="form-input" autoCapitalize="words"
              value={data.cosignerRelationship} onChange={f('cosignerRelationship')} placeholder={t.step7.relationshipPlaceholder} />
          </FormField>
          <div className="hidden sm:block" />
          <FormField label={t.common.email} required={cosignerStarted} error={cosignerStarted ? errors.cosignerEmail : undefined}>
            <input type="email" inputMode="email" autoCapitalize="off" spellCheck={false}
              className="form-input" value={data.cosignerEmail} onChange={f('cosignerEmail')} />
          </FormField>
          <FormField label={t.common.phone}>
            <input type="tel" inputMode="tel"
              className="form-input" value={data.cosignerPhone}
              onChange={(e) => onChange({ cosignerPhone: formatPhone(e.target.value) })} />
          </FormField>
        </div>

        {cosignerStarted && (
          <div className="mt-5 pt-5 border-t border-brand-border">
            <MultiFileUploader
              files={data.cosignerDocs}
              onChange={(files) => onChange({ cosignerDocs: files })}
              label={t.step7.cosignerDocsTitle}
              hint={t.step7.cosignerDocsHint}
            />
          </div>
        )}
      </div>
    </div>
  )
}
