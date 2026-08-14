'use client'

import SignaturePad from '@/components/SignaturePad'
import { useT } from '@/lib/locale-context'
import { incomingPeople, leaving, personName, staying } from '@/lib/roommate-change'
import type { RoommateChangeData, RoommatePerson } from '@/lib/types'

function Line({ people }: { people: RoommatePerson[] }) {
  if (people.length === 0) return <span className="text-brand-gray">—</span>
  return (
    <ul className="space-y-1">
      {people.map((p, i) => (
        <li key={i}>
          <span style={{ fontWeight: 600 }}>{personName(p)}</span>
          <span className="text-brand-gray"> · {p.email} · {p.phone}</span>
        </li>
      ))}
    </ul>
  )
}

export default function RmStepReview({
  data,
  submitting,
  errors,
  onJump,
  onChange,
  onSubmit,
}: {
  data: RoommateChangeData
  submitting: boolean
  errors: Record<string, string>
  onJump: (step: number) => void
  onChange: (u: Partial<RoommateChangeData>) => void
  onSubmit: () => void
}) {
  const t = useT()
  const signer = staying(data)[0]
  const signedAs = signer ? personName(signer) : ''

  return (
    <div>
      <h2 className="text-2xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
        {t.rm.step7Title}
      </h2>
      <p className="text-sm text-brand-gray mb-6">{t.rm.step7Subtitle}</p>

      {errors.submit && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-secondary text-sm">
          {errors.submit}
        </div>
      )}

      <div className="bg-white border border-brand-border divide-y divide-brand-border mb-6">
        <div className="px-4 sm:px-5 py-4 flex justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 700 }}>
              {t.rm.reviewProperty}
            </p>
            <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{data.unitName}</p>
          </div>
          <button type="button" onClick={() => onJump(1)} className="text-xs text-primary-500 hover:underline flex-shrink-0">
            {t.rm.editSection}
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4 flex justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 700 }}>
              {t.rm.reviewEffectiveDate}
            </p>
            <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{data.effectiveDate || '—'}</p>
          </div>
          <button type="button" onClick={() => onJump(3)} className="text-xs text-primary-500 hover:underline flex-shrink-0">
            {t.rm.editSection}
          </button>
        </div>
        <div className="px-4 sm:px-5 py-4">
          <div className="flex justify-between gap-3 mb-2">
            <p className="text-xs uppercase tracking-widest text-green-700" style={{ fontWeight: 700 }}>
              {t.rm.confirmStaying}
            </p>
            <button type="button" onClick={() => onJump(3)} className="text-xs text-primary-500 hover:underline">
              {t.rm.editSection}
            </button>
          </div>
          <div className="text-sm text-brand-dark"><Line people={staying(data)} /></div>
        </div>
        <div className="px-4 sm:px-5 py-4">
          <div className="flex justify-between gap-3 mb-2">
            <p className="text-xs uppercase tracking-widest text-red-700" style={{ fontWeight: 700 }}>
              {t.rm.confirmLeaving}
            </p>
            <button type="button" onClick={() => onJump(3)} className="text-xs text-primary-500 hover:underline">
              {t.rm.editSection}
            </button>
          </div>
          <div className="text-sm text-brand-dark"><Line people={leaving(data)} /></div>
        </div>
        <div className="px-4 sm:px-5 py-4">
          <div className="flex justify-between gap-3 mb-2">
            <p className="text-xs uppercase tracking-widest text-primary-700" style={{ fontWeight: 700 }}>
              {t.rm.confirmIncoming}
            </p>
            <button type="button" onClick={() => onJump(4)} className="text-xs text-primary-500 hover:underline">
              {t.rm.editSection}
            </button>
          </div>
          <div className="text-sm text-brand-dark">
            {incomingPeople(data).length === 0
              ? <span className="text-brand-gray">{t.rm.confirmNone}</span>
              : <Line people={incomingPeople(data)} />}
          </div>
        </div>
        <div className="px-4 sm:px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 700 }}>
            {t.rm.reviewFee}
          </p>
          <p className="text-sm text-brand-dark">{t.rm.reviewFeeLine}</p>
        </div>
      </div>

      <div className="bg-primary-50 border border-primary-200 px-4 sm:px-5 py-4 mb-8">
        <h3 className="text-xs uppercase tracking-widest text-primary-700 mb-3" style={{ fontWeight: 700 }}>
          {t.rm.reviewNext}
        </h3>
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

      <div className="form-section mb-8">
        <h3 className="section-title">{t.rm.signatureTitle}</h3>
        <p className="text-sm text-brand-gray mb-3">{t.rm.signatureIntro}</p>
        <SignaturePad
          value={data.signatureData}
          onChange={(dataUrl) => onChange({
            signatureData: dataUrl,
            signedAt: dataUrl ? new Date().toISOString() : '',
          })}
          clearLabel={t.rm.signatureClear}
        />
        {signedAs && (
          <p className="text-xs text-brand-gray mt-2">
            {t.rm.signatureSignedAs}: <span className="text-brand-dark" style={{ fontWeight: 600 }}>{signedAs}</span>
          </p>
        )}
        {errors.signatureData && (
          <p className="text-xs text-secondary mt-2">{errors.signatureData}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !data.signatureData}
        className="btn-primary w-full sm:w-auto"
      >
        {submitting ? t.rm.submitting : t.rm.submit}
      </button>
    </div>
  )
}
