'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WorkflowDefinition } from '@/lib/maintenance/types'
import WorkflowEditor from '@/components/maintenance/admin/WorkflowEditor'

interface VersionRef {
  pathname: string
  url: string
  uploadedAt: string
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
        <h1 className="font-heading text-xl font-semibold text-gray-800 mb-4 text-center">Workflow Editor</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" className="form-input mb-3" autoFocus />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

export default function WorkflowEditorPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [wf, setWf] = useState<WorkflowDefinition | null>(null)
  const [builtIn, setBuiltIn] = useState<WorkflowDefinition | null>(null)
  const [versions, setVersions] = useState<VersionRef[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/maintenance/workflow')
    if (res.status === 401) { setAuthed(false); return }
    setAuthed(true)
    if (res.ok) {
      const data = await res.json()
      setWf(data.workflow)
      setBuiltIn(data.builtIn ?? null)
      setVersions(data.versions ?? [])
    } else {
      setError((await res.json().catch(() => ({}))).error || 'Failed to load')
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (authed === null) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>
  if (authed === false) return <LoginScreen onLogin={load} />
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600">{error}</div>
  if (!wf) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading workflow…</div>

  return <WorkflowEditor initial={wf} initialVersions={versions} builtIn={builtIn} />
}
