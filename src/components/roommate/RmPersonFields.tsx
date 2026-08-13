'use client'

import FormField from '@/components/FormField'
import { formatPhone } from '@/lib/utils'
import { useT } from '@/lib/locale-context'
import type { RoommatePerson } from '@/lib/types'

export default function RmPersonFields({
  person,
  prefix,
  errors,
  onChange,
}: {
  person: RoommatePerson
  prefix: string
  errors: Record<string, string>
  onChange: (updates: Partial<RoommatePerson>) => void
}) {
  const t = useT()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label={t.common.firstName} required error={errors[`${prefix}_firstName`]}>
        <input
          className="form-input"
          autoComplete="off"
          autoCapitalize="words"
          value={person.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
        />
      </FormField>
      <FormField label={t.common.lastName} required error={errors[`${prefix}_lastName`]}>
        <input
          className="form-input"
          autoComplete="off"
          autoCapitalize="words"
          value={person.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
        />
      </FormField>
      <FormField label={t.common.email} required error={errors[`${prefix}_email`]}>
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="form-input"
          value={person.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </FormField>
      <FormField label={t.common.phone} required error={errors[`${prefix}_phone`]}>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="off"
          className="form-input"
          value={person.phone}
          onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
        />
      </FormField>
    </div>
  )
}
