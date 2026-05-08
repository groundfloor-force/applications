'use client'

import { useState, useEffect } from 'react'
import { FormConfig } from '@/lib/types'

interface AppRow {
  id: string; name: string; url: string; createdAt: string
  status: string; address: string; unit: string; email: string; moveInDate: string
}

const STATUS_COLORS: Record<string, string> = {
  New:            'bg-blue-100 text-blue-700',
  'Under Review': 'bg-amber-100 text-amber-700',
  Approved:       'bg-green-100 text-green-700',
  Declined:       'bg-red-100 text-red-700',
}

type Screen = 'login' | 'dashboard'

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      onLogin()
    } else {
      setError('Incorrect password.')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.groundfloorpm.com/images/logo-long.png"
          alt="Ground Floor"
          className="h-12 mx-auto mb-8 object-contain"
        />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <h1 className="font-heading text-xl font-semibold text-gray-800 mb-1 text-center">
            Admin Access
          </h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Ground Floor Rental Form — Admin Panel
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Enter admin password"
              />
            </div>
            {error && <p className="text-secondary text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<FormConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apps, setApps] = useState<AppRow[]>([])
  const [appsLoading, setAppsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((c) => { setConfig(c); setLoading(false) })
      .catch(() => setLoading(false))
    fetch('/api/admin/applications')
      .then((r) => r.json())
      .then((a) => { setApps(Array.isArray(a) ? a : []); setAppsLoading(false) })
      .catch(() => setAppsLoading(false))
  }, [])

  const save = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    onLogout()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading...
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-secondary">
        Failed to load config. Please refresh.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.logoUrl} alt="Ground Floor" className="h-10 object-contain" />
          <div className="flex items-center gap-3">
            <a
              href="/apply?autofill=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Test Application
            </a>
            <a
              href="/apply"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-500 hover:underline"
            >
              Preview Form ↗
            </a>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-semibold text-gray-900 mb-1">Admin Panel</h1>
          <p className="text-sm text-gray-500">
            Configure the rental application form. Changes take effect immediately after saving.
          </p>
        </div>

        <div className="space-y-6">
          {/* Form Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-heading text-lg font-semibold text-primary-500 mb-4 pb-2 border-b border-gray-100">
              Form Status
            </h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setConfig({ ...config, formOpen: true })}
                className={`px-6 py-2 rounded-pill text-sm font-bold border-2 transition-colors ${
                  config.formOpen
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-green-400'
                }`}
              >
                Open — Accepting Applications
              </button>
              <button
                onClick={() => setConfig({ ...config, formOpen: false })}
                className={`px-6 py-2 rounded-pill text-sm font-bold border-2 transition-colors ${
                  !config.formOpen
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-white text-gray-500 border-gray-300 hover:border-secondary'
                }`}
              >
                Closed — Paused
              </button>
            </div>
            {!config.formOpen && (
              <div className="mt-4">
                <label className="form-label">Message shown to applicants when form is closed</label>
                <input
                  className="form-input"
                  value={config.closedMessage}
                  onChange={(e) => setConfig({ ...config, closedMessage: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* Branding */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-heading text-lg font-semibold text-primary-500 mb-4 pb-2 border-b border-gray-100">
              Branding
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Company Name</label>
                <input
                  className="form-input"
                  value={config.companyName}
                  onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Logo URL</label>
                <input
                  className="form-input"
                  value={config.logoUrl}
                  onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
                />
              </div>
            </div>
            {config.logoUrl && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={config.logoUrl} alt="Logo preview" className="h-10 object-contain" />
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-heading text-lg font-semibold text-primary-500 mb-4 pb-2 border-b border-gray-100">
              Notifications
            </h2>
            <div>
              <label className="form-label">
                Notification Email{' '}
                <span className="font-normal text-gray-400">(optional — for future email alerts)</span>
              </label>
              <input
                type="email"
                className="form-input max-w-sm"
                value={config.notificationEmail}
                onChange={(e) => setConfig({ ...config, notificationEmail: e.target.value })}
                placeholder="you@groundfloorpm.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                All submitted applications are sent directly to your Monday.com Applications board.
              </p>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-heading text-lg font-semibold text-primary-500 mb-4 pb-2 border-b border-gray-100">
              Terms & Conditions Text
            </h2>
            <textarea
              className="form-input min-h-[240px] font-mono text-xs"
              value={config.termsText}
              onChange={(e) => setConfig({ ...config, termsText: e.target.value })}
            />
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <h2 className="font-heading text-lg font-semibold text-primary-500">Recent Applications</h2>
              <a href="https://groundfloor-force.monday.com/boards/640654033" target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary-500 hover:underline">
                Open in Monday ↗
              </a>
            </div>
            {appsLoading ? (
              <p className="text-sm text-gray-400">Loading applications...</p>
            ) : apps.length === 0 ? (
              <p className="text-sm text-gray-400">No applications found.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 px-2 font-medium">Applicant</th>
                      <th className="pb-2 px-2 font-medium">Property</th>
                      <th className="pb-2 px-2 font-medium">Move-In</th>
                      <th className="pb-2 px-2 font-medium">Status</th>
                      <th className="pb-2 px-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((app) => (
                      <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-2">
                          <p className="font-medium text-gray-800">{app.name}</p>
                          <p className="text-xs text-gray-400">{app.email}</p>
                        </td>
                        <td className="py-2.5 px-2 text-gray-600">
                          {app.address ? `${app.address}${app.unit ? ` #${app.unit}` : ''}` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-gray-500 text-xs">
                          {app.moveInDate || '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {app.status || 'New'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <a href={app.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary-500 hover:underline whitespace-nowrap">
                            View ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monday.com info */}
          <div className="bg-primary-50 rounded-xl border border-primary-100 p-6">
            <h2 className="font-heading text-lg font-semibold text-primary-500 mb-2">
              Monday.com Connection
            </h2>
            <div className="text-sm text-primary-700 space-y-1">
              <p>
                <strong>Applications Board:</strong> 1. Applications (ID: 640654033)
              </p>
              <p>
                <strong>Vacancy Board:</strong> 2. Vacancy List (ID: 469686343)
              </p>
              <p>
                <strong>Workspace:</strong> Ground Floor
              </p>
            </div>
            <p className="mt-3 text-xs text-primary-600">
              New applications are created in the <strong>New</strong> group and linked to the
              selected vacancy. All form details are saved as an item update. Pay stubs are attached
              to the PDF file column.
            </p>
          </div>
        </div>

        {/* Save */}
        <div className="mt-8 flex items-center gap-4">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved successfully
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Note: Config is stored in server memory. On a VPS it persists indefinitely. On Vercel it
          resets on cold starts — save again if settings reset after inactivity.
        </p>
      </main>
    </div>
  )
}

export default function AdminPage() {
  const [screen, setScreen] = useState<Screen>('login')

  // Check if already authenticated
  useEffect(() => {
    fetch('/api/admin/config').then((r) => {
      if (r.ok) setScreen('dashboard')
    })
  }, [])

  if (screen === 'login') return <LoginScreen onLogin={() => setScreen('dashboard')} />
  return <Dashboard onLogout={() => setScreen('login')} />
}
