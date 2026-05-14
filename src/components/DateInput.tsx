'use client'

import { useState, useEffect } from 'react'

interface Props {
  value: string                  // ISO YYYY-MM-DD (or empty)
  onChange: (value: string) => void
  onBlur?: () => void
  className?: string
  required?: boolean
  max?: string                   // ISO max date (e.g. today's date)
  min?: string
  placeholder?: string
}

// A typeable date field. Users can punch in 8 digits (YYYYMMDD) and the
// component auto-inserts dashes. Backspace removes characters naturally.
// Emits ISO YYYY-MM-DD strings on every keystroke so parent state stays
// shape-compatible with <input type="date">.
export default function DateInput({
  value,
  onChange,
  onBlur,
  className,
  required,
  max,
  min,
  placeholder = 'YYYY-MM-DD',
}: Props) {
  const [local, setLocal] = useState(value || '')

  useEffect(() => {
    setLocal(value || '')
  }, [value])

  const formatDigits = (digits: string): string => {
    const d = digits.slice(0, 8)
    if (d.length <= 4) return d
    if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const digits = raw.replace(/\D/g, '')
    const formatted = formatDigits(digits)
    setLocal(formatted)
    // Only propagate full ISO dates; clear when user has fewer than 8 digits
    if (digits.length === 8) {
      onChange(formatted)
    } else if (digits.length === 0) {
      onChange('')
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={local}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      maxLength={10}
      required={required}
      data-max={max}
      data-min={min}
      className={className ?? 'form-input'}
    />
  )
}
