'use client'

interface Props {
  onBegin: () => void
}

function IconId({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-2.813 5.86a3.268 3.268 0 00-1.187.39V19.5h7.5v-3.375a3.268 3.268 0 00-1.187-.39" />
    </svg>
  )
}

function IconIncome({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  )
}

function IconLandlord({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function IconLetter({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function IconReference({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function IconCosigner({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

const REQUIRED = [
  { Icon: IconId, label: 'Government-issued photo ID', detail: 'Driver\'s licence, passport, or provincial ID' },
  { Icon: IconIncome, label: 'Proof of income / pay stub', detail: 'Most recent pay stub or bank statement (last 30 days)' },
  { Icon: IconLandlord, label: 'Previous landlord contact info', detail: 'Phone number and/or email address' },
]

const OPTIONAL = [
  { Icon: IconLetter, label: 'Employment letter', detail: 'Helpful if recently hired or self-employed' },
  { Icon: IconReference, label: 'Personal reference', detail: 'Non-family contact who can speak to your character' },
  { Icon: IconCosigner, label: 'Co-signer details', detail: 'Only if specifically requested by our team' },
]

export default function StepDocuments({ onBegin }: Props) {
  return (
    <div className="animate-fade-up">
      {/* Desktop: side-by-side layout. Mobile: stacked */}
      <div className="lg:flex lg:gap-12 lg:items-start">

        {/* Left column — intro */}
        <div className="lg:w-2/5 lg:sticky lg:top-28 mb-10 lg:mb-0">
          <div className="w-12 h-12 bg-primary-500 flex items-center justify-center mb-5">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl text-brand-dark mb-3">
            Before You Begin
          </h2>
          <p className="text-brand-gray text-sm mb-6">
            Having these documents ready will make the process much faster. The whole form takes about 10 minutes.
          </p>
          <button
            type="button"
            onClick={onBegin}
            className="btn-primary gap-3 px-10 text-base"
          >
            Start Application
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <p className="text-xs text-brand-gray mt-4">
            Your progress is saved automatically as you go
          </p>
        </div>

        {/* Right column — document lists */}
        <div className="lg:w-3/5">
          <div className="bg-white border border-brand-border p-6 mb-4">
            <h3 className="text-sm uppercase tracking-widest text-primary-500 mb-5" style={{ fontWeight: 600 }}>
              Required Documents
            </h3>
            <div className="space-y-4">
              {REQUIRED.map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-3 bg-brand-bg border border-brand-border">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary-50 flex items-center justify-center mt-0.5">
                    <item.Icon className="w-5 h-5 text-primary-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{item.label}</p>
                    <p className="text-xs text-brand-gray mt-0.5">{item.detail}</p>
                  </div>
                  <div className="flex-shrink-0 w-5 h-5 bg-green-100 flex items-center justify-center mt-2">
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-brand-border p-6">
            <h3 className="text-sm uppercase tracking-widest text-brand-gray mb-5" style={{ fontWeight: 600 }}>
              Nice to Have
            </h3>
            <div className="space-y-4">
              {OPTIONAL.map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-3 opacity-70">
                  <div className="flex-shrink-0 w-9 h-9 bg-brand-bg flex items-center justify-center mt-0.5">
                    <item.Icon className="w-5 h-5 text-brand-gray" />
                  </div>
                  <div>
                    <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{item.label}</p>
                    <p className="text-xs text-brand-gray mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
