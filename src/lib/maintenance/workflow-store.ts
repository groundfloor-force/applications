// ─────────────────────────────────────────────────────────────────────────────
// Workflow store — the active maintenance workflow, backed by Vercel Blob.
//
// The bundled code definition (water-leak-v1.ts) is the seed/fallback. Once an
// admin saves an edited workflow it's stored as JSON in Blob and becomes the
// "active" workflow the public form and API load at runtime. If Blob is not
// configured (no BLOB_READ_WRITE_TOKEN) or unreachable, everything falls back to
// the code default, so the intake never breaks.
//
// SERVER ONLY — imports the Blob SDK. Never import from a client component.
// ─────────────────────────────────────────────────────────────────────────────

import { list, put } from '@vercel/blob'
import type { WorkflowDefinition } from './types'
import { maintenanceIntakeWorkflow } from './workflows'
import { validateWorkflow } from './validate-workflow'

const ACTIVE_PATH = 'maintenance/workflow-active.json'
const VERSIONS_PREFIX = 'maintenance/versions/'

function blobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

/** The active workflow: the Blob-stored one if present, otherwise the code default. */
export async function getActiveWorkflow(): Promise<WorkflowDefinition> {
  if (!blobEnabled()) return maintenanceIntakeWorkflow
  try {
    const { blobs } = await list({ prefix: ACTIVE_PATH, limit: 1 })
    const blob = blobs.find((b) => b.pathname === ACTIVE_PATH)
    if (!blob) return maintenanceIntakeWorkflow
    const res = await fetch(blob.url, { cache: 'no-store' })
    if (!res.ok) return maintenanceIntakeWorkflow
    const wf = (await res.json()) as WorkflowDefinition
    // Guard against a corrupt blob — fall back rather than serve a broken form.
    if (validateWorkflow(wf).length > 0) return maintenanceIntakeWorkflow
    return wf
  } catch (err) {
    console.error('[workflow-store] getActiveWorkflow failed, using code default:', err)
    return maintenanceIntakeWorkflow
  }
}

export interface SaveResult {
  ok: boolean
  errors?: string[]
  url?: string
}

/** Validate and persist a workflow as the new active version (keeps a snapshot). */
export async function saveActiveWorkflow(wf: WorkflowDefinition): Promise<SaveResult> {
  const errors = validateWorkflow(wf)
  if (errors.length) return { ok: false, errors }
  if (!blobEnabled()) {
    return { ok: false, errors: ['Blob storage is not configured (BLOB_READ_WRITE_TOKEN is not set).'] }
  }

  const json = JSON.stringify(wf, null, 2)
  // Timestamped snapshot for history/rollback.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await put(`${VERSIONS_PREFIX}${wf.version}__${stamp}.json`, json, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: true,
  })
  const { url } = await put(ACTIVE_PATH, json, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return { ok: true, url }
}

export interface WorkflowVersionRef {
  pathname: string
  url: string
  uploadedAt: string
  size: number
}

/** List saved version snapshots, newest first. */
export async function listWorkflowVersions(): Promise<WorkflowVersionRef[]> {
  if (!blobEnabled()) return []
  try {
    const { blobs } = await list({ prefix: VERSIONS_PREFIX, limit: 100 })
    return blobs
      .map((b) => ({
        pathname: b.pathname,
        url: b.url,
        uploadedAt: b.uploadedAt instanceof Date ? b.uploadedAt.toISOString() : String(b.uploadedAt),
        size: b.size,
      }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  } catch (err) {
    console.error('[workflow-store] listWorkflowVersions failed:', err)
    return []
  }
}
