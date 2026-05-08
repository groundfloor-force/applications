// ── Phone formatting ──────────────────────────────────────────────────────────

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ── localStorage form persistence ────────────────────────────────────────────

const STORAGE_KEY = 'gfpm_application_v2'

export interface SavedForm {
  step: number
  data: Record<string, unknown>
  savedAt: number
}

export function saveFormToStorage(step: number, data: Record<string, unknown>): void {
  try {
    // Never persist File objects
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { payStubFile, ...rest } = data as Record<string, unknown> & { payStubFile?: unknown }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data: rest, savedAt: Date.now() }))
  } catch {
    // Storage full or unavailable — fail silently
  }
}

export function loadFormFromStorage(): SavedForm | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedForm
  } catch {
    return null
  }
}

export function clearFormFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function formatSavedAt(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  const hrs = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hrs >= 1) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  if (mins >= 1) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  return 'just now'
}
