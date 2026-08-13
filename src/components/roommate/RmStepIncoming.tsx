'use client'

import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'
import { emptyRoommatePerson } from '@/lib/types'
import type { RoommateChangeData } from '@/lib/types'
import RmPersonFields from './RmPersonFields'

export default function RmStepIncoming({
  data,
  onChange,
  errors,
}: {
  data: RoommateChangeData
  onChange: (u: Partial<RoommateChangeData>) => void
  errors: Record<string, string>
}) {
  const t = useT()

  const updateIncoming = (index: number, updates: Partial<(typeof data.incoming)[number]>) => {
    const incoming = data.incoming.map((p, i) => (i === index ? { ...p, ...updates } : p))
    onChange({ incoming })
  }

  const addIncoming = () => onChange({ incoming: [...data.incoming, emptyRoommatePerson()] })

  const removeIncoming = (index: number) => {
    if (data.incoming.length <= 1) return
    onChange({ incoming: data.incoming.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step4Title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">{t.rm.step4Subtitle}</p>

      {errors.hasIncoming && (
        <p className="text-sm text-secondary mb-4">{errors.hasIncoming}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <button
          type="button"
          onClick={() => onChange({ hasIncoming: true, incoming: data.incoming.length ? data.incoming : [emptyRoommatePerson()] })}
          className={`min-h-[72px] px-4 py-3 border text-left transition-all ${
            data.hasIncoming === true
              ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
              : 'border-brand-border bg-white hover:border-primary-300'
          }`}
        >
          <span className="block text-sm text-brand-dark" style={{ fontWeight: 700 }}>
            {t.common.yes}
          </span>
          <span className="block text-xs text-brand-gray mt-0.5">{t.rm.incomingYes}</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ hasIncoming: false })}
          className={`min-h-[72px] px-4 py-3 border text-left transition-all ${
            data.hasIncoming === false
              ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
              : 'border-brand-border bg-white hover:border-primary-300'
          }`}
        >
          <span className="block text-sm text-brand-dark" style={{ fontWeight: 700 }}>
            {t.common.no}
          </span>
          <span className="block text-xs text-brand-gray mt-0.5">{t.rm.incomingNo}</span>
        </button>
      </div>

      {data.hasIncoming === true && (
        <>
          {errors.incoming && (
            <p className="text-sm text-secondary mb-4">{errors.incoming}</p>
          )}
          <div className="space-y-6">
            {data.incoming.map((person, i) => (
              <div key={i} className="form-section">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title mb-0">{tpl(t.rm.incomingHeading, { n: i + 1 })}</h3>
                  {data.incoming.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIncoming(i)}
                      className="text-xs text-secondary hover:underline"
                    >
                      {t.rm.removeTenant}
                    </button>
                  )}
                </div>
                <RmPersonFields
                  person={person}
                  prefix={`incoming${i}`}
                  errors={errors}
                  onChange={(u) => updateIncoming(i, u)}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={addIncoming} className="mt-4 text-sm text-primary-500 hover:underline" style={{ fontWeight: 600 }}>
            + {t.rm.addIncoming}
          </button>
        </>
      )}
    </div>
  )
}
