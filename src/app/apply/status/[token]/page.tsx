import { getConfig } from '@/lib/config'
import { getApplicationByToken, getApplicantConversation } from '@/lib/monday'
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

  const initialConversation = app
    ? await getApplicantConversation(app.id).catch(() => [])
    : []

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-12 object-contain" />
          <Link href={`/apply/${locale}`} className="text-sm text-primary-500 hover:underline">
            {t.status.backHome} →
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
        {!app ? (
          <div className="bg-white border border-brand-border p-12 max-w-2xl">
            <div className="w-16 h-16 bg-brand-bg flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-brand-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>{t.status.notFound}</h1>
            <p className="text-brand-gray text-sm">{t.status.notFoundSub}</p>
          </div>
        ) : (
          <StatusContent
            locale={locale}
            token={token}
            initialApp={app}
            initialConversation={initialConversation}
          />
        )}
      </main>

      <footer className="border-t border-brand-border bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 text-sm text-brand-gray flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} {config.companyName}.</span>
          <a href="https://www.groundfloorpm.com" className="text-primary-500 hover:underline">
            groundfloorpm.com
          </a>
        </div>
      </footer>
    </div>
  )
}
