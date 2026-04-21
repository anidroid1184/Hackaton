import { useEffect } from 'react'
import { MOCK_SCENARIO_CHANGE_EVENT } from './useResidentialNatural'

const AUTO_REFRESH_FLAG = 'VITE_SIMULATION_AUTO_REFRESH'
const DEFAULT_INTERVAL_MS = 5000

export function useSimulationAutoRefresh(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  useEffect(() => {
    const enabled = (import.meta.env[AUTO_REFRESH_FLAG] ?? 'true') === 'true'
    if (!enabled) return
    const tick = () => {
      window.dispatchEvent(new Event(MOCK_SCENARIO_CHANGE_EVENT))
    }
    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
}
