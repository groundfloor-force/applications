'use client'

import { useEffect, useRef, useState } from 'react'
import { LocaleProvider, useT } from '@/lib/locale-context'
import { Locale } from '@/lib/i18n'
import { tpl } from '@/lib/i18n'

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

interface ConversationEntry {
  id: string
  body: string
  createdAt: string
  fromApplicant: boolean
  author: string
}

interface Props {
  locale: Locale
  token: string
  initialApp: AppData
  initialConversation: ConversationEntry[]
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
    InfoNeeded: 'We need a little more from you. Please check your email for next steps, or use the chat on this page to reach out.',
    Approved: 'Congratulations! Your application has been approved. Our team will be in touch shortly with next steps.',
    NotApproved: 'Thank you for your interest. Unfortunately your application was not approved for this unit. You are welcome to apply for other available units.',
    Cancelled: 'This application has been cancelled. If this is unexpected, please contact us so we can help.',
  },
  fr: {
    Received: 'Votre demande a été reçue et est dans notre file d’attente. Nous examinons généralement les demandes sous 1 à 2 jours ouvrables.',
    InProgress: 'Votre demande est en traitement par notre équipe. Nous pourrions communiquer avec vos références et votre propriétaire précédent pendant l’examen.',
    InfoNeeded: 'Nous avons besoin de renseignements supplémentaires. Veuillez vérifier votre courriel pour les prochaines étapes ou utiliser le clavardage sur cette page pour nous écrire.',
    Approved: 'Félicitations! Votre demande a été approuvée. Notre équipe communiquera avec vous sous peu pour les prochaines étapes.',
    NotApproved: 'Merci de votre intérêt. Malheureusement, votre demande n’a pas été approuvée pour cette unité. Vous pouvez postuler pour d’autres unités disponibles.',
    Cancelled: 'Cette demande a été annulée. Si vous croyez qu’il s’agit d’une erreur, veuillez communiquer avec nous.',
  },
}

function formatTime(iso: string, locale: Locale): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  } catch {
    return iso
  }
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

function MessagesPanel({
  token,
  locale,
  conversation,
  setConversation,
  refreshing,
}: {
  token: string
  locale: Locale
  conversation: ConversationEntry[]
  setConversation: React.Dispatch<React.SetStateAction<ConversationEntry[]>>
  refreshing: boolean
}) {
  const t = useT()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation.length])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = message.trim()
    if (!text || sending) return
    setError('')
    setSending(true)

    // Optimistic: show the applicant's message immediately
    const tempId = `pending-${Date.now()}`
    const optimistic: ConversationEntry = {
      id: tempId,
      body: text,
      createdAt: new Date().toISOString(),
      fromApplicant: true,
      author: 'You',
    }
    setConversation((prev) => [...prev, optimistic])
    setMessage('')

    try {
      const res = await fetch(`/api/status/${encodeURIComponent(token)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, locale }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || t.status.messagesSendError)

      // Merge: drop the optimistic entry, then take the server's authoritative
      // list. If the server is missing the just-sent message (Monday API lag),
      // keep the optimistic one so the user still sees what they sent.
      const serverConv: ConversationEntry[] = json.conversation ?? []
      setConversation((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== tempId)
        if (serverConv.length > withoutOptimistic.length) {
          return serverConv
        }
        return [...serverConv, { ...optimistic, id: `local-${Date.now()}` }]
      })
    } catch (err) {
      setConversation((prev) => prev.filter((m) => m.id !== tempId))
      setMessage(text)
      const msg = err instanceof Error ? err.message : t.status.messagesSendError
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white border border-brand-border flex flex-col h-full">
      <div className="px-5 py-4 border-b border-brand-border bg-brand-bg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className="text-sm text-brand-dark uppercase tracking-widest" style={{ fontWeight: 700 }}>
            {t.status.messagesTitle}
          </h2>
        </div>
        {refreshing && (
          <svg className="animate-spin w-3.5 h-3.5 text-brand-gray" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      <div className="px-5 py-3 text-xs text-brand-gray border-b border-brand-border">
        {t.status.messagesIntro}
      </div>

      {/* Conversation */}
      <div ref={scrollerRef} className="flex-1 px-5 py-4 space-y-3 overflow-y-auto" style={{ minHeight: 320, maxHeight: 540 }}>
        {conversation.length === 0 ? (
          <p className="text-sm text-brand-gray text-center py-12">{t.status.messagesEmpty}</p>
        ) : (
          conversation.map((entry) =>
            entry.fromApplicant ? (
              <div key={entry.id} className="flex justify-end">
                <div className="max-w-[85%]">
                  <div className="bg-primary-500 text-white px-4 py-2.5 text-sm leading-snug whitespace-pre-wrap">
                    {entry.body}
                  </div>
                  <p className="text-[10px] text-brand-gray text-right mt-1">
                    {t.status.messagesYou} · {formatTime(entry.createdAt, locale)}
                  </p>
                </div>
              </div>
            ) : (
              <div key={entry.id} className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="bg-brand-bg text-brand-dark px-4 py-2.5 text-sm leading-snug whitespace-pre-wrap border border-brand-border">
                    {entry.body}
                  </div>
                  <p className="text-[10px] text-brand-gray mt-1">
                    {entry.author || t.status.messagesStaff} · {formatTime(entry.createdAt, locale)}
                  </p>
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Send form */}
      <form onSubmit={handleSend} className="border-t border-brand-border p-3 bg-brand-bg">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={t.status.messagesPlaceholder}
          className="form-input text-sm w-full resize-none mb-2"
          style={{ height: 'auto', minHeight: 72 }}
        />
        {error && <p className="text-xs text-secondary mb-2">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-brand-gray">
            {tpl(t.status.messagesCharCount, { n: message.length })}
          </span>
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="btn-primary text-sm py-2 px-5"
            style={{ height: 'auto', minWidth: 'auto' }}
          >
            {sending ? t.status.messagesSending : t.status.messagesSend}
          </button>
        </div>
      </form>
    </div>
  )
}

function StatusInner({ locale, token, initialApp, initialConversation }: Props) {
  const t = useT()
  const [app, setApp] = useState<AppData>(initialApp)
  const [conversation, setConversation] = useState<ConversationEntry[]>(initialConversation)
  const [lastChecked, setLastChecked] = useState<number>(Date.now())
  const [showCosignerForm, setShowCosignerForm] = useState(false)
  const [cosignerSubmitted, setCosignerSubmitted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = async () => {
    setRefreshing(true)
    try {
      const [statusRes, msgsRes] = await Promise.all([
        fetch(`/api/status/${encodeURIComponent(token)}`, { cache: 'no-store' }),
        fetch(`/api/status/${encodeURIComponent(token)}/messages`, { cache: 'no-store' }),
      ])
      if (statusRes.ok) {
        const data = await statusRes.json()
        setApp(data)
      }
      if (msgsRes.ok) {
        const data = await msgsRes.json()
        setConversation(data.conversation ?? [])
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">
      {/* LEFT — status hero + details + cosigner */}
      <div className="space-y-6 min-w-0">
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

      {/* RIGHT — messages thread */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <MessagesPanel
          token={token}
          locale={locale}
          conversation={conversation}
          setConversation={setConversation}
          refreshing={refreshing}
        />
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
