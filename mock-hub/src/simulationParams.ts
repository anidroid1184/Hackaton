import { parseScenarioParams, type AliasProfileId, type ScenarioParams } from '../../frontend/src/lib/residentialGenerators.ts'

export type ProviderId = 'deye' | 'huawei' | 'growatt'
export type FaultMode = 'none' | 'degraded' | 'offline' | 'spikes'

export type SimulationParams = ScenarioParams & {
  provider: ProviderId
  compareProvider: ProviderId
  scenario: string
  faultMode: FaultMode
}

const DEFAULT_PROVIDER: ProviderId = 'huawei'
const DEFAULT_COMPARE_PROVIDER: ProviderId = 'deye'
const DEFAULT_SCENARIO = 'baseline'
const DEFAULT_FAULT_MODE: FaultMode = 'none'

const PROVIDERS: ProviderId[] = ['deye', 'huawei', 'growatt']
const FAULT_MODES: FaultMode[] = ['none', 'degraded', 'offline', 'spikes']

function sanitizeScenario(raw: string | null): string {
  const candidate = (raw ?? DEFAULT_SCENARIO).trim().toLowerCase()
  if (!candidate) return DEFAULT_SCENARIO
  if (!/^[a-z0-9_-]{2,32}$/.test(candidate)) return DEFAULT_SCENARIO
  return candidate
}

function parseProvider(raw: string | null): ProviderId {
  const value = (raw ?? DEFAULT_PROVIDER).trim().toLowerCase()
  return PROVIDERS.includes(value as ProviderId) ? (value as ProviderId) : DEFAULT_PROVIDER
}

function parseFaultMode(raw: string | null): FaultMode {
  const value = (raw ?? DEFAULT_FAULT_MODE).trim().toLowerCase()
  return FAULT_MODES.includes(value as FaultMode) ? (value as FaultMode) : DEFAULT_FAULT_MODE
}

export function parseSimulationParams(searchParams: URLSearchParams): SimulationParams {
  const scenario = parseScenarioParams(searchParams)
  return {
    ...scenario,
    provider: parseProvider(searchParams.get('provider')),
    compareProvider: parseProvider(searchParams.get('compareProvider') ?? DEFAULT_COMPARE_PROVIDER),
    scenario: sanitizeScenario(searchParams.get('scenario')),
    faultMode: parseFaultMode(searchParams.get('faultMode')),
  }
}

export function effectiveAliasProfile(provider: ProviderId, profile: AliasProfileId): AliasProfileId {
  if (profile !== 'canonical') return profile
  if (provider === 'huawei' || provider === 'growatt') return 'pac'
  return 'active_power'
}

export function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
