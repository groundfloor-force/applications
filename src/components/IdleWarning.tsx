'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/locale-context'

interface Props {
  onClear: () => void
  /** Minutes of inactivity before warning. Default 20 */
  warnAfterMin?: number
  /** Minutes after warning before auto-clear. Default 5 */
  clearAfterMin?: number
}

export default function IdleWarning({ onClear, warnAfterMin = 20, clearAfterMin = 5 }: Props) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  const [countdown, setCountdown] = useState(clearAfterMin * 60)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetWarning = () => {
    setVisible(false)
    setCountdown(clearAfterMin * 60)
    if (clearTimer.current) clearTimeout(clearTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)
  }

  const startWarnTimer = () => {
    if (warnTimer.current) clearTimeout(warnTimer.current)
    warnTimer.current = setTimeout(() => {
      setVisible(true)
      setCountdown(clearAfterMin * 60)

      // Countdown ticker
      countdownInterval.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (countdownInterval.current) clearInterval(countdownInterval.current)
            return 0
          }
          return c - 1
        })
      }, 1_000)

      // Auto-clear after clearAfterMin
      clearTimer.current = setTimeout(() => {
        setVisible(false)
        onClear()
      }, clearAfterMin * 60 * 1_000)
    }, warnAfterMin * 60 * 1_000)
  }

  const handleActivity = () => {
    if (visible) return // Don't reset if warning is already showing
    startWarnTimer()
  }

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }))
    startWarnTimer()

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      if (warnTimer.current) clearTimeout(warnTimer.current)
      if (clearTimer.current) clearTimeout(clearTimer.current)
      if (countdownInterval.current) clearInterval(countdownInterval.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleStillHere = () => {
    resetWarning()
    startWarnTimer()
  }

  const handleRestart = () => {
    resetWarning()
    onClear()
  }

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white  shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-xl text-brand-dark mb-2" style={{ fontWeight: 700 }}>
          {t.idle.stillThere}
        </h2>
        <p className="text-sm text-brand-gray mb-2">
          {t.idle.sessionIdle}
        </p>

        <div className="text-3xl text-amber-500 mb-6 tabular-nums" style={{ fontWeight: 700 }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleStillHere}
            className="btn-primary w-full justify-center"
          >
            {t.idle.imStillHere}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="w-full py-2 text-sm text-brand-gray hover:text-brand-gray transition-colors"
          >
            {t.idle.clearAndRestart}
          </button>
        </div>
      </div>
    </div>
  )
}
