import { useCallback, useEffect, useState } from 'react'
import {
  buildNaturalBundle,
  getDefaultScenario,
  type NaturalBundle,
  type ScenarioParams,
} from '../lib/residentialGenerators'
import {
  DEMO_CLIENT_ID,
  fetchNaturalBundle,
  isRemoteStatsEnabled,
  MOCK_SCENARIO_STORAGE_KEY,
  readStoredScenario,
} from '../lib/naturalStatsApi'
import {
  SIMULATION_CONTEXT_CHANGE_EVENT,
  SIMULATION_CONTEXT_STORAGE_KEY,
} from '../lib/simulationContext'
import {
  TIME_WINDOW_CHANGE_EVENT,
  TIME_WINDOW_STORAGE_KEY,
} from './useTimeWindow'

export const MOCK_SCENARIO_CHANGE_EVENT = 'solarpulse:mock-scenario'

export function useResidentialNatural() {
  const [bundle, setBundle] = useState<NaturalBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params: ScenarioParams = readStoredScenario() ?? getDefaultScenario()
    try {
      if (isRemoteStatsEnabled()) {
        const b = await fetchNaturalBundle(DEMO_CLIENT_ID, params)
        setBundle(b)
      } else {
        setBundle(buildNaturalBundle(params))
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
      setBundle(buildNaturalBundle(params))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [load])

  useEffect(() => {
    const onScenario = () => queueMicrotask(() => void load())
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === MOCK_SCENARIO_STORAGE_KEY ||
        event.key === SIMULATION_CONTEXT_STORAGE_KEY ||
        event.key === TIME_WINDOW_STORAGE_KEY
      ) {
        queueMicrotask(() => void load())
      }
    }
    window.addEventListener(MOCK_SCENARIO_CHANGE_EVENT, onScenario)
    window.addEventListener(SIMULATION_CONTEXT_CHANGE_EVENT, onScenario)
    window.addEventListener(TIME_WINDOW_CHANGE_EVENT, onScenario)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(MOCK_SCENARIO_CHANGE_EVENT, onScenario)
      window.removeEventListener(SIMULATION_CONTEXT_CHANGE_EVENT, onScenario)
      window.removeEventListener(TIME_WINDOW_CHANGE_EVENT, onScenario)
      window.removeEventListener('storage', onStorage)
    }
  }, [load])

  return { bundle, loading, error, reload: load }
}
