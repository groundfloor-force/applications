'use client'

import { useEffect, useRef, useState } from 'react'
import { LocaleProvider, useT } from '@/lib/locale-context'
import { Locale } from '@/lib/i18n'

interface AppData {
  id: string
  name: string
  url: string
  status: string
  address: string
  unit: string
  moveInDate: string
  submittedDate: string
  mondayUrl: string
}

interface Props {
  locale: Locale
  token: string
  initialApp: AppData
}

// Applicant-facing status buckets. Internal Monday statuses (Roommate
// Exchange, Re-Rent App, Hold, etc.) are collapsed into a small, friendly
// set so applicants don't see PM-internal workflow stages.
type Bucket = 'Received' | 'InProgress' | 'InfoNeeded' | 'Approved' | 'NotApproved' | 'Cancelled'

const STATUS_TO_BUCKET: Record<string, Bucket> = {
  // Received
  'New': 'Received',
  // Approved family (lease sent/signed = effectively approved from applicant POV)
  'Approved': 'Approved',
  'Sent': 'Approved',
  'Signed': 'Approved',
  '*Complete*': 'Approved',
  '*Unit Rented*': 'Approved',
  'RM Change - Signed': 'Approved',
  // Not approved
  '*Rejected*': 'NotApproved',
  // Cancelled
  '*Canceled*': 'Cancelled',
  '*Stuck - Cancelled*': 'Cancelled',
  'Applicant Cancelled': 'Cancelled',
  // Info needed
  'Hold': 'InfoNeeded',
  // Everything else (In Progress, *Stuck*, Roommate changes, Re-Rent, etc.) → In Progress
}

function bucketFor(rawStatus: string): Bucket {
  return STATUS_TO_BUCKET[rawStatus.trim()] ?? 'InProgress'
}

type StatusStyle = { bg: string; text: string; dot: string }

