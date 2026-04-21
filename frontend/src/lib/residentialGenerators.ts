/**
 * Generación parametrizable de datos residenciales (Promesa vs Real, snapshot, KPIs).
 * Usado por `residentialMock.ts` (valores por defecto) y por `mock-hub` (HTTP).
 */

export type SeriesPoint = {
  ts: string
  value: number
}

export type PromiseVsReal = {
  window: { from: string; to: string; label: string }
  unit: 'kWh'
  promise: SeriesPoint[]
  real: SeriesPoint[]
  fulfillmentPct: number
}

export type ResidentialSnapshot = {
  clientName: string
  plantName: string
  today: {
    kwh: number
    savingsCop: number
    co2KgAvoided: number
    vsPromisePct: number
  }
  cumulative: {
    kwh: number
    savingsCop: number
    co2KgAvoided: number
    treesEquivalent: number
  }
  technicianNotice: {
    technicianName: string
    visitWindow: string
    status: 'pending' | 'scheduled' | 'done'
  } | null
}

export type PerformanceSummary = {
  monthGenerationKwh: number
  monthSavingsCop: number
  monthPerformancePct: number
  weekGenerationKwh: number
  efficiencyNote: string
}

export type AliasProfileId = 'pac' | 'active_power' | 'p_total' | 'canonical'

export type ScenarioParams = {
  /** Ruido en la serie «real» (0–1). */
  noise: number
  /** Escala de amplitud (curva y kWh). */
  scale: number
  /** Desfase de fase en la campana (0–1). */
  phase: number
  /** Claves heterogéneas en `raw_alias_demo` (misma magnitud subyacente). */
  profile: AliasProfileId
}

const DEFAULT_SCENARIO: ScenarioParams = {
  noise: 0.2,
  scale: 1,
  phase: 0,
  profile: 'canonical',
}

export function getDefaultScenario(): ScenarioParams {
  return { ...DEFAULT_SCENARIO }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function parseScenarioParams(searchParams: URLSearchParams): ScenarioParams {
  const noise = clamp(parseFloat(searchParams.get('noise') ?? ''), 0, 1)
  const scaleRaw = parseFloat(searchParams.get('scale') ?? '')
  const phase = clamp(parseFloat(searchParams.get('phase') ?? ''), 0, 1)
  const profile = parseProfile(searchParams.get('profile'))
  return {
    noise: Number.isFinite(noise) ? noise : DEFAULT_SCENARIO.noise,
    scale: Number.isFinite(scaleRaw) ? clamp(scaleRaw, 0.3, 3) : DEFAULT_SCENARIO.scale,
    phase: Number.isFinite(phase) ? phase : DEFAULT_SCENARIO.phase,
    profile,
  }
}

export function parseScenarioFromJson(raw: string | null): ScenarioParams | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<ScenarioParams>
    return {
      noise: clamp(Number(o.noise ?? DEFAULT_SCENARIO.noise), 0, 1),
      scale: clamp(Number(o.scale ?? DEFAULT_SCENARIO.scale), 0.3, 3),
      phase: clamp(Number(o.phase ?? DEFAULT_SCENARIO.phase), 0, 1),
      profile: parseProfile(typeof o.profile === 'string' ? o.profile : null),
    }
  } catch {
    return null
  }
}

function parseProfile(s: string | null): AliasProfileId {
  const v = (s ?? 'canonical').toLowerCase()
  if (v === 'pac' || v === 'active_power' || v === 'p_total' || v === 'canonical') {
    return v
  }
  return 'canonical'
}

function mkSeries(
  base: number,
  noise: number,
  points: number,
  labels: string[],
  phase: number,
): SeriesPoint[] {
  const out: SeriesPoint[] = []
  const phaseShift = Math.floor(phase * points) % points
  for (let i = 0; i < points; i += 1) {
    const j = (i + phaseShift) % points
    const t = j / (points - 1)
    const bell = Math.sin(Math.PI * t)
    const jitter = (Math.sin(j * 7.1) + Math.cos(j * 3.3)) * 0.5
    out.push({
      ts: labels[i] ?? `${i}`,
      value: Math.max(0, base * bell + jitter * noise),
    })
  }
  return out
}

/** Meses abreviados (es) para eje X. */
const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

