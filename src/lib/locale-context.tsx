'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Locale, getDictionary } from './i18n'

interface LocaleContextValue {
  locale: Locale
  t: ReturnType<typeof getDictionary>
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  t: getDictionary('en'),
})

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: ReactNode
}) {
  return (
    <LocaleContext.Provider value={{ locale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useT() {
  return useContext(LocaleContext).t
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale
}
