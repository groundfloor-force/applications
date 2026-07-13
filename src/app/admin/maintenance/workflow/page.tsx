'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  WorkflowDefinition,
  Question,
  Predicate,
  Condition,
  ConditionGroup,
  AnswerOption,
} from '@/lib/maintenance/types'

interface VersionRef {
  pathname: string
  uploadedAt: string
}

const OP_TEXT: Record<string, string> = { eq: '=', neq: '≠', in: 'in', nin: 'not in' }

function describePredicate(p: Predicate): string {
  const g = p as ConditionGroup
  if (g.all) return g.all.map(describePredicate).join(' AND ')
  if (g.any) return g.any.map(describePredicate).join(' OR ')
  const c = p as Condition
  if (c.op === 'answered') return `${c.questionId} answered`
  if (c.op === 'unanswered') return `${c.questionId} not answered`
  const v = Array.isArray(c.value) ? c.value.join(' / ') : c.value
  return `${c.questionId} ${OP_TEXT[c.op] ?? c.op} ${v}`
}

interface Branch {
  cond: string
  target: string
}

function branchesOf(q: Question, questions: Question[]): Branch[] {
  const out: Branch[] = []
  // Per-option direct routing.
  for (const o of q.options ?? []) {
    if (o.goto) out.push({ cond: `choose "${o.label}"`, target: o.goto })
  }
  if (q.next?.length) {
    for (const rule of q.next) {
      out.push({ cond: rule.when ? `if ${describePredicate(rule.when)}` : 'otherwise', target: rule.goto })
    }
  } else if (out.length === 0) {
    // Falls through to the next question in array order.
    const idx = questions.findIndex((x) => x.id === q.id)
    const nxt = questions[idx + 1]
    out.push({ cond: 'continue', target: nxt ? nxt.id : 'END' })
  }
  return out
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) onLogin()
    else { setError('Incorrect password.'); setPassword('') }
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 className="font-heading text-xl font-semibold text-gray-800 mb-4 text-center">Workflow Map</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" className="form-input mb-3" autoFocus />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

function OptionRow({ o }: { o: AnswerOption }) {
  return (
    <li className="text-sm text-gray-700">
      <span className="font-mono text-xs text-gray-400">{o.value}</span> — {o.label}
      {o.goto && (
        <a href={`#q-${o.goto}`} className="ml-2 text-primary-500 hover:underline">→ {o.goto}</a>
      )}
    </li>
  )
}

export default function WorkflowMapPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [wf, setWf] = useState<WorkflowDefinition | null>(null)
  const [versions, setVersions] = useState<VersionRef[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/maintenance/workflow')
    if (res.status === 401) { setAuthed(false); return }
    setAuthed(true)
    if (res.ok) {
      const data = await res.json()
      setWf(data.workflow)
      setVersions(data.versions ?? [])
    } else {
      setError((await res.json().catch(() => ({}))).error || 'Failed to load')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (authed === null) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>
  if (authed === false) return <LoginScreen onLogin={load} />

  const questions = wf?.questions ?? []
  let lastSection = ''

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-lg font-semibold text-gray-800">Maintenance Workflow</h1>
            {wf && <p className="text-xs text-gray-400">{wf.title} · v{wf.version} · {questions.length} questions · entry: {wf.entry}</p>}
          </div>
          <a href="/admin/maintenance" className="text-sm text-primary-500 hover:underline">← Requests</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && <p className="text-red-600 mb-4">{error}</p>}

        <p className="text-sm text-gray-500 mb-6">
          Read-only map of every question and where each answer leads. Editing is coming in the next update.
          {versions.length > 0 && <> Saved versions: {versions.length}.</>}
        </p>

        <div className="space-y-4">
          {questions.map((q) => {
            const showSection = q.section && q.section !== lastSection
            if (q.section) lastSection = q.section
            const branches = branchesOf(q, questions)
            return (
              <div key={q.id}>
                {showSection && (
                  <h2 className="text-xs uppercase tracking-wide text-gray-400 font-semibold mt-8 mb-2">{q.section}</h2>
                )}
                <div id={`q-${q.id}`} className="bg-white rounded-xl border border-gray-100 p-4 scroll-mt-20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-gray-800 font-medium">{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{q.id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-500">{q.inputType}</span>
                      {q.emergencyBanner && <span className="text-xs text-red-600 font-semibold">emergency</span>}
                      {q.media?.required && <span className="text-xs text-amber-600">photo required</span>}
                      {q.optional && <span className="text-xs text-gray-400">optional</span>}
                    </div>
                  </div>

                  {q.helpText && <p className="text-xs text-gray-500 mt-2 italic">{q.helpText}</p>}

                  {q.visibleIf && (
                    <p className="text-xs text-gray-500 mt-2">Shown only when: <span className="font-mono">{describePredicate(q.visibleIf)}</span></p>
                  )}

                  {(q.options?.length || q.dynamicOptions) && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-1">Options</p>
                      {q.dynamicOptions ? (
                        <p className="text-sm text-gray-600">
                          Depend on <span className="font-mono">{q.dynamicOptions.basedOn}</span> ({Object.keys(q.dynamicOptions.map).length} variants + default)
                        </p>
                      ) : (
                        <ul className="space-y-0.5">{q.options!.map((o) => <OptionRow key={o.value} o={o} />)}</ul>
                      )}
                    </div>
                  )}

                  {q.safetyMessages?.length ? (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 mb-1">Safety messages</p>
                      {q.safetyMessages.map((m, i) => (
                        <p key={i} className={`text-xs mt-1 ${m.level === 'danger' ? 'text-red-600' : 'text-amber-700'}`}>
                          {m.when ? `[if ${describePredicate(m.when)}] ` : ''}{m.text}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 mb-1">Goes to</p>
                    <ul className="space-y-0.5">
                      {branches.map((b, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          <span className="text-gray-500">{b.cond}</span>{' '}
                          {b.target === 'END' ? (
                            <span className="font-semibold text-gray-800">→ Submit</span>
                          ) : (
                            <a href={`#q-${b.target}`} className="text-primary-500 hover:underline">→ {b.target}</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
