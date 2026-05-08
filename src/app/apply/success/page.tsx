import Link from 'next/link'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const config = await getConfig()
  const { token } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-10 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl text-gray-900 mb-3" style={{ fontWeight: 700 }}>
            Application Submitted!
          </h1>
          <p className="text-gray-600 mb-2" style={{ fontWeight: 400 }}>
            Thank you for applying with{' '}
            <strong className="text-primary-500">{config.companyName}</strong>.
          </p>
          <p className="text-gray-500 text-sm mb-8" style={{ fontWeight: 300 }}>
            Your application has been received and sent to our leasing team. We will be in touch
            shortly.
          </p>

          {token && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-5 mb-6">
              <p className="text-sm text-primary-700 mb-3" style={{ fontWeight: 600 }}>
                Track your application status
              </p>
              <p className="text-xs text-primary-600 mb-4" style={{ fontWeight: 300 }}>
                Bookmark this link to check your application status at any time.
              </p>
              <Link
                href={`/apply/status/${token}`}
                className="inline-flex items-center gap-2 btn-primary text-sm px-6 py-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View Application Status
              </Link>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-xl p-5 text-sm text-gray-600 mb-8 text-left">
            <p className="mb-2" style={{ fontWeight: 600 }}>What happens next?</p>
            <ol className="space-y-1.5 list-decimal list-inside" style={{ fontWeight: 300 }}>
              <li>Our team reviews your application (typically within 1–2 business days)</li>
              <li>We contact your previous landlord and references</li>
              <li>You will be notified of the decision by email or phone</li>
              <li>If approved, you will receive your lease agreement to review and sign</li>
            </ol>
          </div>

          <Link
            href="https://www.groundfloorpm.com"
            className="text-primary-500 hover:underline text-sm"
            style={{ fontWeight: 400 }}
          >
            Return to Ground Floor Property Management →
          </Link>
        </div>
      </main>
    </div>
  )
}
