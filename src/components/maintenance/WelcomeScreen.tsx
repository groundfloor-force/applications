'use client'

const CHECKLIST: { title: string; detail: string }[] = [
  { title: 'The property address', detail: 'Including your unit number, if you have one.' },
  { title: 'A description of the issue', detail: 'What’s happening, where it is, and how long it’s been going on.' },
  { title: 'A photo, if it’s safe to take one', detail: 'Pictures help us send the right person with the right parts.' },
  { title: 'Access details', detail: 'Whether we can enter when you’re out, plus any pets, parking, or lockbox info.' },
]

export default function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl text-brand-dark mb-3" style={{ fontWeight: 700 }}>
        Report a maintenance issue
      </h1>
      <p className="text-brand-gray mb-2">
        Hi there — welcome to the Ground Floor maintenance request page. We’ll walk you through a few short
        questions, one at a time, so we can get the right help to your home as quickly as possible.
      </p>
      <p className="text-brand-gray mb-8">It only takes a couple of minutes.</p>

      <div className="border border-brand-border rounded-lg p-5 mb-8">
        <p className="text-sm text-brand-dark mb-4" style={{ fontWeight: 600 }}>
          Before you start, it helps to have:
        </p>
        <ul className="space-y-4">
          {CHECKLIST.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-brand-dark text-sm" style={{ fontWeight: 600 }}>{item.title}</p>
                <p className="text-brand-gray text-sm">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-l-4 border-secondary bg-red-50 px-4 py-3 mb-8">
        <p className="text-sm text-brand-dark">
          <span className="text-secondary" style={{ fontWeight: 700 }}>If anyone is in danger, call 911 first.</span>{' '}
          For an active flood or another urgent emergency, submit this request right away and we’ll be alerted immediately.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="btn-primary px-8 py-4 w-full flex items-center justify-center gap-2"
      >
        Start my request
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
