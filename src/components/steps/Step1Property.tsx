'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Property, FormData } from '@/lib/types'

interface Props {
  data: FormData
  onChange: (updates: Partial<FormData>) => void
  errors: Record<string, string>
  onNext: () => void
  onFieldBlur?: (field: string) => void
}

function UnitRow({
  property,
  selected,
  onClick,
  onDetails,
}: {
  property: Property
  selected: boolean
  onClick: () => void
  onDetails: () => void
}) {
  const badges = [
    property.bedrooms,
    property.bathrooms,
    property.available ? `Avail: ${property.available}` : '',
    property.parking,
    property.pets,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 rounded-lg border transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-300'
          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
      }`}
    >
      {/* Check indicator */}
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected ? 'bg-primary-500 border-primary-500' : 'border-gray-300'
        }`}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">
            {property.unit ? `Unit ${property.unit}` : property.name}
          </span>
          {property.rent > 0 && (
            <span className="font-bold text-primary-500 text-sm">
              ${property.rent.toLocaleString()}/mo
            </span>
          )}
          {property.status === 'COMING UP' && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Coming Up
            </span>
          )}
        </div>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {badges.map((b) => (
              <span key={b} className="text-xs text-gray-400">
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Details button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDetails() }}
        className="flex-shrink-0 text-xs text-primary-400 hover:text-primary-600 hover:underline ml-1"
      >
        Details
      </button>
    </button>
  )
}

export default function Step1Property({ data, onChange, errors, onNext }: Props) {
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Property | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    fetch('/api/properties')
      .then((r) => r.json())
      .then((props: Property[]) => {
        setAllProperties(props)
        setLoading(false)
      })
      .catch(() => {
        setFetchError('Could not load properties. You can still submit a blank application.')
        setLoading(false)
      })
  }, [])

  // Group by address, then filter by search query
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const matched = allProperties.filter(
      (p) =>
        p.address.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
    )

    // Group by address
    const groups = new Map<string, Property[]>()
    for (const p of matched) {
      const key = p.address || p.name
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }

    return Array.from(groups.entries()).slice(0, 5) // max 5 addresses
  }, [query, allProperties])

  const noResults = query.trim().length >= 2 && results.length === 0 && !loading

  const handleSkip = () => {
    onChange({ property: null, monthlyRent: '' })
    onNext()
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold text-primary-500 mb-1">
        Property Search
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Type the address of the unit you are applying for. If you don&apos;t know the address yet,
        you can proceed without selecting one.
      </p>

      {/* Search input */}
      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {loading ? (
            <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          )}
        </div>
        <input
          type="text"
          className="form-input pl-9 text-base"
          placeholder="Type a street address or city…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (data.property) onChange({ property: null, monthlyRent: '' })
          }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onChange({ property: null, monthlyRent: '' }) }}
            className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {errors.property && (
        <p className="text-secondary text-sm mb-3">{errors.property}</p>
      )}

      {fetchError && (
        <p className="text-amber-600 text-xs mb-3">{fetchError}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4 mb-4">
          {results.map(([address, units]) => (
            <div key={address} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {address}
                </p>
              </div>
              <div className="p-2 space-y-1">
                {units.map((p) => (
                  <UnitRow
                    key={p.id}
                    property={p}
                    selected={data.property?.id === p.id}
                    onClick={() => onChange({ property: p, monthlyRent: p.rent ? String(p.rent) : '' })}
                    onDetails={() => setPreview(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
          <p className="font-medium mb-1">No available units found for &ldquo;{query}&rdquo;</p>
          <p className="text-amber-700">
            The address may not be in our system yet, or the unit may not currently be available.
            You can still proceed and fill in the property details manually in the next step.
          </p>
        </div>
      )}

      {/* Selected property summary */}
      {data.property && (
        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center mt-0.5">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-primary-700">Selected Property</p>
            <p className="text-sm text-primary-600">
              {data.property.address}
              {data.property.unit ? `, Unit ${data.property.unit}` : ''} — {data.property.city}
            </p>
            {data.property.rent > 0 && (
              <p className="text-sm text-primary-600">${data.property.rent.toLocaleString()}/mo</p>
            )}
          </div>
        </div>
      )}

      {/* Property detail modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Photo */}
            <div className="relative h-44 bg-gray-100 flex-shrink-0">
              {preview.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.pictureUrl} alt={preview.address} className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
              )}
              <button type="button" onClick={() => setPreview(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-lg text-gray-900 leading-snug" style={{ fontWeight: 700 }}>
                  {preview.address}{preview.unit ? `, Unit ${preview.unit}` : ''}
                </h3>
                {preview.status === 'COMING UP' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0" style={{ fontWeight: 600 }}>
                    Coming Up
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4" style={{ fontWeight: 300 }}>{preview.city} {preview.postal}</p>

              {preview.rent > 0 && (
                <p className="text-2xl text-primary-500 mb-4" style={{ fontWeight: 700 }}>
                  ${preview.rent.toLocaleString()}<span className="text-sm text-gray-400 ml-1" style={{ fontWeight: 400 }}>/mo</span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm mb-5">
                {[
                  ['Bedrooms', preview.bedrooms],
                  ['Bathrooms', preview.bathrooms],
                  ['Available', preview.available],
                  ['Parking', preview.parking],
                  ['Laundry', preview.laundry],
                  ['Pets', preview.pets],
                  ['Balcony', preview.balcony && preview.balcony !== 'No' ? 'Yes' : null],
                  ['Floor', preview.floor],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 mb-0.5" style={{ fontWeight: 300 }}>{label}</p>
                    <p className="text-gray-800" style={{ fontWeight: 500 }}>{val}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onChange({ property: preview, monthlyRent: preview.rent ? String(preview.rent) : '' })
                  setPreview(null)
                }}
                className="btn-primary w-full justify-center"
              >
                Select This Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip option */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-sm text-gray-500 mb-3">
          Don&apos;t see your unit listed, or don&apos;t know the address yet?
        </p>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-all group text-left"
        >
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700 group-hover:text-primary-600 transition-colors">
              Continue without selecting a property
            </p>
            <p className="text-xs text-gray-400 group-hover:text-primary-400 transition-colors mt-0.5">
              You&apos;ll enter the address manually on the next step
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
