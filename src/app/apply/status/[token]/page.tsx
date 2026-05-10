import { getConfig } from '@/lib/config'
import { getApplicationByToken } from '@/lib/monday'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  New:            { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-400',   label: 'Received' },
  'Under Review': { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400',  label: 'Under Review' },
  Approved:       { bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500',  label: 'Approved' },
  Declined:       { bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500',    label: 'Not Selected' },
}

const STATUS_MESSAGES: Record<string, string> = {
  New:            'Your application has been received and is in our queue. We typically review applications within 1–2 business days.',
  'Under Review': 'Your application is currently being reviewed by our team. We may be contacting your references and previous landlord.',
  Approved:       'Congratulations! Your application has been approved. Our team will be reaching out to you shortly with next steps.',
  Declined:       'Thank you for your interest. Unfortunately your application was not selected for this unit. We encourage you to apply again for other available units.',
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [config, app] = await Promise.all([
    getConfig(),
    getApplicationByToken(token).catch(() => null),
  ])

  const style = app ? (STATUS_STYLES[app.status] ?? STATUS_STYLES['New']) : null

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
              <h1 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>Application Not Found</h1>
              <p className="text-brand-gray text-sm">
                This link may have expired or the token is invalid. Please contact us if you believe this is an error.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>Application Status</h1>
                <p className="text-sm text-brand-gray">
                  {app.name}
                </p>
              </div>

              {/* Status badge */}
              <div className={`p-6 mb-6 text-center ${style!.bg}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${style!.dot} animate-pulse`} />
                  <span className={`text-xl ${style!.text}`} style={{ fontWeight: 700 }}>{style!.label}</span>
                </div>
                <p className={`text-sm ${style!.text} opacity-80`}>
                  {STATUS_MESSAGES[app.status] ?? STATUS_MESSAGES['New']}
                </p>
              </div>

              {/* Application details */}
              <div className="bg-white border border-brand-border p-5 mb-6">
                <h2 className="text-sm uppercase tracking-widest text-brand-gray mb-4" style={{ fontWeight: 600 }}>
                  Your Application
                </h2>
                <div className="space-y-2 text-sm">
                  {app.address && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray">Property</span>
                      <span className="text-brand-dark" style={{ fontWeight: 600 }}>
                        {app.address}{app.unit ? ` Unit ${app.unit}` : ''}
                      </span>
                    </div>
                  )}
                  {app.moveInDate && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray">Requested Move-In</span>
                      <span className="text-brand-dark" style={{ fontWeight: 600 }}>{app.moveInDate}</span>
                    </div>
                  )}
                  {app.submittedDate && (
                    <div className="flex justify-between">
                      <span className="text-brand-gray">Submitted</span>
                      <span className="text-brand-dark">{app.submittedDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-brand-gray">
                Questions? Contact us at{' '}
                <a href="https://www.groundfloorpm.com" className="text-primary-500 hover:underline">
                  groundfloorpm.com
                </a>
              </p>
            </>
          )}

          <div className="text-center mt-8">
            <Link href="/apply" className="text-sm text-primary-500 hover:underline">
              Submit another application
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
