import { getConfig } from '@/lib/config'
import ApplicationForm from '@/components/ApplicationForm'

export const dynamic = 'force-dynamic'

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ autofill?: string }>
}) {
  const config = await getConfig()
  const params = await searchParams
  const autofill = params.autofill === '1'

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header — matches main site */}
      <header className="bg-white border-b border-brand-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.logoUrl}
            alt={config.companyName}
            className="h-12 object-contain"
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {!config.formOpen ? (
          <div className="max-w-lg mx-auto text-center py-20">
            <div className="text-brand-gray mb-6">
              <svg className="w-20 h-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl text-brand-dark mb-3">
              Applications Paused
            </h1>
            <p className="text-brand-gray">{config.closedMessage}</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-10 animate-fade-up">
              <h1 className="text-4xl text-brand-dark mb-3">
                Rental Application
              </h1>
              <p className="text-brand-gray max-w-xl mx-auto">
                Complete all sections below. Your information will be securely submitted to our
                leasing team for review. All fields marked with{' '}
                <span className="text-secondary font-semibold">*</span> are required.
              </p>
            </div>

            <ApplicationForm config={config} autofill={autofill} />
          </>
        )}
      </main>

      <footer className="mt-16 border-t border-brand-border bg-white py-8 text-center text-sm text-brand-gray">
        &copy; {new Date().getFullYear()} {config.companyName}. All rights reserved.
      </footer>
    </div>
  )
}