export function buildPromiseVsReal(params: ScenarioParams): PromiseVsReal {
  const labels = MONTH_LABELS
  const baseP = 2.4 * params.scale
  const baseR = 2.7 * params.scale

  const promise = mkSeries(baseP, 0.05 * params.noise, labels.length, labels, params.phase)
  let real = mkSeries(baseR, params.noise, labels.length, labels, params.phase).map((p, i) => ({
    ...p,
    value: p.value * (0.9 + (i % 3) * 0.05),
  }))

  const totalPromise = promise.reduce((a, b) => a + b.value, 0)
  let totalReal = real.reduce((a, b) => a + b.value, 0)
  if (totalPromise > 0 && totalReal > 0) {
    const scale = (0.95 * totalPromise) / totalReal
    real = real.map((p) => ({ ...p, value: p.value * scale }))
    totalReal = real.reduce((a, b) => a + b.value, 0)
  }
  const fulfillmentPct = totalPromise > 0 ? Math.round((totalReal / totalPromise) * 100) : 0

  return {
    window: { from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z', label: 'Año 2026' },
    unit: 'kWh',
    promise,
    real,
    fulfillmentPct,
  }
}

export function buildResidentialSnapshot(params: ScenarioParams): ResidentialSnapshot {
  const s = params.scale
  return {
    clientName: 'Camila',
    plantName: 'Casa · Chapinero',
    today: {
      kwh: Math.round(18.6 * s * 10) / 10,
      savingsCop: Math.round(14_220 * s),
      co2KgAvoided: Math.round(8.9 * s * 10) / 10,
      vsPromisePct: Math.min(130, Math.round(112 + (s - 1) * 15)),
    },
    cumulative: {
      kwh: Math.round(3_240 * s),
      savingsCop: Math.round(2_548_900 * s),
      co2KgAvoided: Math.round(1_520 * s),
      treesEquivalent: Math.max(1, Math.round(72 * s)),
    },
    technicianNotice: {
      technicianName: 'Daniel Ríos',
      visitWindow: 'Jueves 23 abr · 09:30 – 11:00',
      status: 'scheduled',
    },
  }
}

export function buildPerformanceSummary(pvr: PromiseVsReal, params: ScenarioParams): PerformanceSummary {
  const s = params.scale
  const fulfillFactor = Math.min(1.2, pvr.fulfillmentPct / 100)
  return {
    monthGenerationKwh: Math.round(486.4 * s * fulfillFactor * 10) / 10,
    monthSavingsCop: Math.round(364_800 * s * fulfillFactor),
    monthPerformancePct: Math.min(130, Math.round(pvr.fulfillmentPct)),
    weekGenerationKwh: Math.round(126.9 * s * 10) / 10,
    efficiencyNote:
      pvr.fulfillmentPct >= 100
        ? 'Tu sistema está rindiendo por encima del promedio del sector residencial.'
        : 'La generación está por debajo de la promesa en esta ventana; revisa sombras o suciedad del panel.',
  }
}

/** Valor de ejemplo ~ potencia activa (kW), misma magnitud con distintas claves según «marca». */
const DEMO_KW = 2.45

export function buildRawAliasDemo(profile: AliasProfileId): {
  ts: string
  values: Record<string, number | string>
  note: string
} {
  const ts = '2026-04-18T12:00:00Z'
  switch (profile) {
    case 'pac':
      return {
        ts,
        values: { Pac: DEMO_KW },
        note: 'Estilo portal Huawei/Growatt: clave «Pac».',
      }
    case 'active_power':
      return {
        ts,
        values: { ActivePower: DEMO_KW },
        note: 'Etiqueta genérica ActivePower.',
      }
    case 'p_total':
      return {
        ts,
        values: { P_total: DEMO_KW },
        note: 'Sufijo _total frecuente en agregados.',
      }
    default:
      return {
        ts,
        values: { p_active_kw: DEMO_KW },
        note: 'Magnitud ya canónica (referencia).',
      }
  }
}

export type NaturalBundle = {
  snapshot: ResidentialSnapshot
  promiseVsReal: PromiseVsReal
  performanceSummary: PerformanceSummary
}

export function buildNaturalBundle(params: ScenarioParams): NaturalBundle {
  const promiseVsReal = buildPromiseVsReal(params)
  return {
    snapshot: buildResidentialSnapshot(params),
    promiseVsReal,
    performanceSummary: buildPerformanceSummary(promiseVsReal, params),
  }
}

/** Respuesta HTTP alineada con extensión mock sobre GET /stats/{client_id}. */
export type MockStatsResponse = {
  client_id: string
  window: { from: string; to: string }
  natural: NaturalBundle
  /** Demostración de lectura cruda heterogénea (ver docs/API_SPEC RawReading). */
  raw_alias_demo: ReturnType<typeof buildRawAliasDemo>
  scenario: ScenarioParams
}

export function buildMockStatsResponse(clientId: string, params: ScenarioParams): MockStatsResponse {
  const natural = buildNaturalBundle(params)
  return {
    client_id: clientId,
    window: { from: '2026-04-01T00:00:00Z', to: '2026-04-18T23:59:59Z' },
    natural,
    raw_alias_demo: buildRawAliasDemo(params.profile),
    scenario: { ...params },
  }
}
