'use client'

import { useCallback, useEffect, useState } from 'react'

interface Row {
  id: string
  name: string
  url: string
  createdAt: string
  status: string
  priority: string
  updateHtml: string
}

const PRIORITY_CLASS: Record<string, string> = {
  P1: 'bg-red-100 text-red-700',
  P2: 'bg-amber-100 text-amber-700',
  P3: 'bg-blue-100 text-blue-700',
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
    else {
      setError('Incorrect password.')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 className="font-heading text-xl font-semibold text-gray-800 mb-4 text-center">Maintenance Review</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="form-input mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default function MaintenanceAdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/maintenance')
    if (res.status === 401) {
      setAuthed(false)
      return
    }
    setAuthed(true)
    if (res.ok) setRows(await res.json())
    else setError((await res.json().catch(() => ({}))).error || 'Failed to load')
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (authed === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>
  }
  if (authed === false) return <LoginScreen onLogin={load} />

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-heading text-lg font-semibold text-gray-800">Maintenance Requests</h1>
          <span className="text-sm text-gray-400">{rows.length} guided requests</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {rows.length === 0 && !error && (
          <p className="text-gray-400">No guided maintenance requests yet.</p>
        )}

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                {r.priority && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_CLASS[r.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.priority}
                  </span>
                )}
                <span className="flex-1 min-w-0 truncate text-gray-800 text-sm font-medium">{r.name}</span>
                {r.status && <span className="text-xs text-gray-500 hidden sm:inline">{r.status}</span>}
                <span className="text-xs text-gray-400 hidden sm:inline">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-CA') : ''}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${openId === r.id ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openId === r.id && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mb-3 text-sm text-primary-500 hover:underline"
                  >
                    Open in Monday.com →
                  </a>
                  {/* Update HTML is generated by our own API — safe to render. */}
                  <div
                    className="prose prose-sm max-w-none text-gray-700 [&_h2]:text-base [&_h3]:text-sm [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{ __html: r.updateHtml }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
