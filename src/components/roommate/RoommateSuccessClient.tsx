'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LocaleProvider, useT } from '@/lib/locale-context'
import { Locale } from '@/lib/i18n'
import { ROOMMATE_SUCCESS_KEY, type RoommateChangeSummary } from '@/lib/roommate-change'

function Recap({ summary }: { summary: RoommateChangeSummary }) {
  const t = useT()

  const Section = ({
    title,
    people,
    empty,
  }: {
    title: string
    people: { name: string; email: string; phone: string }[]
    empty?: boolean
  }) => (
    <div className="px-4 sm:px-6 py-4">
      <h3 className="text-xs uppercase tracking-widest text-brand-gray mb-2" style={{ fontWeight: 700 }}>
        {title}
      </h3>
      {empty || people.length === 0 ? (
        <p className="text-sm text-brand-gray">{t.rm.confirmNone}</p>
      ) : (
        <ul className="space-y-1 text-sm text-brand-dark">
          {people.map((p, i) => (
            <li key={i}>
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span className="text-brand-gray"> · {p.email} · {p.phone}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="bg-white border border-brand-border divide-y divide-brand-border">
      <div className="px-4 sm:px-6 py-4">
        <h3 className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 700 }}>
          {t.rm.reviewProperty}
        </h3>
        <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{summary.unitName}</p>
      </div>
      {summary.effectiveDate && (
        <div className="px-4 sm:px-6 py-4">
          <h3 className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 700 }}>
            {t.rm.reviewEffectiveDate}
          </h3>
          <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{summary.effectiveDate}</p>
        </div>
      )}
      <Section title={t.rm.confirmStaying} people={summary.staying} />
      <Section title={t.rm.confirmLeaving} people={summary.leaving} />
      <Section title={t.rm.confirmIncoming} people={summary.incoming} empty={summary.incoming.length === 0} />
    </div>
  )
}

function SuccessBody({
  companyName,
  logoUrl,
}: {
  companyName: string
  logoUrl: string
}) {
  const t = useT()
  const [summary, setSummary] = useState<RoommateChangeSummary | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ROOMMATE_SUCCESS_KEY)
      if (raw) setSummary(JSON.parse(raw) as RoommateChangeSummary)
    } catch {
      // ignore
    }
  }, [])

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <header className="bg-white border-b border-brand-border">
        <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={companyName} className="h-9 sm:h-12 object-contain" />
          <Link href="/apply" className="text-xs sm:text-sm text-primary-500 hover:underline flex-shrink-0">
            {t.rm.successReturn} →
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-start gap-3 sm:gap-5 mb-8">
          <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 sm:w-9 sm:h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 600 }}>
              {t.rm.title}
            </p>
            <h1 className="text-2xl sm:text-3xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
              {t.rm.successTitle}
            </h1>
            <p className="text-sm text-brand-gray">{t.rm.successThankYou}</p>
          </div>
        </div>

        {summary && (
          <div className="mb-6">
            <Recap summary={summary} />
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 px-4 sm:px-6 py-5 mb-6">
          <p className="text-sm text-amber-900">
            {t.rm.successFeeReminder}{' '}
            <a href={`mailto:${t.rm.feeEmail}`} className="font-semibold hover:underline">
              {t.rm.feeEmail}
            </a>
          </p>
        </div>

        <div className="bg-primary-50 border border-primary-200 px-4 sm:px-6 py-5">
          <h2 className="text-xs uppercase tracking-widest text-primary-700 mb-3" style={{ fontWeight: 700 }}>
            {t.rm.reviewNext}
          </h2>
          <ol className="space-y-2 text-sm text-primary-800">
            {[t.rm.reviewNext1, t.rm.reviewNext2, t.rm.reviewNext3].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px]" style={{ fontWeight: 700 }}>
                  {i + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>

      <footer className="border-t border-brand-border bg-white py-6 text-center text-sm text-brand-gray">
        &copy; {new Date().getFullYear()} {companyName}.
      </footer>
    </div>
  )
}

export default function RoommateSuccessClient({
  locale,
  companyName,
  logoUrl,
}: {
  locale: Locale
  companyName: string
  logoUrl: string
}) {
  return (
    <LocaleProvider locale={locale}>
      <SuccessBody companyName={companyName} logoUrl={logoUrl} />
    </LocaleProvider>
  )
}
