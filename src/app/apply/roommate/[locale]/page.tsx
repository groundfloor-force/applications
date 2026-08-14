import { notFound } from 'next/navigation'
import { getConfig } from '@/lib/config'
import RoommateChangeForm from '@/components/roommate/RoommateChangeForm'
import { LocaleProvider } from '@/lib/locale-context'
import { getDictionary, Locale } from '@/lib/i18n'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const VALID_LOCALES: Locale[] = ['en', 'fr']

export default async function RoommateLocalizedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ autofill?: string }>
}) {
  const { locale: rawLocale } = await params
  if (!VALID_LOCALES.includes(rawLocale as Locale)) notFound()
  const locale = rawLocale as Locale
  const sp = await searchParams
  const autofill = sp.autofill === '1'
  const autofillQuery = autofill ? '?autofill=1' : ''

  const config = await getConfig()
  const t = getDictionary(locale)
  const otherLocale: Locale = locale === 'en' ? 'fr' : 'en'
  const otherLabel = locale === 'en' ? 'Français' : 'English'

  return (
    <LocaleProvider locale={locale}>
      <div className="min-h-screen bg-brand-bg">
        <header className="bg-white border-b border-brand-border sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={config.logoUrl} alt={config.companyName} className="h-9 sm:h-12 object-contain" />
            <Link
              href={`/apply/roommate/${otherLocale}${autofillQuery}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-brand-gray hover:text-primary-500 hover:bg-primary-50 border border-brand-border hover:border-primary-300 transition-colors flex-shrink-0"
              title={`Switch to ${otherLabel}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {otherLabel}
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <RoommateChangeForm autofill={autofill} />
        </main>

        <footer className="mt-16 border-t border-brand-border bg-white py-8 text-center text-sm text-brand-gray">
          &copy; {new Date().getFullYear()} {config.companyName}. {t.apply.copyright}
        </footer>
      </div>
    </LocaleProvider>
  )
}
