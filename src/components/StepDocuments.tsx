'use client'

interface Props {
  onBegin: () => void
}

const REQUIRED = [
  { icon: '\u{1FAAA}', label: 'Government-issued photo ID', detail: 'Driver\'s licence, passport, or provincial ID' },
  { icon: '\u{1F4BC}', label: 'Proof of income / pay stub', detail: 'Most recent pay stub or bank statement (last 30 days)' },
  { icon: '\u{1F3E0}', label: 'Previous landlord contact info', detail: 'Phone number and/or email address' },
]

const OPTIONAL = [
  { icon: '\u{1F4C4}', label: 'Employment letter', detail: 'Helpful if recently hired or self-employed' },
  { icon: '\u{1F465}', label: 'Personal reference', detail: 'Non-family contact who can speak to your character' },
  { icon: '\u{1F4DD}', label: 'Co-signer details', detail: 'Only if specifically requested by our team' },
]

export default function StepDocuments({ onBegin }: Props) {
  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-primary-50 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-3xl text-brand-dark mb-3">
          Before You Begin
        </h2>
        <p className="text-brand-gray text-sm max-w-md mx-auto">
          Having these ready will make the process much faster. The whole form takes about 10 minutes.
        </p>
      </div>

      <div className="bg-white border border-brand-border p-6 mb-4">
        <h3 className="text-sm uppercase tracking-widest text-primary-500 mb-5" style={{ fontWeight: 600 }}>
          Required Documents
        </h3>
        <div className="space-y-4">
          {REQUIRED.map((item) => (
            <div key={item.label} className="flex items-start gap-4 p-3 bg-brand-bg border border-brand-border">
              <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{item.label}</p>
                <p className="text-xs text-brand-gray mt-0.5">{item.detail}</p>
              </div>
              <div className="flex-shrink-0 w-5 h-5 bg-green-100 flex items-center justify-center mt-1">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-brand-border p-6 mb-10">
        <h3 className="text-sm uppercase tracking-widest text-brand-gray mb-5" style={{ fontWeight: 600 }}>
          Nice to Have
        </h3>
        <div className="space-y-4">
          {OPTIONAL.map((item) => (
            <div key={item.label} className="flex items-start gap-4 p-3 opacity-75">
              <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{item.label}</p>
                <p className="text-xs text-brand-gray mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
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
    </div>
  )
}
