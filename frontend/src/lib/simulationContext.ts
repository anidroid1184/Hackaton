export type SimulationProvider = 'deye' | 'huawei' | 'growatt'

export type SimulationContext = {
  provider: SimulationProvider
  compareProvider: SimulationProvider
  scenario: string
  faultMode: string
}

type SimulationContextInput = Partial<{
  provider: string
  compareProvider: string
  scenario: string
  faultMode: string
}>

export const SIMULATION_CONTEXT_STORAGE_KEY = 'solarpulse.simulationContext.v1'
export const SIMULATION_CONTEXT_CHANGE_EVENT = 'solarpulse:simulation-context'

/**
 * Espejea `MOCK_SCENARIO_STORAGE_KEY` de `./naturalStatsApi` para evitar un ciclo
 * de import (naturalStatsApi ya depende de `appendSimulationContextParams`). Si se
 * actualiza allí, debe actualizarse aquí.
 */
const MOCK_SCENARIO_STORAGE_KEY_MIRROR = 'solarpulse.mockScenario.v1'

const DEFAULT_CONTEXT: SimulationContext = {
  provider: 'huawei',
  compareProvider: 'deye',
  scenario: 'baseline',
  faultMode: 'none',
}

function normalizeProvider(value: string | null | undefined): SimulationProvider | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'deye' || normalized === 'huawei' || normalized === 'growatt') {
    return normalized
  }
  return null
}

function normalizeFaultMode(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (!/^[a-z0-9_-]{2,32}$/.test(normalized)) return null
  return normalized
}

function normalizeScenario(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (!/^[a-z0-9_-]{2,32}$/.test(normalized)) return null
  return normalized
}

function normalizeContext(raw: SimulationContextInput | null): SimulationContext {
  return {
    provider: normalizeProvider(raw?.provider) ?? DEFAULT_CONTEXT.provider,
    compareProvider: normalizeProvider(raw?.compareProvider) ?? DEFAULT_CONTEXT.compareProvider,
    scenario: normalizeScenario(raw?.scenario) ?? DEFAULT_CONTEXT.scenario,
    faultMode: normalizeFaultMode(raw?.faultMode) ?? DEFAULT_CONTEXT.faultMode,
  }
}

export function readStoredSimulationContext(): SimulationContext | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SIMULATION_CONTEXT_STORAGE_KEY)
    if (!raw) return null
    return normalizeContext(JSON.parse(raw) as Partial<SimulationContext>)
  } catch {
    return null
  }
}

export function writeStoredSimulationContext(context: SimulationContextInput): SimulationContext {
  const normalized = normalizeContext(context)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SIMULATION_CONTEXT_STORAGE_KEY, JSON.stringify(normalized))
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SIMULATION_CONTEXT_CHANGE_EVENT))
  }
  return normalized
}

export function resolveSimulationContext(search: URLSearchParams): SimulationContext {
  const stored = readStoredSimulationContext()
  const merged: SimulationContextInput = {
    provider: search.get('provider') ?? stored?.provider,
    compareProvider: search.get('compareProvider') ?? stored?.compareProvider,
    scenario: search.get('scenario') ?? stored?.scenario,
    faultMode: search.get('faultMode') ?? stored?.faultMode,
  }
  return normalizeContext(merged)
}

/**
 * Inyecta en `query` el contexto de simulación persistido (provider/scenario/...)
 * y, si existen en sessionStorage, los params de escenario del mock-hub
 * (noise/scale/phase/profile). Para los ScenarioParams respeta `query.has(key)`
 * para no pisar valores explícitos (p.ej. los que añade `naturalStatsApi.toQuery`).
 */
export function appendSimulationContextParams(query: URLSearchParams): void {
  if (typeof window === 'undefined') return
  const search = new URLSearchParams(window.location.search)
  const context = resolveSimulationContext(search)
  query.set('provider', context.provider)
  query.set('compareProvider', context.compareProvider)
  query.set('scenario', context.scenario)
  query.set('faultMode', context.faultMode)

  appendMockScenarioParams(query)
}

function appendMockScenarioParams(query: URLSearchParams): void {
  if (typeof sessionStorage === 'undefined') return
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(MOCK_SCENARIO_STORAGE_KEY_MIRROR)
  } catch {
    return
  }
  if (!raw) return
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return
  }
  if (!parsed || typeof parsed !== 'object') return

  const noise = Number(parsed.noise)
  if (!query.has('noise') && Number.isFinite(noise)) {
    query.set('noise', String(noise))
  }
  const scale = Number(parsed.scale)
  if (!query.has('scale') && Number.isFinite(scale)) {
    query.set('scale', String(scale))
  }
  const phase = Number(parsed.phase)
  if (!query.has('phase') && Number.isFinite(phase)) {
    query.set('phase', String(phase))
  }
  const profile = typeof parsed.profile === 'string' ? parsed.profile.trim() : ''
  if (!query.has('profile') && profile.length > 0) {
    query.set('profile', profile)
  }
}
