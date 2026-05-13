import { getConfig } from '@/lib/config'
import { getApplicationByToken } from '@/lib/monday'
import { getDictionary, Locale } from '@/lib/i18n'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  New:            { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-400'   },
  'Under Review': { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400'  },
  Approved:       { bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500'  },
  Declined:       { bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500'    },
}

const STATUS_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    New: 'Received',
    'Under Review': 'Under Review',
    Approved: 'Approved',
    Declined: 'Not Selected',
  },
  fr: {
    New: 'Reçue',
    'Under Review': 'En cours d’examen',
    Approved: 'Approuvée',
    Declined: 'Non retenue',
  },
}

const STATUS_MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    New: 'Your application has been received and is in our queue. We typically review applications within 1–2 business days.',
    'Under Review': 'Your application is currently being reviewed by our team. We may be contacting your references and previous landlord.',
    Approved: 'Congratulations! Your application has been approved. Our team will be reaching out to you shortly with next steps.',
    Declined: 'Thank you for your interest. Unfortunately your application was not selected for this unit. We encourage you to apply again for other available units.',
  },
  fr: {
    New: 'Votre demande a été reçue et est dans notre file d’attente. Nous examinons généralement les demandes sous 1 à 2 jours ouvrables.',
    'Under Review': 'Votre demande est actuellement à l’étude par notre équipe. Nous pourrions communiquer avec vos références et votre propriétaire précédent.',
    Approved: 'Félicitations! Votre demande a été approuvée. Notre équipe communiquera avec vous sous peu pour vous indiquer les prochaines étapes.',
    Declined: 'Merci de votre intérêt. Malheureusement, votre demande n’a pas été retenue pour cette unité. Nous vous encourageons à postuler pour d’autres unités disponibles.',
  },
}

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

  const style = app ? (STATUS_STYLES[app.status] ?? STATUS_STYLES['New']) : null
  const statusLabel = app ? (STATUS_LABELS[locale][app.status] ?? STATUS_LABELS[locale]['New']) : ''
  const statusMessage = app ? (STATUS_MESSAGES[locale][app.status] ?? STATUS_MESSAGES[locale]['New']) : ''

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
              <p className="text-brand-gray text-sm">
                {t.status.notFoundSub}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>{t.status.title}</h1>
                <p className="text-sm text-brand-gray">
                  {app.name}
                </p>
              </div>

              <div className={`p-6 mb-6 text-center ${style!.bg}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${style!.dot} animate-pulse`} />
                  <span className={`text-xl ${style!.text}`} style={{ fontWeight: 700 }}>{statusLabel}</span>
                </div>
                <p className={`text-sm ${style!.text} opacity-80`}>
                  {statusMessage}
                </p>
              </div>

              <div className="bg-white border border-brand-border p-5 mb-6">
                <h2 className="text-sm uppercase tracking-widest text-brand-gray mb-4" style={{ fontWeight: 600 }}>
                  {t.status.title}
                </h2>
                <div className="space-y-2 text-sm">
                  {app.address && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray">{t.status.propertyAddress}</span>
                      <span className="text-brand-dark" style={{ fontWeight: 600 }}>
                        {app.address}{app.unit ? ` ${app.unit}` : ''}
                      </span>
                    </div>
                  )}
                  {app.moveInDate && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray">{t.status.moveInDate}</span>
                      <span className="text-brand-dark" style={{ fontWeight: 600 }}>{app.moveInDate}</span>
                    </div>
                  )}
                  {app.submittedDate && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray">{t.status.submittedDate}</span>
                      <span className="text-brand-dark">{app.submittedDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
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
