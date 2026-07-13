import { describe, it, expect } from 'vitest'
import { validateMedia } from '../media-validation'
import { safeNotify, logProvider, type NotificationProvider, type EmergencyNotification } from '../notifications'

describe('media validation', () => {
  it('11. unsupported media is rejected', () => {
    expect(validateMedia({ name: 'notes.txt', type: 'text/plain', size: 1000 }).ok).toBe(false)
    expect(validateMedia({ name: 'malware.exe', type: 'application/octet-stream', size: 1000 }).ok).toBe(false)
  })

  it('accepts a normal photo', () => {
    expect(validateMedia({ name: 'leak.jpg', type: 'image/jpeg', size: 2_000_000 }).ok).toBe(true)
  })

  it('rejects a photo that is too large', () => {
    expect(validateMedia({ name: 'huge.png', type: 'image/png', size: 80 * 1024 * 1024 }).ok).toBe(false)
  })

  it('rejects video in v1 but recognises it (not "unsupported type")', () => {
    const res = validateMedia({ name: 'clip.mp4', type: 'video/mp4', size: 5_000_000 })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/video/i)
  })
})

const notification: EmergencyNotification = {
  requestId: 'req_1',
  priority: 'P1',
  emergencyType: 'Uncontrolled Water',
  summary: 'Test',
  safetyFlags: [],
}

describe('emergency notifications', () => {
  it('10. a failed notification provider does not prevent request creation', async () => {
    const failing: NotificationProvider = {
      name: 'flaky',
      async send() {
        throw new Error('provider down')
      },
    }
    // safeNotify must resolve (never throw) so the caller can still save the request.
    const outcomes = await safeNotify([failing, logProvider], notification)
    expect(outcomes.find((o) => o.provider === 'flaky')?.ok).toBe(false)
    expect(outcomes.find((o) => o.provider === 'log')?.ok).toBe(true)
  })
})
