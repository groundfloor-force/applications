import Link from 'next/link'
import { getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function RoommateLanguagePicker() {
  const config = await getConfig()

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
            Roommate Change
            <span className="block text-brand-gray text-base font-normal mt-1">
              Changement de colocataire
            </span>
          </h1>
          <p className="text-sm text-brand-gray text-center mb-8">
            Choose your language / Choisissez votre langue
          </p>

          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/apply/roommate/en"
              className="group flex items-center gap-4 p-5 bg-white border border-brand-border hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center text-2xl transition-colors">
                EN
              </div>
              <div className="flex-1">
                <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                  Continue in English
                </p>
                <p className="text-xs text-brand-gray mt-0.5">
                  Request a roommate change in English
                </p>
              </div>
              <svg className="w-5 h-5 text-brand-border group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/apply/roommate/fr"
              className="group flex items-center gap-4 p-5 bg-white border border-brand-border hover:border-primary-500 hover:bg-primary-50 transition-all"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center text-2xl transition-colors">
                FR
              </div>
              <div className="flex-1">
                <p className="text-brand-dark" style={{ fontWeight: 600 }}>
                  Continuer en français
                </p>
                <p className="text-xs text-brand-gray mt-0.5">
                  Demander un changement de colocataire en français
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
        </div>
      </main>

      <footer className="border-t border-brand-border bg-white py-6 text-center text-sm text-brand-gray">
        &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
      </footer>
    </div>
  )
}