const BUCKET_STYLES: Record<Bucket, StatusStyle> = {
  Received:    { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400'   },
  InProgress:  { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  InfoNeeded:  { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  Approved:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  NotApproved: { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  Cancelled:   { bg: 'bg-gray-50',   text: 'text-gray-700',   dot: 'bg-gray-400'   },
}

const BUCKET_LABELS: Record<Locale, Record<Bucket, string>> = {
  en: {
    Received: 'Received',
    InProgress: 'In Progress',
    InfoNeeded: 'In Progress — Information Needed',
    Approved: 'Approved',
    NotApproved: 'Not Approved',
    Cancelled: 'Cancelled',
  },
  fr: {
    Received: 'Reçue',
    InProgress: 'En traitement',
    InfoNeeded: 'En traitement — renseignements requis',
    Approved: 'Approuvée',
    NotApproved: 'Non approuvée',
    Cancelled: 'Annulée',
  },
}

const BUCKET_MESSAGES: Record<Locale, Record<Bucket, string>> = {
  en: {
    Received: 'Your application has been received and is in our queue. We typically review applications within 1–2 business days.',
    InProgress: 'Your application is being processed by our team. We may contact your references and previous landlord while we review.',
    InfoNeeded: 'We need a little more from you. Please check your email for next steps.',
    Approved: 'Congratulations! Your application has been approved. Our team will be in touch shortly with next steps.',
    NotApproved: 'Thank you for your interest. Unfortunately your application was not approved for this unit. You are welcome to apply for other available units.',
    Cancelled: 'This application has been cancelled. If this is unexpected, please contact us so we can help.',
  },
  fr: {
    Received: 'Votre demande a été reçue et est dans notre file d’attente. Nous examinons généralement les demandes sous 1 à 2 jours ouvrables.',
    InProgress: 'Votre demande est en traitement par notre équipe. Nous pourrions communiquer avec vos références et votre propriétaire précédent pendant l’examen.',
    InfoNeeded: 'Nous avons besoin de renseignements supplémentaires. Veuillez vérifier votre courriel pour les prochaines étapes.',
    Approved: 'Félicitations! Votre demande a été approuvée. Notre équipe communiquera avec vous sous peu pour les prochaines étapes.',
    NotApproved: 'Merci de votre intérêt. Malheureusement, votre demande n’a pas été approuvée pour cette unité. Vous pouvez postuler pour d’autres unités disponibles.',
    Cancelled: 'Cette demande a été annulée. Si vous croyez qu’il s’agit d’une erreur, veuillez communiquer avec nous.',
  },
}

function CosignerForm({
  token,
  onSubmitted,
}: {
  token: string
  onSubmitted: () => void
}) {
  const t = useT()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim() || !lastName.trim()) {
      setError(t.status.cosignerNameFirst + ' / ' + t.status.cosignerNameLast)
      return
    }
    if (!email.trim()) {
      setError(t.validation.cosignerEmailRequired)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.validation.cosignerEmailInvalid)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/cosigner/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, relationship, email, phone }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submission failed')
      onSubmitted()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 animate-fade-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="form-label">
            {t.status.cosignerNameFirst} <span className="required">*</span>
          </label>
          <input className="form-input" value={firstName}
            onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">
            {t.status.cosignerNameLast} <span className="required">*</span>
          </label>
          <input className="form-input" value={lastName}
            onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">{t.status.cosignerRelationship}</label>
          <input className="form-input" value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder={t.status.cosignerRelationshipPlaceholder} />
        </div>
        <div>
          <label className="form-label">{t.status.cosignerPhone}</label>
          <input type="tel" className="form-input" value={phone}
            onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">
            {t.status.cosignerEmail} <span className="required">*</span>
          </label>
          <input type="email" className="form-input" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
      </div>

      {error && <p className="text-sm text-secondary">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? t.status.cosignerSaving : t.status.cosignerSave}
        </button>
      </div>
    </form>
  )
}

function StatusInner({ locale, token, initialApp }: Props) {
  const t = useT()
  const [app, setApp] = useState<AppData>(initialApp)
  const [lastChecked, setLastChecked] = useState<number>(Date.now())
  const [showCosignerForm, setShowCosignerForm] = useState(false)
  const [cosignerSubmitted, setCosignerSubmitted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/status/${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setApp(data)
      }
      setLastChecked(Date.now())
    } catch {
      // Silent — keep previous values
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    pollRef.current = setInterval(fetchStatus, 300_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const rawStatus = app.status?.trim() || 'New'
  const bucket = bucketFor(rawStatus)
  const style = BUCKET_STYLES[bucket]
  const statusLabel = BUCKET_LABELS[locale][bucket]
  const statusMessage = BUCKET_MESSAGES[locale][bucket]

  const lastCheckedAgo = (() => {
    const seconds = Math.floor((Date.now() - lastChecked) / 1000)
    if (seconds < 10) return t.status.justNow
    if (seconds < 60) return `${seconds}s ago`
    const m = Math.floor(seconds / 60)
    return `${m}m ago`
  })()

  return (
    <>
      {/* Applicant header — sits above the 2-column grid so both columns
          start aligned at the status card / messages panel. */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 600 }}>
          {t.status.title}
        </p>
        <h1 className="text-3xl text-brand-dark" style={{ fontWeight: 700 }}>{app.name}</h1>
      </div>

      <div className="space-y-6 min-w-0 max-w-3xl">
        {/* Status hero card */}
        <div className={`border border-brand-border p-8 ${style.bg}`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${style.dot} animate-pulse flex-shrink-0`} />
              <span className={`text-2xl ${style.text}`} style={{ fontWeight: 700 }}>{statusLabel}</span>
            </div>
            <button
              type="button"
              onClick={fetchStatus}
              disabled={refreshing}
              className="text-xs text-brand-gray hover:text-primary-500 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
            >
              <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t.status.refresh}
            </button>
          </div>
          <p className={`text-sm ${style.text} opacity-80 leading-relaxed`}>{statusMessage}</p>
          <p className="mt-5 pt-4 border-t border-current/10 text-[11px] text-brand-gray">
            {t.status.autoUpdating} · {t.status.lastChecked}: {lastCheckedAgo}
          </p>
        </div>

        {/* Details grid */}
        <div className="bg-white border border-brand-border">
          <div className="px-5 py-3 border-b border-brand-border bg-brand-bg">
            <h2 className="text-sm uppercase tracking-widest text-brand-gray" style={{ fontWeight: 700 }}>
              {t.step8.summary}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-brand-border">
            {app.address && (
              <div className="px-5 py-4">
                <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 600 }}>
                  {t.status.propertyAddress}
                </p>
                <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>
                  {app.address}{app.unit ? ` ${app.unit}` : ''}
                </p>
              </div>
            )}
            {app.moveInDate && (
              <div className="px-5 py-4">
                <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 600 }}>
                  {t.status.moveInDate}
                </p>
                <p className="text-sm text-brand-dark" style={{ fontWeight: 600 }}>{app.moveInDate}</p>
              </div>
            )}
            {app.submittedDate && (
              <div className="px-5 py-4">
                <p className="text-[11px] uppercase tracking-widest text-brand-gray mb-1" style={{ fontWeight: 600 }}>
                  {t.status.submittedDate}
                </p>
                <p className="text-sm text-brand-dark">{app.submittedDate}</p>
              </div>
            )}
          </div>
        </div>

        {/* Co-signer */}
        <div className="bg-white border border-brand-border p-5">
          <h2 className="text-sm uppercase tracking-widest text-brand-gray mb-2" style={{ fontWeight: 700 }}>
            {t.status.cosignerSectionTitle}
          </h2>
          <p className="text-xs text-brand-gray mb-4">{t.status.cosignerExplain}</p>

          {cosignerSubmitted ? (
            <div className="bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t.status.cosignerSubmitted}
            </div>
          ) : !showCosignerForm ? (
            <button
              type="button"
              onClick={() => setShowCosignerForm(true)}
              className="btn-secondary text-sm"
              style={{ minWidth: 'auto', height: 'auto', padding: '8px 20px' }}
            >
              {t.status.cosignerAdd}
            </button>
          ) : (
            <>
              <CosignerForm
                token={token}
                onSubmitted={() => {
                  setCosignerSubmitted(true)
                  setShowCosignerForm(false)
                }}
              />
              <button
                type="button"
                onClick={() => setShowCosignerForm(false)}
                className="mt-2 text-xs text-brand-gray hover:underline"
              >
                {t.status.cosignerCancel}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function StatusContent(props: Props) {
  return (
    <LocaleProvider locale={props.locale}>
      <StatusInner {...props} />
    </LocaleProvider>
  )
}
