import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppRole } from '../auth/mockOperationsAuth'
import type { WarRoomAlert } from '../lib/operationsMockData'
import { fetchOperationsWarRoomData } from '../lib/roleDashboardApi'

export type CriticalToast = {
  id: string
  title: string
  body: string
  severity: 'info' | 'warn' | 'critical'
  ts: string
}

type UseCriticalAlertsResult = {
  toasts: CriticalToast[]
  critical: WarRoomAlert | null
  dismissToast: (id: string) => void
  clearCritical: () => void
}

const POLL_INTERVAL_MS = 10_000
const MAX_TOASTS = 5
const AUTO_REFRESH_FLAG = 'VITE_SIMULATION_AUTO_REFRESH'
const ACTIVE_ROLE: AppRole = 'operaciones'

function toToast(alert: WarRoomAlert): CriticalToast {
  return {
    id: alert.id,
    title: `${alert.plantName} — ${alert.geozone}`,
    body: alert.summary,
    severity: alert.severity,
    ts: alert.ts,
  }
}

export function useCriticalAlerts(
  role: AppRole | null | undefined,
): UseCriticalAlertsResult {
  const [toasts, setToasts] = useState<CriticalToast[]>([])
  const [critical, setCritical] = useState<WarRoomAlert | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const criticalRef = useRef<WarRoomAlert | null>(null)

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearCritical = useCallback(() => {
    criticalRef.current = null
    setCritical(null)
  }, [])

  useEffect(() => {
    const autoRefreshEnabled =
      (import.meta.env[AUTO_REFRESH_FLAG] ?? 'true') !== 'false'
    if (!autoRefreshEnabled) return
    if (role !== ACTIVE_ROLE) return

    let cancelled = false
    let intervalId: number | null = null

    const poll = async () => {
      if (cancelled || document.visibilityState === 'hidden') return
      try {
        const alerts = await fetchOperationsWarRoomData()
        if (cancelled) return
        const fresh = alerts.filter((alert) => !seenIdsRef.current.has(alert.id))
        if (fresh.length === 0) return
        fresh.forEach((alert) => seenIdsRef.current.add(alert.id))
        if (!criticalRef.current) {
          const firstCritical = fresh.find((alert) => alert.severity === 'critical')
          if (firstCritical) {
            criticalRef.current = firstCritical
            setCritical(firstCritical)
          }
        }
        setToasts((prev) => {
          const next = [...prev, ...fresh.map(toToast)]
          return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
        })
      } catch (error) {
        console.warn('[useCriticalAlerts] failed to fetch war room alerts', error)
      }
    }

    const start = () => {
      if (intervalId !== null) return
      void poll()
      intervalId = window.setInterval(() => {
        void poll()
      }, POLL_INTERVAL_MS)
    }

    const stop = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop()
      } else {
        start()
      }
    }

    if (document.visibilityState !== 'hidden') start()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [role])

  return { toasts, critical, dismissToast, clearCritical }
}
