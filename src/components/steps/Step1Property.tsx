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

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']

function UnitRow({
  property,
  selectedRank,
  onClick,
  onDetails,
}: {
  property: Property
  selectedRank: number  // 0 if not selected, 1+ for preference rank
  onClick: () => void
  onDetails: () => void
}) {
  const selected = selectedRank > 0
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
      className={`w-full text-left px-4 py-3 flex items-center gap-3 border transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
          : 'border-brand-border hover:border-primary-300 hover:bg-brand-bg'
      }`}
    >
      {/* Rank indicator */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
          selected ? 'bg-primary-500 border-primary-500 text-white' : 'border-brand-border text-brand-gray'
        }`}
      >
        {selected ? selectedRank : ''}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-brand-dark text-sm" style={{ fontWeight: 600 }}>
            {property.unit ? `Unit ${property.unit}` : property.name}
          </span>
          {property.rent > 0 && (
            <span className="text-primary-500 text-sm" style={{ fontWeight: 600 }}>
              ${property.rent.toLocaleString()}/mo
            </span>
          )}
          {property.status === 'COMING UP' && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 font-medium">
              Coming Up
            </span>
          )}
        </div>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {badges.map((b) => (
              <span key={b} className="text-xs text-brand-gray">
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

export default function Step1Property({ data, onChange, onNext }: Props) {
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

  const properties = data.properties || []
  const selectedRank = (id: string) => {
    const i = properties.findIndex((p) => p.id === id)
    return i === -1 ? 0 : i + 1
  }

  // Selection updates keep `property` in sync with `properties[0]` so the
  // existing sidebar / monthlyRent / pdf code keeps working unchanged.
  const updateSelection = (next: Property[]) => {
    const primary = next[0] ?? null
    onChange({
      properties: next,
      property: primary,
      monthlyRent: primary?.rent ? String(primary.rent) : '',
    })
  }

  const toggleProperty = (p: Property) => {
    const exists = properties.some((x) => x.id === p.id)
    if (exists) {
      updateSelection(properties.filter((x) => x.id !== p.id))
    } else {
      updateSelection([...properties, p])
    }
  }

  const moveProperty = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= properties.length) return
    const next = [...properties]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateSelection(next)
  }

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

    const groups = new Map<string, Property[]>()
    for (const p of matched) {
      const key = p.address || p.name
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }

    return Array.from(groups.entries()).slice(0, 5)
  }, [query, allProperties])

  const noResults = query.trim().length >= 2 && results.length === 0 && !loading

  const handleSkip = () => {
    updateSelection([])
    onNext()
  }

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>
        Property Search
      </h2>
      <p className="text-sm text-brand-gray mb-2">
        Type the address of the unit you are applying for. You can select multiple units in
        order of preference — we will create one application per property.
      </p>
      <p className="text-sm text-brand-gray mb-6">
        If you don&apos;t know the address yet, you can proceed without selecting one.
      </p>

      {/* Selected list */}
      {properties.length > 0 && (
        <div className="mb-5 border border-primary-200 bg-primary-50">
          <div className="px-4 py-2 border-b border-primary-200 flex items-center justify-between">
            <p className="text-xs text-primary-700 uppercase tracking-wide" style={{ fontWeight: 700 }}>
              Selected — {properties.length} {properties.length === 1 ? 'property' : 'properties'} in order of preference
            </p>
            <button
              type="button"
              onClick={() => updateSelection([])}
              className="text-xs text-primary-600 hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="p-2 space-y-1.5">
            {properties.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 bg-white border border-primary-200 px-3 py-2"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-brand-dark truncate" style={{ fontWeight: 600 }}>
                    {p.address}{p.unit ? `, Unit ${p.unit}` : ''}
                    <span className="text-xs text-brand-gray ml-2 font-normal">
                      {ORDINAL[i] ?? `${i + 1}th`} choice
                    </span>
                  </p>
                  <p className="text-xs text-brand-gray">
                    {p.city} {p.rent > 0 && `· $${p.rent.toLocaleString()}/mo`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveProperty(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    title="Move up"
                    className="w-7 h-7 flex items-center justify-center text-brand-gray hover:text-primary-500 hover:bg-primary-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProperty(i, 1)}
                    disabled={i === properties.length - 1}
                    aria-label="Move down"
                    title="Move down"
                    className="w-7 h-7 flex items-center justify-center text-brand-gray hover:text-primary-500 hover:bg-primary-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleProperty(p)}
                    aria-label="Remove"
                    title="Remove"
                    className="w-7 h-7 flex items-center justify-center text-brand-gray hover:text-secondary hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-primary-200">
            <button type="button" onClick={onNext} className="btn-primary w-full sm:w-auto">
              Continue with {properties.length} {properties.length === 1 ? 'property' : 'properties'}
              <svg className="w-4 h-4 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="relative mb-2">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {loading ? (
            <svg className="animate-spin w-4 h-4 text-brand-gray" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-brand-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          )}
        </div>
        <input
          type="text"
          className="form-input pl-9 text-base"
          placeholder={properties.length > 0 ? 'Add another property...' : 'Type a street address or city...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-brand-gray hover:text-brand-dark"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {fetchError && (
        <p className="text-amber-600 text-xs mb-3">{fetchError}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4 mb-4">
          {results.map(([address, units]) => (
            <div key={address} className="bg-white border border-brand-border overflow-hidden">
              <div className="px-4 py-2 bg-brand-bg border-b border-brand-border">
                <p className="text-xs text-brand-gray uppercase tracking-wide" style={{ fontWeight: 600 }}>
                  {address}
                </p>
              </div>
              <div className="p-2 space-y-1">
                {units.map((p) => (
                  <UnitRow
                    key={p.id}
                    property={p}
                    selectedRank={selectedRank(p.id)}
                    onClick={() => toggleProperty(p)}
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
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-4 text-sm text-amber-800">
          <p className="font-medium mb-1">No available units found for &ldquo;{query}&rdquo;</p>
          <p className="text-amber-700">
            The address may not be in our system yet, or the unit may not currently be available.
            You can still proceed and fill in the property details manually in the next step.
          </p>
        </div>
      )}

      {/* Property detail modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4">
          <div className="bg-white w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="relative h-44 bg-brand-bg flex-shrink-0">
              {preview.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.pictureUrl} alt={preview.address} className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-border">
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

            <div className="p-5 overflow-y-auto">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-lg text-brand-dark leading-snug" style={{ fontWeight: 700 }}>
                  {preview.address}{preview.unit ? `, Unit ${preview.unit}` : ''}
                </h3>
                {preview.status === 'COMING UP' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 flex-shrink-0" style={{ fontWeight: 600 }}>
                    Coming Up
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray mb-4">{preview.city} {preview.postal}</p>

              {preview.rent > 0 && (
                <p className="text-2xl text-primary-500 mb-4" style={{ fontWeight: 700 }}>
                  ${preview.rent.toLocaleString()}<span className="text-sm text-brand-gray ml-1" style={{ fontWeight: 400 }}>/mo</span>
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
                  <div key={label} className="bg-brand-bg px-3 py-2">
                    <p className="text-xs text-brand-gray mb-0.5">{label}</p>
                    <p className="text-brand-dark" style={{ fontWeight: 600 }}>{val}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!properties.some((x) => x.id === preview.id)) {
                    updateSelection([...properties, preview])
                  }
                  setPreview(null)
                }}
                className="btn-primary w-full justify-center"
                disabled={properties.some((x) => x.id === preview.id)}
              >
                {properties.some((x) => x.id === preview.id) ? 'Already Selected' : 'Add to Selection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip option — only show when nothing is selected */}
      {properties.length === 0 && (
        <div className="mt-6 pt-5 border-t border-brand-border">
          <p className="text-sm text-brand-gray mb-3">
            Don&apos;t see your unit listed, or don&apos;t know the address yet?
          </p>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full flex items-center gap-4 px-5 py-4 border-2 border-dashed border-brand-border hover:border-primary-400 hover:bg-primary-50 transition-all group text-left"
          >
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-brand-bg group-hover:bg-primary-100 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5 text-brand-gray group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-brand-dark group-hover:text-primary-600 transition-colors" style={{ fontWeight: 600 }}>
                Continue without selecting a property
              </p>
              <p className="text-xs text-brand-gray group-hover:text-primary-400 transition-colors mt-0.5">
                You&apos;ll enter the address manually on the next step
              </p>
            </div>
            <svg className="w-5 h-5 text-brand-border group-hover:text-primary-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
