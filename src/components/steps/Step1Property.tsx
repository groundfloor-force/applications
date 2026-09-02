'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Property, FormData } from '@/lib/types'
import { useT } from '@/lib/locale-context'
import { tpl } from '@/lib/i18n'

interface Props {
  data: FormData
  onChange: (updates: Partial<FormData>) => void
  errors: Record<string, string>
  onNext: () => void
  onFieldBlur?: (field: string) => void
}

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']

// Vacancy board stores pets as raw dropdown values like "Cat", "Dog", "Y/Y",
// or "No" that don't read well to applicants. Surface a friendlier label.
function petsFriendly(raw: string): string {
  if (!raw) return ''
  const v = raw.trim().toUpperCase()
  if (v === 'NO' || v === 'N' || v === 'NONE' || v === 'N/N' || v === '') return 'No pets'
  return 'Pet-friendly'
}

function UnitRow({
  property,
  selectedRank,
  onClick,
  onDetails,
}: {
  property: Property
  selectedRank: number
  onClick: () => void
  onDetails: () => void
}) {
  const t = useT()
  const selected = selectedRank > 0
  const petsLabel = petsFriendly(property.pets)
  const badges = [
    property.bedrooms,
    property.bathrooms,
    property.available ? `${t.step1.available}: ${property.available}` : '',
    property.parking ? `${t.step1.parking}: ${property.parking}` : '',
    petsLabel,
  ].filter(Boolean)

  return (
    <div
      className={`w-full flex items-stretch border transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
          : 'border-brand-border hover:border-primary-300 hover:bg-brand-bg'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left px-4 py-3 flex items-center gap-3"
      >
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
              {property.address
                ? `${property.address}${property.unit ? `, Unit ${property.unit}` : ''}`
                : property.unit
                  ? `Unit ${property.unit}`
                  : property.name}
            </span>
            {property.rent > 0 && (
              <span className="text-primary-500 text-sm" style={{ fontWeight: 600 }}>
                ${property.rent.toLocaleString()}{t.step1.perMonth}
              </span>
            )}
            {property.status === 'COMING UP' && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 font-medium">
                {t.step1.comingUp}
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
      </button>

      <button
        type="button"
        onClick={onDetails}
        className="flex-shrink-0 text-xs text-primary-400 hover:text-primary-600 hover:underline px-4 py-3"
      >
        {t.step1.details}
      </button>
    </div>
  )
}

export default function Step1Property({ data, onChange, onNext }: Props) {
  const t = useT()
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Property | null>(null)
  const fetchedRef = useRef(false)
  const searchRef = useRef<HTMLInputElement | null>(null)

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
        setFetchError(t.step1.fetchError)
        setLoading(false)
      })
  }, [])

  const properties = data.properties || []
  const selectedRank = (id: string) => {
    const i = properties.findIndex((p) => p.id === id)
    return i === -1 ? 0 : i + 1
  }

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

  const focusSearch = () => {
    setQuery('')
    setTimeout(() => {
      searchRef.current?.focus()
      searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

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
        {t.step1.title}
      </h2>
      <p className="text-sm text-brand-gray mb-4">
        {t.step1.subtitleMulti}
      </p>

      {/* Multi-select tip — prominent, especially before any selection */}
      <div className="mb-5 bg-primary-50 border border-primary-200 px-4 py-3 flex items-start gap-3">
        <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p className="text-sm text-primary-700 leading-snug">
          {t.step1.multiTip}
        </p>
      </div>

      {/* Search input — always visible at the top */}
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
          ref={searchRef}
          type="text"
          className="form-input pl-9 text-base"
          placeholder={properties.length > 0 ? t.step1.addAnotherPlaceholder : t.step1.searchPlaceholder}
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
        <div className="space-y-4 mb-5">
          {results.map(([address, units]) => (
            <div key={address} className="bg-white border border-brand-border overflow-hidden">
              <div className="px-4 py-3 bg-brand-bg border-b border-brand-border">
                <p className="text-base text-brand-dark" style={{ fontWeight: 700 }}>
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
          <p className="font-medium mb-1">{t.step1.noResults} &ldquo;{query}&rdquo;</p>
          <p className="text-amber-700">{t.step1.noResultsHint}</p>
        </div>
      )}

      {/* Selected list — appears once 1+ properties are picked */}
      {properties.length > 0 && (
        <div className="mt-2 border-2 border-primary-300 bg-white">
          <div className="px-4 py-3 border-b border-primary-200 flex items-center justify-between bg-primary-50">
            <p className="text-sm text-primary-700" style={{ fontWeight: 700 }}>
              {tpl(t.step1.selectedHeading, {
                n: properties.length,
                label: properties.length === 1 ? t.step1.property : t.step1.properties,
              })}
            </p>
            <button
              type="button"
              onClick={() => updateSelection([])}
              className="text-xs text-primary-600 hover:underline"
            >
              {t.step1.clearAll}
            </button>
          </div>
          <div className="p-3 space-y-2">
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
                    {p.address}{p.unit ? `, ${p.unit}` : ''}
                    <span className="text-xs text-brand-gray ml-2 font-normal">
                      {ORDINAL[i] ?? `${i + 1}`} {t.step1.choice}
                    </span>
                  </p>
                  <p className="text-xs text-brand-gray">
                    {p.city} {p.rent > 0 && `· $${p.rent.toLocaleString()}${t.step1.perMonth}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveProperty(i, -1)}
                    disabled={i === 0}
                    aria-label={t.step1.moveUp}
                    title={t.step1.moveUp}
                    className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-brand-gray hover:text-primary-500 hover:bg-primary-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProperty(i, 1)}
                    disabled={i === properties.length - 1}
                    aria-label={t.step1.moveDown}
                    title={t.step1.moveDown}
                    className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-brand-gray hover:text-primary-500 hover:bg-primary-50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleProperty(p)}
                    aria-label={t.step1.remove}
                    title={t.step1.remove}
                    className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-brand-gray hover:text-secondary hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add another / Continue — two clear actions side by side */}
          <div className="px-4 py-4 border-t border-primary-200 bg-brand-bg space-y-3">
            <button
              type="button"
              onClick={focusSearch}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-primary-300 hover:border-primary-500 hover:bg-primary-50 text-primary-600 text-sm transition-all"
              style={{ fontWeight: 600 }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {t.step1.addAnother}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="btn-primary w-full justify-center"
            >
              {tpl(t.step1.continueWith, {
                n: properties.length,
                label: properties.length === 1 ? t.step1.property : t.step1.properties,
              })}
              <svg className="w-4 h-4 ml-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Property detail modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="bg-white w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[88dvh] sm:max-h-[90vh] flex flex-col">
            <div className="relative h-32 sm:h-44 bg-brand-bg flex-shrink-0">
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
                  {preview.address}{preview.unit ? `, ${preview.unit}` : ''}
                </h3>
                {preview.status === 'COMING UP' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 flex-shrink-0" style={{ fontWeight: 600 }}>
                    {t.step1.comingUp}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-gray mb-4">{preview.city} {preview.postal}</p>

              {preview.rent > 0 && (
                <p className="text-2xl text-primary-500 mb-4" style={{ fontWeight: 700 }}>
                  ${preview.rent.toLocaleString()}<span className="text-sm text-brand-gray ml-1" style={{ fontWeight: 400 }}>{t.step1.perMonth}</span>
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm mb-5">
                {[
                  [t.step1.bedrooms, preview.bedrooms],
                  [t.step1.bathrooms, preview.bathrooms],
                  [t.step1.available, preview.available],
                  [t.step1.parking, preview.parking],
                  [t.step1.laundry, preview.laundry],
                  [t.step1.pets, petsFriendly(preview.pets)],
                  [t.step1.balcony, preview.balcony && preview.balcony !== 'No' ? t.common.yes : null],
                  [t.step1.floor, preview.floor],
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
                {properties.some((x) => x.id === preview.id) ? t.step1.alreadySelected : t.step1.addToSelection}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip option — only when nothing selected */}
      {properties.length === 0 && (
        <div className="mt-6 pt-5 border-t border-brand-border">
          <p className="text-sm text-brand-gray mb-3">
            {t.step1.skipPrompt}
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
                {t.step1.skipTitle}
              </p>
              <p className="text-xs text-brand-gray group-hover:text-primary-400 transition-colors mt-0.5">
                {t.step1.skipSub}
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
