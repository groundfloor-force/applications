'use client'

import { useEffect, useRef, useState } from 'react'
import { LocaleProvider, useT } from '@/lib/locale-context'
import { Locale, getDictionary } from '@/lib/i18n'

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

type StatusStyle = { bg: string; text: string; dot: string }

const STATUS_STYLES: Record<string, StatusStyle> = {
  New:            { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-400'   },
  'Under Review': { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400'  },
  Reviewing:      { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400'  },
  Pending:        { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400'  },
  'On Hold':      { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  Approved:       { bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500'  },
  Declined:       { bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500'    },
  Rejected:       { bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-500'    },
}

const NEUTRAL_STYLE: StatusStyle = { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' }

// Localized display label for known statuses. Unknown statuses use the raw
// Monday label verbatim, so PMs control exactly what applicants see.
const STATUS_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    New: 'Received',
    'Under Review': 'Under Review',
    Reviewing: 'Under Review',
    Approved: 'Approved',
    Declined: 'Not Selected',
    Rejected: 'Not Selected',
  },
  fr: {
    New: 'Reçue',
    'Under Review': 'En cours d’examen',
    Reviewing: 'En cours d’examen',
    Approved: 'Approuvée',
    Declined: 'Non retenue',
    Rejected: 'Non retenue',
    Pending: 'En attente',
    'On Hold': 'En suspens',
  },
}

const STATUS_MESSAGES: Record<Locale, Record<string, string>> = {
  en: {
    New: 'Your application has been received and is in our queue. We typically review applications within 1–2 business days.',
    'Under Review': 'Your application is currently being reviewed by our team. We may be contacting your references and previous landlord.',
    Reviewing: 'Your application is currently being reviewed by our team. We may be contacting your references and previous landlord.',
    Approved: 'Congratulations! Your application has been approved. Our team will be reaching out to you shortly with next steps.',
    Declined: 'Thank you for your interest. Unfortunately your application was not selected for this unit. We encourage you to apply again for other available units.',
    Rejected: 'Thank you for your interest. Unfortunately your application was not selected for this unit. We encourage you to apply again for other available units.',
  },
  fr: {
    New: 'Votre demande a été reçue et est dans notre file d’attente. Nous examinons généralement les demandes sous 1 à 2 jours ouvrables.',
    'Under Review': 'Votre demande est actuellement à l’étude par notre équipe. Nous pourrions communiquer avec vos références et votre propriétaire précédent.',
    Reviewing: 'Votre demande est actuellement à l’étude par notre équipe. Nous pourrions communiquer avec vos références et votre propriétaire précédent.',
    Approved: 'Félicitations! Votre demande a été approuvée. Notre équipe communiquera avec vous sous peu pour vous indiquer les prochaines étapes.',
    Declined: 'Merci de votre intérêt. Malheureusement, votre demande n’a pas été retenue pour cette unité. Nous vous encourageons à postuler pour d’autres unités disponibles.',
    Rejected: 'Merci de votre intérêt. Malheureusement, votre demande n’a pas été retenue pour cette unité. Nous vous encourageons à postuler pour d’autres unités disponibles.',
  },
}

const GENERIC_MESSAGE: Record<Locale, string> = {
  en: 'The current status of your application is shown above. We will reach out if anything more is needed from you.',
  fr: 'L’état actuel de votre demande est indiqué ci-dessus. Nous communiquerons avec vous si nous avons besoin d’information supplémentaire.',
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
          <label className="form-label">{t.status.cosignerEmail}</label>
          <input type="email" className="form-input" value={email}
            onChange={(e) => setEmail(e.target.value)} />
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
      const res = await fetch(`/api/status/${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        setApp(data)
        setLastChecked(Date.now())
      }
    } catch {
      // Silent — keep previous value
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    pollRef.current = setInterval(fetchStatus, 30_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Fall back to the raw Monday status text when we don't have a translation
  // — PMs can use any label they like and applicants will see it verbatim.
  const rawStatus = app.status?.trim() || 'New'
  const style = STATUS_STYLES[rawStatus] ?? NEUTRAL_STYLE
  const statusLabel = STATUS_LABELS[locale][rawStatus] ?? rawStatus
  const statusMessage = STATUS_MESSAGES[locale][rawStatus] ?? GENERIC_MESSAGE[locale]

  const lastCheckedAgo = (() => {
    const seconds = Math.floor((Date.now() - lastChecked) / 1000)
    if (seconds < 10) return t.status.justNow
    if (seconds < 60) return `${seconds}s ago`
    const m = Math.floor(seconds / 60)
    return `${m}m ago`
  })()

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl text-brand-dark mb-1" style={{ fontWeight: 700 }}>{t.status.title}</h1>
        <p className="text-sm text-brand-gray">{app.name}</p>
      </div>

      <div className={`p-6 mb-6 text-center ${style.bg}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${style.dot} animate-pulse`} />
          <span className={`text-xl ${style.text}`} style={{ fontWeight: 700 }}>{statusLabel}</span>
        </div>
        <p className={`text-sm ${style.text} opacity-80`}>{statusMessage}</p>
      </div>

      <div className="bg-white border border-brand-border p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-brand-gray" style={{ fontWeight: 600 }}>
            {t.status.title}
          </h2>
          <button
            type="button"
            onClick={fetchStatus}
            disabled={refreshing}
            className="text-xs text-primary-500 hover:underline disabled:opacity-50 flex items-center gap-1"
          >
            <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t.status.refresh}
          </button>
        </div>
        <div className="space-y-2 text-sm">
          {app.address && (
            <div className="flex justify-between">
              <span className="text-brand-gray">{t.status.propertyAddress}</span>
              <span className="text-brand-dark" style={{ fontWeight: 600 }}>
                {app.address}{app.unit ? ` ${app.unit}` : ''}
              </span>
            </div>
          )}
          {app.moveInDate && (
            <div className="flex justify-between">
              <span className="text-brand-gray">{t.status.moveInDate}</span>
              <span className="text-brand-dark" style={{ fontWeight: 600 }}>{app.moveInDate}</span>
            </div>
          )}
          {app.submittedDate && (
            <div className="flex justify-between">
              <span className="text-brand-gray">{t.status.submittedDate}</span>
              <span className="text-brand-dark">{app.submittedDate}</span>
            </div>
          )}
        </div>
        <p className="mt-4 pt-3 border-t border-brand-border text-xs text-brand-gray text-center">
          {t.status.autoUpdating} · {t.status.lastChecked}: {lastCheckedAgo}
        </p>
      </div>

      {/* Co-signer section */}
      <div className="bg-white border border-brand-border p-5">
        <h2 className="text-sm uppercase tracking-widest text-brand-gray mb-2" style={{ fontWeight: 600 }}>
          {t.status.cosignerSectionTitle}
        </h2>
        <p className="text-xs text-brand-gray mb-3">{t.status.cosignerExplain}</p>

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

// Re-export dictionary getter to keep server page compact
export { getDictionary as getStatusDictionary }
