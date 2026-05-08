'use client'

interface Props {
  onBegin: () => void
}

const REQUIRED = [
  { icon: '🪪', label: 'Government-issued photo ID', detail: 'Driver\'s licence, passport, or provincial ID' },
  { icon: '💼', label: 'Proof of income / pay stub', detail: 'Most recent pay stub or bank statement (last 30 days)' },
  { icon: '🏠', label: 'Previous landlord contact info', detail: 'Phone number and/or email address' },
]

const OPTIONAL = [
  { icon: '📄', label: 'Employment letter', detail: 'Helpful if recently hired or self-employed' },
  { icon: '👥', label: 'Personal reference', detail: 'Non-family contact who can speak to your character' },
  { icon: '📝', label: 'Co-signer details', detail: 'Only if specifically requested by our team' },
]

export default function StepDocuments({ onBegin }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
          Before You Begin
        </h2>
        <p className="text-gray-500 text-sm">
          Having these ready will make the process much faster. The whole form takes about 10 minutes.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
        <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-4" style={{ fontWeight: 600 }}>
          Required
        </h3>
        <div className="space-y-3">
          {REQUIRED.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{item.label}</p>
                <p className="text-xs text-gray-400" style={{ fontWeight: 300 }}>{item.detail}</p>
              </div>
              <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-1 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-4" style={{ fontWeight: 600 }}>
          Nice to Have
        </h3>
        <div className="space-y-3">
          {OPTIONAL.map((item) => (
            <div key={item.label} className="flex items-start gap-3 opacity-70">
              <span className="text-xl mt-0.5 flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm text-gray-700" style={{ fontWeight: 500 }}>{item.label}</p>
                <p className="text-xs text-gray-400" style={{ fontWeight: 300 }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBegin}
          className="btn-primary inline-flex items-center gap-2 px-10 py-4 text-base"
        >
          Start Application
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <p className="text-xs text-gray-400 mt-3" style={{ fontWeight: 300 }}>
          Your progress is saved automatically as you go
        </p>
      </div>
    </div>
  )
}
