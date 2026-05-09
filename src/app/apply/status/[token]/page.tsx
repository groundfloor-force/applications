import { getConfig } from '@/lib/config'
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

interface AppStatus {
  id: string
  name: string
  status: string
  address: string
  unit: string
  moveInDate: string
  submittedDate: string
  mondayUrl: string
}

async function fetchStatus(token: string): Promise<AppStatus | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/status/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function StatusPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [config, app] = await Promise.all([getConfig(), fetchStatus(token)])

  const style = app ? (STATUS_STYLES[app.status] ?? STATUS_STYLES['New']) : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 ">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-10 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          {!app ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl text-gray-800 mb-2" style={{ fontWeight: 700 }}>Application Not Found</h1>
              <p className="text-gray-500 text-sm">
                This link may have expired or the token is invalid. Please contact us if you believe this is an error.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>Application Status</h1>
                <p className="text-sm text-gray-400" style={{ fontWeight: 300 }}>
                  {app.name}
                </p>
              </div>

              {/* Status badge */}
              <div className={` p-6 mb-6 text-center ${style!.bg}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${style!.dot} animate-pulse`} />
                  <span className={`text-xl font-bold ${style!.text}`}>{style!.label}</span>
                </div>
                <p className={`text-sm ${style!.text} opacity-80`}>
                  {STATUS_MESSAGES[app.status] ?? STATUS_MESSAGES['New']}
                </p>
              </div>

              {/* Application details */}
              <div className="bg-white  border border-gray-100  p-5 mb-6">
                <h2 className="text-sm uppercase tracking-wide text-gray-400 mb-4" style={{ fontWeight: 600 }}>
                  Your Application
                </h2>
                <div className="space-y-2 text-sm">
                  {(app.address) && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Property</span>
                      <span className="text-gray-800" style={{ fontWeight: 500 }}>
                        {app.address}{app.unit ? ` Unit ${app.unit}` : ''}
                      </span>
                    </div>
                  )}
                  {app.moveInDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Requested Move-In</span>
                      <span className="text-gray-800" style={{ fontWeight: 500 }}>{app.moveInDate}</span>
                    </div>
                  )}
                  {app.submittedDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Submitted</span>
                      <span className="text-gray-800" style={{ fontWeight: 400 }}>{app.submittedDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-gray-400" style={{ fontWeight: 300 }}>
                Questions? Contact us at{' '}
                <a href="https://www.groundfloorpm.com" className="text-primary-500 hover:underline">
                  groundfloorpm.com
                </a>
              </p>
            </>
          )}

          <div className="text-center mt-8">
            <Link href="/apply" className="text-sm text-primary-500 hover:underline">
              ← Submit another application
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
