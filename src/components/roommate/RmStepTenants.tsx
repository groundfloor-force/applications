'use client'

import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'
import { emptyRoommatePerson } from '@/lib/types'
import type { RoommateChangeData } from '@/lib/types'
import RmPersonFields from './RmPersonFields'

export default function RmStepTenants({
  data,
  onChange,
  errors,
}: {
  data: RoommateChangeData
  onChange: (u: Partial<RoommateChangeData>) => void
  errors: Record<string, string>
}) {
  const t = useT()

  const updateTenant = (index: number, updates: Partial<(typeof data.tenants)[number]>) => {
    const tenants = data.tenants.map((p, i) => (i === index ? { ...p, ...updates } : p))
    onChange({ tenants })
  }

  const addTenant = () => onChange({ tenants: [...data.tenants, emptyRoommatePerson()] })

  const removeTenant = (index: number) => {
    if (data.tenants.length <= 2) return
    onChange({ tenants: data.tenants.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step2Title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">{t.rm.step2Subtitle}</p>

      {errors.tenants && (
        <p className="text-sm text-secondary mb-4">{errors.tenants}</p>
      )}

      <div className="space-y-6">
        {data.tenants.map((person, i) => (
          <div key={i} className="form-section">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title mb-0">{tpl(t.rm.tenantHeading, { n: i + 1 })}</h3>
              {data.tenants.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeTenant(i)}
                  className="text-xs text-secondary hover:underline"
                >
                  {t.rm.removeTenant}
                </button>
              )}
            </div>
            <RmPersonFields
              person={person}
              prefix={`tenant${i}`}
              errors={errors}
              onChange={(u) => updateTenant(i, u)}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={addTenant} className="mt-4 text-sm text-primary-500 hover:underline" style={{ fontWeight: 600 }}>
        + {t.rm.addTenant}
      </button>
    </div>
  )
}
