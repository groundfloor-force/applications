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
        <div className="max-w-5xl mx-auto px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-12 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center animate-fade-up">
          <div className="w-20 h-20 bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl text-brand-dark mb-3">
            {t.success.title}
          </h1>
          <p className="text-brand-dark mb-2">
            {t.success.thankYou}{' '}
            <strong className="text-primary-500">{config.companyName}</strong>.
          </p>
          <p className="text-brand-gray text-sm mb-8">
            {t.success.received}
          </p>

          {token && (
            <div className="bg-primary-50 border border-primary-200 p-5 mb-6">
              <p className="text-sm text-primary-700 mb-3" style={{ fontWeight: 600 }}>
                {t.success.trackTitle}
              </p>
              <p className="text-xs text-primary-500 mb-4">
                {t.success.trackHint}
              </p>
              <Link
                href={`/apply/status/${token}?lang=${locale}`}
                className="inline-flex items-center gap-2 btn-primary text-sm px-6 py-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {t.success.viewStatus}
              </Link>
            </div>
          )}

          <div className="bg-white border border-brand-border p-5 text-sm text-brand-dark mb-6 text-left">
            <p className="mb-2" style={{ fontWeight: 600 }}>{t.success.whatNext}</p>
            <ol className="space-y-1.5 list-decimal list-inside text-brand-gray">
              <li>{t.success.next1}</li>
              <li>{t.success.next2}</li>
              <li>{t.success.next3}</li>
              <li>{t.success.next4}</li>
            </ol>
          </div>

          <div className="bg-primary-50 border border-primary-200 p-5 text-sm text-brand-dark mb-8 text-left">
            <p className="mb-2 text-primary-700" style={{ fontWeight: 600 }}>
              {t.success.prepareTitle}
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-primary-700">
              <li>{t.success.prepare1}</li>
              <li>{t.success.prepare2}</li>
              <li>{t.success.prepare3}</li>
              <li>{t.success.prepare4}</li>
            </ul>
          </div>

          <Link
            href="https://www.groundfloorpm.com"
            className="text-primary-500 hover:underline text-sm"
          >
            {t.success.returnHome}
          </Link>
        </div>
      </main>
    </div>
  )
}
