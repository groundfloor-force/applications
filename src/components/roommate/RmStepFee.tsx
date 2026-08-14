'use client'

import { useT } from '@/lib/locale-context'
import type { RoommateChangeData } from '@/lib/types'

export default function RmStepFee({
  data,
  onChange,
  errors,
}: {
  data: RoommateChangeData
  onChange: (u: Partial<RoommateChangeData>) => void
  errors: Record<string, string>
}) {
  const t = useT()

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step6Title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">{t.rm.step6Subtitle}</p>

      <div className="bg-white border border-brand-border p-5 sm:p-6 mb-6">
        <p className="text-3xl text-primary-500 mb-2" style={{ fontWeight: 700 }}>
          {t.rm.feeAmount}
        </p>
        <p className="text-sm text-brand-dark">
          {t.rm.feePayTo}{' '}
          <a href={`mailto:${t.rm.feeEmail}`} className="text-primary-500 hover:underline" style={{ fontWeight: 600 }}>
            {t.rm.feeEmail}
          </a>
        </p>
        <p className="text-xs text-brand-gray mt-3">{t.rm.feeMemo}</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-primary-500"
          checked={data.feeAgreed}
          onChange={(e) => onChange({ feeAgreed: e.target.checked })}
        />
        <span className="text-sm text-brand-dark leading-snug">{t.rm.feeCheckbox}</span>
      </label>
      {errors.feeAgreed && (
        <p className="text-xs text-secondary mt-2">{errors.feeAgreed}</p>
      )}
    </div>
  )
}
