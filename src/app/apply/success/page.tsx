import Link from 'next/link'
import { getConfig } from '@/lib/config'
import { getDictionary, Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; lang?: string }>
}) {
  const config = await getConfig()
  const { token, lang } = await searchParams
  const locale: Locale = lang === 'fr' ? 'fr' : 'en'
  const t = getDictionary(locale)

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-9 sm:h-12 object-contain" />
          <a
            href="https://www.groundfloorpm.com"
            className="text-xs sm:text-sm text-primary-500 hover:underline flex-shrink-0"
          >
            {t.success.returnHome} →
          </a>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-up">
        {/* Hero band — full width, left aligned */}
        <div className="flex items-start gap-3 sm:gap-5 mb-8 sm:mb-10">
          <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 sm:w-9 sm:h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 600 }}>
              {t.common.rentalApplication}
            </p>
            <h1 className="text-2xl sm:text-4xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
              {t.success.title}
            </h1>
            <p className="text-sm sm:text-base text-brand-dark">
              {t.success.thankYou}{' '}
              <strong className="text-primary-500">{config.companyName}</strong>.{' '}
              <span className="text-brand-gray">{t.success.received}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* LEFT — what's next + if approved */}
          <div className="space-y-6 min-w-0">
            <div className="bg-white border border-brand-border">
              <div className="px-4 sm:px-6 py-4 border-b border-brand-border bg-brand-bg">
                <h2 className="text-sm uppercase tracking-widest text-brand-gray" style={{ fontWeight: 700 }}>
                  {t.success.whatNext}
                </h2>
              </div>
              <ol className="px-4 sm:px-6 py-5 space-y-3 text-sm text-brand-dark">
                {[t.success.next1, t.success.next2, t.success.next3, t.success.next4].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs" style={{ fontWeight: 700 }}>
                      {i + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-primary-50 border border-primary-200">
              <div className="px-4 sm:px-6 py-4 border-b border-primary-200">
                <h2 className="text-sm uppercase tracking-widest text-primary-700" style={{ fontWeight: 700 }}>
                  {t.success.prepareTitle}
                </h2>
              </div>
              <ul className="px-4 sm:px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-primary-700">
                {[t.success.prepare1, t.success.prepare2, t.success.prepare3, t.success.prepare4].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT — status tracking CTA */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
            {token ? (
              <div className="bg-white border-2 border-primary-300">
                <div className="px-4 sm:px-6 py-4 border-b border-primary-200 bg-primary-50">
                  <h2 className="text-sm uppercase tracking-widest text-primary-700" style={{ fontWeight: 700 }}>
                    {t.success.trackTitle}
                  </h2>
                </div>
                <div className="px-4 sm:px-6 py-5">
                  <p className="text-sm text-brand-dark mb-5 leading-relaxed">
                    {t.success.trackHint}
                  </p>
                  <Link
                    href={`/apply/status/${token}?lang=${locale}`}
                    className="btn-primary w-full justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {t.success.viewStatus}
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="bg-white border border-brand-border px-4 sm:px-6 py-5">
              <p className="text-xs text-brand-gray leading-relaxed">
                {locale === 'fr'
                  ? 'Une question? Visitez '
                  : 'Questions? Visit '}
                <a href="https://www.groundfloorpm.com" className="text-primary-500 hover:underline">
                  groundfloorpm.com
                </a>
                {locale === 'fr' ? ' ou contactez-nous directement.' : ' or contact us directly.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-brand-border bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-sm text-brand-gray flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} {config.companyName}.</span>
          <a href="https://www.groundfloorpm.com" className="text-primary-500 hover:underline">
            groundfloorpm.com
          </a>
        </div>
      </footer>
    </div>
  )
}
