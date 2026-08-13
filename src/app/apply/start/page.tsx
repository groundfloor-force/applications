import Link from 'next/link'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function ApplyLanguagePicker({
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
          {!config.formOpen ? (
            <div className="text-center">
              <h1 className="text-3xl text-brand-dark mb-3">Applications Paused</h1>
              <p className="text-brand-gray">{config.closedMessage}</p>
              <Link href="/apply" className="inline-block mt-6 text-sm text-primary-500 hover:underline">
                ← Back / Retour
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl text-brand-dark mb-2 text-center" style={{ fontWeight: 700 }}>
                Rental Application
                <span className="block text-brand-gray text-base font-normal mt-1">
                  Demande de location
                </span>
              </h1>
              <p className="text-sm text-brand-gray text-center mb-8">
                Choose your language / Choisissez votre langue
              </p>

              <div className="grid grid-cols-1 gap-3">
                <Link
                  href={`/apply/en${autofillQuery}`}
                  className="group flex items-center gap-4 p-5 bg-white border border-brand-border hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center text-2xl transition-colors">
                    EN
                  </div>
                  <div className="flex-1">
                    <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                      Apply in English
                    </p>
                    <p className="text-xs text-brand-gray mt-0.5">
                      Continue the application in English
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-brand-border group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>

                <Link
                  href={`/apply/fr${autofillQuery}`}
                  className="group flex items-center gap-4 p-5 bg-white border border-brand-border hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center text-2xl transition-colors">
                    FR
                  </div>
                  <div className="flex-1">
                    <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                      Postuler en français
                    </p>
                    <p className="text-xs text-brand-gray mt-0.5">
                      Continuer la demande en français
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-brand-border group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <p className="text-center mt-6">
                <Link href="/apply" className="text-sm text-brand-gray hover:text-primary-500">
                  ← Back / Retour
                </Link>
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-brand-border bg-white py-6 text-center text-sm text-brand-gray">
        &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
      </footer>
    </div>
  )
}
