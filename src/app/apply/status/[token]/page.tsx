import { getConfig } from '@/lib/config'
import { getApplicationByToken } from '@/lib/monday'
import { getDictionary, Locale } from '@/lib/i18n'
import StatusContent from '@/components/StatusContent'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function StatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { token } = await params
  const { lang } = await searchParams
  const locale: Locale = lang === 'fr' ? 'fr' : 'en'
  const t = getDictionary(locale)

  const [config, app] = await Promise.all([
    getConfig(),
    getApplicationByToken(token).catch(() => null),
  ])

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-12 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          {!app ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-bg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>{t.status.notFound}</h1>
              <p className="text-brand-gray text-sm">{t.status.notFoundSub}</p>
            </div>
          ) : (
            <StatusContent locale={locale} token={token} initialApp={app} />
          )}

          <div className="text-center mt-8">
            <Link href={`/apply/${locale}`} className="text-sm text-primary-500 hover:underline">
              {t.status.backHome}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
