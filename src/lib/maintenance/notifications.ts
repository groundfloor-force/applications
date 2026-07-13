// ─────────────────────────────────────────────────────────────────────────────
// Emergency notification interface.
//
// Provider-agnostic so SMS / Slack / push / phone can be added later without
// touching the submission flow. For v1 the default provider logs (and, in
// Stage 2, can email/webhook if that infra is wired). The golden rule: a
// notification failure must NEVER block request creation — always route sends
// through `safeNotify`, which swallows and records provider errors.
// ─────────────────────────────────────────────────────────────────────────────

import type { Priority } from './types'

export interface EmergencyNotification {
  requestId: string
  priority: Priority
  emergencyType: string | null
  summary: string
  propertyAddress?: string
  unit?: string
  contactName?: string
  contactPhone?: string
  safetyFlags: string[]
}

export interface NotificationProvider {
  name: string
  send(n: EmergencyNotification): Promise<void>
}

/** Default provider: structured log line. Always succeeds. */
export const logProvider: NotificationProvider = {
  name: 'log',
  async send(n) {
    console.log(
      `[maintenance:EMERGENCY] priority=${n.priority} type=${n.emergencyType ?? 'n/a'} ` +
        `request=${n.requestId} property="${n.propertyAddress ?? ''}${n.unit ? ' #' + n.unit : ''}" ` +
        `flags=[${n.safetyFlags.join(',')}] summary="${n.summary}"`,
    )
  },
}

export interface NotifyOutcome {
  provider: string
  ok: boolean
  error?: string
}

/**
 * Fire every provider without ever throwing. Returns per-provider outcomes so
 * failures can be logged/reviewed, but request creation continues regardless.
 */
export async function safeNotify(
  providers: NotificationProvider[],
  n: EmergencyNotification,
): Promise<NotifyOutcome[]> {
  const results = await Promise.allSettled(providers.map((p) => p.send(n)))
  return results.map((r, i) => {
    const provider = providers[i]?.name ?? `provider_${i}`
    if (r.status === 'fulfilled') return { provider, ok: true }
    const error = r.reason instanceof Error ? r.reason.message : String(r.reason)
    console.error(`[maintenance:notify] provider=${provider} FAILED: ${error}`)
    return { provider, ok: false, error }
  })
}
