'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FormField from '@/components/FormField'
import { useT } from '@/lib/locale-context'
import type { RoommateChangeData } from '@/lib/types'

type UnitOption = { id: string; name: string }

export default function RmStepProperty({
  data,
  onChange,
  errors,
}: {
  data: RoommateChangeData
  onChange: (u: Partial<RoommateChangeData>) => void
  errors: Record<string, string>
}) {
  const t = useT()
  const [units, setUnits] = useState<UnitOption[] | null>(null)
  const [unitsError, setUnitsError] = useState(false)
  const [unitQuery, setUnitQuery] = useState(data.unitName)
  const [unitOpen, setUnitOpen] = useState(false)
  const unitBoxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/units')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { units: UnitOption[] }) => {
        if (!cancelled) setUnits(json.units)
      })
      .catch(() => {
        if (!cancelled) setUnitsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (unitBoxRef.current && !unitBoxRef.current.contains(e.target as Node)) setUnitOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const filteredUnits = useMemo(() => {
    if (!units) return []
    const q = unitQuery.trim().toLowerCase()
    if (!q) return units.slice(0, 50)
    return units.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 50)
  }, [units, unitQuery])

  const selectUnit = (u: UnitOption) => {
    onChange({ unitId: u.id, unitName: u.name })
    setUnitQuery(u.name)
    setUnitOpen(false)
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step1Title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">{t.rm.step1Subtitle}</p>

      <FormField label={t.rm.addressLabel} required hint={t.rm.step1Subtitle} error={errors.unitId}>
        <div ref={unitBoxRef} className="relative">
          <input
            type="text"
            className="form-input"
            placeholder={units ? t.rm.addressPlaceholder : t.rm.addressLoading}
            disabled={!units && !unitsError}
            value={unitQuery}
            onChange={(e) => {
              setUnitQuery(e.target.value)
              setUnitOpen(true)
              if (data.unitId) onChange({ unitId: '', unitName: '' })
            }}
            onFocus={() => setUnitOpen(true)}
          />
          {unitsError && (
            <p className="text-xs text-secondary mt-1.5">{t.rm.addressLoadError}</p>
          )}
          {unitOpen && units && filteredUnits.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-brand-border shadow-lg">
              {filteredUnits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50"
                    onClick={() => selectUnit(u)}
                  >
                    {u.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {unitOpen && units && unitQuery.trim() && filteredUnits.length === 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-brand-border shadow-lg px-3 py-2 text-sm text-brand-gray">
              {t.rm.addressNoMatch}
            </div>
          )}
        </div>
      </FormField>
    </div>
  )
}
