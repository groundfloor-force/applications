'use client'

import { useT } from '@/lib/locale-context'
import { personName } from '@/lib/roommate-change'
import type { RoommateChangeData, RoommateStayStatus } from '@/lib/types'

export default function RmStepStayLeave({
  data,
  onChange,
  errors,
}: {
  data: RoommateChangeData
  onChange: (u: Partial<RoommateChangeData>) => void
  errors: Record<string, string>
}) {
  const t = useT()

  const setStatus = (index: number, status: RoommateStayStatus) => {
    const tenants = data.tenants.map((p, i) => (i === index ? { ...p, status } : p))
    onChange({ tenants })
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step3Title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">{t.rm.step3Subtitle}</p>

      {(errors.needStaying || errors.needLeaving) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-secondary">
          {errors.needStaying || errors.needLeaving}
        </div>
      )}

      <div className="space-y-4">
        {data.tenants.map((person, i) => {
          const name = personName(person) || `${t.rm.tenantHeading.replace('{n}', String(i + 1))}`
          return (
            <div key={i} className="bg-white border border-brand-border p-4 sm:p-5">
              <p className="text-brand-dark mb-1" style={{ fontWeight: 600 }}>
                {name}
              </p>
              <p className="text-xs text-brand-gray mb-4">{person.email}</p>
              {errors[`tenant${i}_status`] && (
                <p className="text-xs text-secondary mb-3">{errors[`tenant${i}_status`]}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus(i, 'staying')}
                  className={`min-h-[72px] px-3 py-3 border text-left transition-all ${
                    person.status === 'staying'
                      ? 'border-green-600 bg-green-50 ring-2 ring-green-100'
                      : 'border-brand-border bg-white hover:border-green-400'
                  }`}
                >
                  <span
                    className={`block text-sm ${person.status === 'staying' ? 'text-green-800' : 'text-brand-dark'}`}
                    style={{ fontWeight: 700 }}
                  >
                    {t.rm.staying}
                  </span>
                  <span className={`block text-xs mt-0.5 ${person.status === 'staying' ? 'text-green-700' : 'text-brand-gray'}`}>
                    {t.rm.stayingHint}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(i, 'leaving')}
                  className={`min-h-[72px] px-3 py-3 border text-left transition-all ${
                    person.status === 'leaving'
                      ? 'border-red-600 bg-red-50 ring-2 ring-red-100'
                      : 'border-brand-border bg-white hover:border-red-400'
                  }`}
                >
                  <span
                    className={`block text-sm ${person.status === 'leaving' ? 'text-red-800' : 'text-brand-dark'}`}
                    style={{ fontWeight: 700 }}
                  >
                    {t.rm.leaving}
                  </span>
                  <span className={`block text-xs mt-0.5 ${person.status === 'leaving' ? 'text-red-700' : 'text-brand-gray'}`}>
                    {t.rm.leavingHint}
                  </span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
