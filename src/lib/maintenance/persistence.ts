// Client-side session persistence for the maintenance intake flow.
//
// Uses sessionStorage (NOT localStorage) on purpose: an accidental page reload
// restores the in-progress answers, but closing the tab / leaving and coming
// back later starts a completely fresh request. This matches the expectation
// that revisiting the page is a new work order, not a resumed draft.
//
// Photo answers are stripped before saving — they reference in-memory File
// objects that cannot survive serialisation (JSON.stringify turns a File into
// `{}`, which later crashes FormData). Text answers survive a reload.

import type { EngineState } from './types'
import { QID } from './ids'

const KEY = 'gfpm_maintenance_intake_v1'

function stripMedia(state: EngineState): EngineState {
  const answers = { ...state.answers }
  const labels = { ...state.labels }
  // Keep the 'UNSAFE_SKIP' sentinel (a string), drop any file-list answer.
  if (Array.isArray(answers[QID.MEDIA])) {
    delete answers[QID.MEDIA]
    delete labels[QID.MEDIA]
  }
  return { ...state, answers, labels }
}

export function saveState(state: EngineState): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(stripMedia(state)))
  } catch {
    // Storage full / unavailable — non-fatal, the flow still works in-memory.
  }
}

export function loadState(): EngineState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as EngineState
  } catch {
    return null
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
