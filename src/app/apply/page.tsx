import Link from 'next/link'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function ApplyIntentChooser({
  searchParams,
}: {
  searchParams: Promise<{ autofill?: string }>
}) {
  const config = await getConfig()
  const params = await searchParams
  const autofillQuery = params.autofill === '1' ? '?autofill=1' : ''

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt={config.companyName} className="h-9 sm:h-12 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="max-w-md w-full">
          <h1 className="text-2xl text-brand-dark mb-2 text-center" style={{ fontWeight: 700 }}>
            How can we help?
            <span className="block text-brand-gray text-base font-normal mt-1">
              Comment pouvons-nous vous aider?
            </span>
          </h1>
          <p className="text-sm text-brand-gray text-center mb-8">
            Choose an option / Choisissez une option
          </p>

          <div className="grid grid-cols-1 gap-3">
            {config.formOpen ? (
              <Link
                href={`/apply/start${autofillQuery}`}
                className="group flex items-center gap-4 p-5 bg-white border border-brand-border hover:border-primary-500 hover:bg-primary-50 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                    New Rental Application
                  </p>
                  <p className="text-xs text-brand-gray mt-0.5">
                    Nouvelle demande de location
                  </p>
                </div>
                <svg className="w-5 h-5 text-brand-border group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="flex items-center gap-4 p-5 bg-white border border-brand-border opacity-70">
                <div className="flex-shrink-0 w-12 h-12 bg-brand-bg flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                    New Rental Application
                  </p>
                  <p className="text-xs text-brand-gray mt-0.5">
                    {config.closedMessage || 'Applications are currently paused.'}
                  </p>
                </div>
              </div>
            )}

            <Link
              href="/apply/roommate"
              className="group flex items-center gap-4 p-5 bg-white border border-brand-border hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                  Roommate Change
                </p>
                <p className="text-xs text-brand-gray mt-0.5">
                  Changement de colocataire
                </p>
              </div>
              <svg className="w-5 h-5 text-brand-border group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-brand-border bg-white py-6 text-center text-sm text-brand-gray">
        &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
      </footer>
    </div>
  )
}
