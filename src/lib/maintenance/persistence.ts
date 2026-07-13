// Client-side session persistence for the maintenance intake flow.
//
// The engine state is plain JSON and safe to persist — EXCEPT photo answers,
// which reference in-memory File objects that cannot survive serialisation
// (JSON.stringify turns a File into `{}`, which later crashes FormData). We
// therefore strip the photo answer before saving; on resume the review screen
// re-prompts for photos. Text answers survive a refresh.

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
    window.localStorage.setItem(KEY, JSON.stringify(stripMedia(state)))
  } catch {
    // Storage full / unavailable — non-fatal, the flow still works in-memory.
  }
}

export function loadState(): EngineState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as EngineState
  } catch {
    return null
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
