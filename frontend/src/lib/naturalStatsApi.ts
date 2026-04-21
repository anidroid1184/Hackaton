/**
 * Cliente HTTP para el bundle residencial desde mock-hub o futuro FastAPI.
 */

import type { MockStatsResponse, ScenarioParams } from './residentialGenerators'
import { buildNaturalBundle, getDefaultScenario, parseScenarioFromJson } from './residentialGenerators'
import type { NaturalBundle } from './residentialGenerators'
import { appendSimulationContextParams } from './simulationContext'
import { supabase } from './supabaseClient'

export const MOCK_SCENARIO_STORAGE_KEY = 'solarpulse.mockScenario.v1'

/** UUID de demostración para rutas /stats/{client_id} en mock-hub. */
export const DEMO_CLIENT_ID = '00000000-0000-4000-8000-000000000001'

// #region agent log
function debugLog(message: string, data: Record<string, unknown>): void {
  if (import.meta.env.MODE === 'test') return
  fetch('http://127.0.0.1:7745/ingest/149a0cbd-0dad-49e7-9d41-14f1b33b215c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1006f4' },
    body: JSON.stringify({
      sessionId: '1006f4',
      runId: 'naturalStatsApi',
      hypothesisId: 'D',
      location: 'naturalStatsApi.ts',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}
// #endregion agent log

export function readStoredScenario(): ScenarioParams | null {
  if (typeof sessionStorage === 'undefined') return null
  return parseScenarioFromJson(sessionStorage.getItem(MOCK_SCENARIO_STORAGE_KEY))
}

export function writeStoredScenario(params: ScenarioParams): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(MOCK_SCENARIO_STORAGE_KEY, JSON.stringify(params))
}

function statsBaseUrl(): string | undefined {
  const u = import.meta.env.VITE_STATS_BASE_URL?.trim()
  return u || undefined
}

export function isRemoteStatsEnabled(): boolean {
  return Boolean(statsBaseUrl())
}

function toQuery(params: ScenarioParams): string {
  const q = new URLSearchParams()
  const to = new Date()
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
  q.set('from', from.toISOString())
  q.set('to', to.toISOString())
  // Compat temporal con mock-hub legacy (ignorado por backend normalizado).
  q.set('noise', String(params.noise))
  q.set('scale', String(params.scale))
  q.set('phase', String(params.phase))
  q.set('profile', params.profile)
  appendSimulationContextParams(q)
  return q.toString()
}

type BackendStatsResponse = {
  window: { from: string; to: string }
  financial: { savings_accumulated_usd: number }
  environmental: { co2_avoided_kg: number; trees_equivalent: number }
  technical: {
    energy_kwh: number
    uptime_contractual_pct: number
    power_factor_mean: number
    degradation_trend_pct_per_year: number
  }
}

function isMockStatsResponse(body: unknown): body is MockStatsResponse {
  return Boolean(body && typeof body === 'object' && 'natural' in body)
}

function isBackendStatsResponse(body: unknown): body is BackendStatsResponse {
  const data = body as Partial<BackendStatsResponse> | null
  return Boolean(
    data &&
      typeof data === 'object' &&
      data.window &&
      typeof data.window.from === 'string' &&
      typeof data.window.to === 'string' &&
      data.financial &&
      Number.isFinite(data.financial.savings_accumulated_usd) &&
      data.environmental &&
      Number.isFinite(data.environmental.co2_avoided_kg) &&
      Number.isFinite(data.environmental.trees_equivalent) &&
      data.technical &&
      Number.isFinite(data.technical.energy_kwh) &&
      Number.isFinite(data.technical.uptime_contractual_pct) &&
      Number.isFinite(data.technical.power_factor_mean) &&
      Number.isFinite(data.technical.degradation_trend_pct_per_year),
  )
}

function toNaturalBundleFromBackendStats(
  body: BackendStatsResponse,
  params: ScenarioParams,
): NaturalBundle {
  const seed = buildNaturalBundle(params)
  const savingsCop = Math.round(body.financial.savings_accumulated_usd * 4000)
  const monthPerformance = Math.max(0, Math.min(130, Math.round(body.technical.uptime_contractual_pct)))
  return {
    ...seed,
    snapshot: {
      ...seed.snapshot,
      today: {
        ...seed.snapshot.today,
        kwh: body.technical.energy_kwh,
        savingsCop,
        co2KgAvoided: body.environmental.co2_avoided_kg,
        vsPromisePct: monthPerformance,
      },
      cumulative: {
        ...seed.snapshot.cumulative,
        kwh: body.technical.energy_kwh,
        savingsCop,
        co2KgAvoided: body.environmental.co2_avoided_kg,
        treesEquivalent: Math.max(1, Math.round(body.environmental.trees_equivalent)),
      },
    },
    performanceSummary: {
      ...seed.performanceSummary,
      monthGenerationKwh: body.technical.energy_kwh,
      monthSavingsCop: savingsCop,
      monthPerformancePct: monthPerformance,
      weekGenerationKwh: body.technical.energy_kwh,
      efficiencyNote:
        body.technical.degradation_trend_pct_per_year > 0
          ? 'Se detecta tendencia de degradacion; prioriza mantenimiento preventivo.'
          : seed.performanceSummary.efficiencyNote,
    },
  }
}

/**
 * Obtiene snapshot + PvR + performance desde mock-hub/FastAPI, o genera localmente.
 */
export async function fetchNaturalBundle(
  clientId: string = DEMO_CLIENT_ID,
  params: ScenarioParams = getDefaultScenario(),
): Promise<NaturalBundle> {
  const base = statsBaseUrl()
  if (!base) {
    debugLog('Remote stats disabled (no VITE_STATS_BASE_URL); using local generator', {
      base,
    })
    return buildNaturalBundle(params)
  }
  const localFallback = buildNaturalBundle(params)
  const url = `${base.replace(/\/$/, '')}/stats/${clientId}?${toQuery(params)}`

  try {
    const sessionResult = await supabase.auth.getSession()
    const token = sessionResult?.data?.session?.access_token
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (!res.ok) {
      throw new Error(`naturalStatsApi: ${res.status} ${res.statusText}`)
    }
    const body = (await res.json()) as unknown
    if (isMockStatsResponse(body)) {
      return body.natural
    }
    if (isBackendStatsResponse(body)) {
      return toNaturalBundleFromBackendStats(body, params)
    }
    throw new Error('naturalStatsApi: invalid payload')
  } catch {
    return localFallback
  }
}

export function getLocalNaturalBundle(): NaturalBundle {
  const stored = readStoredScenario()
  return buildNaturalBundle(stored ?? getDefaultScenario())
}
