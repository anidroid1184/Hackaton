import {
  getCorporateKpis,
  getCorporateOverview,
  getCorporateRoi,
  getCorporateTickets,
  getFieldPreventiveTasks,
  getFieldTelemetry,
  getFieldVisits,
} from '../../frontend/src/lib/fieldAndCorporateMockData.ts'
import {
  getFaultsByZone,
  getFleetPlants,
  getPlantById,
  getScheduleRows,
  getTechnicians,
  getWarRoomAlerts,
} from '../../frontend/src/lib/operationsMockData.ts'
import type { AliasProfileId } from '../../frontend/src/lib/residentialGenerators.ts'
import { rounded, type SimulationParams } from './simulationParams.ts'

function scenarioFactor(scenario: string): number {
  if (scenario === 'stress') return 1.35
  if (scenario === 'recovery') return 0.7
  if (scenario === 'night') return 0.4
  return 1
}

function riskFactor(params: SimulationParams): number {
  if (params.faultMode === 'degraded') return 1.3
  if (params.faultMode === 'offline') return 1.8
  if (params.faultMode === 'spikes') return 1.45
  return 1
}

/**
 * Desfase por `phase` en [0,1]. Neutro (0) a phase=0 para preservar contratos
 * existentes. Amplitud ±0.15 para que deslizar el slider mueva visiblemente
 * los payloads.
 */
function phaseShift(phase: number): number {
  if (!Number.isFinite(phase)) return 0
  return 0.15 * Math.sin(2 * Math.PI * phase)
}

/**
 * Multiplicador por perfil de alias (0.95..1.05). 'canonical' = 1 para no
 * afectar escenarios donde no se fija perfil.
 */
function profileBias(profile: AliasProfileId): number {
  switch (profile) {
    case 'pac':
      return 1.05
    case 'active_power':
      return 0.97
    case 'p_total':
      return 1.02
    case 'canonical':
    default:
      return 1
  }
}

function baselineFactor(params: SimulationParams): number {
  const scenario = scenarioFactor(params.scenario)
  const profile = profileBias(params.profile)
  return params.scale * scenario * profile * (1 + phaseShift(params.phase))
}

function incidentFactor(params: SimulationParams): number {
  return baselineFactor(params) * riskFactor(params)
}

const DEFAULT_FLEET_KPIS = { energyKwh: 300, powerFactor: 0.93, uptimePct: 97.5 } as const

function getAdjustedFleetPlant(
  plant: ReturnType<typeof getFleetPlants>[number],
  params: SimulationParams,
  risk: number,
) {
  const phaseBoost = phaseShift(params.phase)
  const baseKpis = plant.kpis ?? { ...DEFAULT_FLEET_KPIS }
  const kpis =
    params.scenario === 'stress'
      ? {
          energyKwh: baseKpis.energyKwh,
          powerFactor: Number((baseKpis.powerFactor * 0.85).toFixed(3)),
          uptimePct: Number(Math.max(80, baseKpis.uptimePct - 5).toFixed(1)),
        }
      : { ...baseKpis }

  const isDegraded = params.scenario === 'degraded' || params.faultMode !== 'none'
  const adjustedAlerts = Math.max(
    0,
    Math.round(plant.activeAlerts * risk + params.noise * 2 + phaseBoost * 3),
  )

  return {
    ...plant,
    kpis,
    activeAlerts: isDegraded ? adjustedAlerts + 1 : adjustedAlerts,
    status:
      params.faultMode === 'offline'
        ? 'critical'
        : plant.activeAlerts * risk > 2
          ? 'critical'
          : plant.status,
  }
}

function getAdjustedWarRoomAlerts(params: SimulationParams) {
  const alerts = getWarRoomAlerts().map((alert) => ({
    ...alert,
    summary: params.scenario === 'stress' ? `${alert.summary} (stress test)` : alert.summary,
  }))

  if (params.faultMode === 'none') return alerts

  return [
    {
      id: `alert-sim-${Date.now()}`,
      type: params.faultMode === 'offline' ? 'offline' : 'out_of_range',
      severity: params.faultMode === 'degraded' ? 'warn' : 'critical',
      ts: new Date().toISOString(),
      plantId: alerts[0]?.plantId ?? 'plant-lagos-1',
      plantName: alerts[0]?.plantName ?? 'Planta Lagos Norte',
      geozone: alerts[0]?.geozone ?? 'Zona Norte',
      summary:
        params.faultMode === 'offline'
          ? 'Perdida de telemetria en gateway principal'
          : 'Evento simulado de variacion de potencia fuera de rango',
      suggestedTechnicianName: 'Equipo Simulacion',
    },
    ...alerts,
  ]
}

export function resolveMultiProfilePayload(pathname: string, params: SimulationParams): unknown | null {
  const base = baselineFactor(params)
  const risk = incidentFactor(params)
  const phaseOffset = phaseShift(params.phase)

  if (pathname === '/operations/fleet') {
    return getFleetPlants().map((plant) => getAdjustedFleetPlant(plant, params, risk))
  }

  const operationsPlantDetailMatch = pathname.match(/^\/operations\/plants\/([^/]+)\/?$/)
  if (operationsPlantDetailMatch) {
    const plantId = decodeURIComponent(operationsPlantDetailMatch[1] ?? '')
    const plant = getPlantById(plantId)
    if (!plant) return null

    return {
      plant: getAdjustedFleetPlant(plant, params, risk),
      alerts: getAdjustedWarRoomAlerts(params).filter((alert) => alert.plantId === plant.id),
    }
  }

  if (pathname === '/operations/war-room') {
    return getAdjustedWarRoomAlerts(params)
  }

  if (pathname === '/operations/schedule') {
    return getScheduleRows().map((row) => ({
      ...row,
      problem_summary:
        params.faultMode === 'none' ? row.problem_summary : `${row.problem_summary} · modo ${params.faultMode}`,
    }))
  }

  if (pathname === '/analytics/faults-by-zone') {
    const data = getFaultsByZone()
    return {
      ...data,
      buckets: data.buckets.map((bucket) => ({
        ...bucket,
        fault_count: Math.max(0, Math.round(bucket.fault_count * risk)),
        normalized_rate:
          typeof bucket.normalized_rate === 'number'
            ? rounded(bucket.normalized_rate * risk, 2)
            : bucket.normalized_rate,
        fault_types: bucket.fault_types.map((faultType) => ({
          ...faultType,
          count: Math.max(0, Math.round(faultType.count * risk)),
        })),
      })),
    }
  }

  if (pathname === '/operations/technicians') {
    return getTechnicians().map((tech, idx) => ({
      ...tech,
      status:
        params.faultMode === 'offline' && idx === 0
          ? 'offline'
          : params.faultMode === 'degraded' && idx === 0
            ? 'busy'
            : tech.status,
    }))
  }

  if (pathname === '/technician/visits') {
    return getFieldVisits().map((visit) => ({
      ...visit,
      problemSummary:
        params.faultMode === 'none' ? visit.problemSummary : `${visit.problemSummary} [${params.faultMode}]`,
    }))
  }

  if (pathname === '/technician/telemetry') {
    return getFieldTelemetry().map((item) => {
      if (!item.value.includes(' ')) return item
      const [rawValue, unit] = item.value.split(' ')
      const parsed = Number.parseFloat(rawValue)
      if (!Number.isFinite(parsed)) return item
      const adjusted = rounded(parsed * base + params.noise * 0.1 + phaseOffset, 2)
      return { ...item, value: `${adjusted} ${unit}` }
    })
  }

  if (pathname === '/technician/preventive-tasks') {
    return getFieldPreventiveTasks().map((task, idx) => ({
      ...task,
      state: params.faultMode === 'none' || idx !== 0 ? task.state : 'pendiente',
      critical: params.faultMode !== 'none' ? true : task.critical,
    }))
  }

  if (pathname === '/corporate/overview') {
    const overview = getCorporateOverview()
    return {
      ...overview,
      roiAccumulatedCop: Math.round(overview.roiAccumulatedCop * base),
      monthlySavingsCop: Math.round(overview.monthlySavingsCop * base),
      riskExposureCop: Math.round(overview.riskExposureCop * risk),
      compliancePct: Math.max(60, Math.min(98, Math.round(overview.compliancePct / risk))),
    }
  }

  if (pathname === '/corporate/roi') {
    return getCorporateRoi().map((point) => ({
      ...point,
      savingsCop: Math.round(point.savingsCop * base),
      targetCop: Math.round(point.targetCop * scenarioFactor(params.scenario)),
    }))
  }

  if (pathname === '/corporate/kpis') {
    return getCorporateKpis().map((kpi) => ({
      ...kpi,
      io: rounded(kpi.io * risk, 2),
      fp: rounded(Math.max(0.75, kpi.fp - params.noise * 0.08), 2),
      energyKwh: Math.round(kpi.energyKwh * base),
      status:
        params.faultMode === 'offline'
          ? 'critical'
          : params.faultMode === 'degraded' && kpi.status === 'ok'
            ? 'warn'
            : kpi.status,
    }))
  }

  if (pathname === '/corporate/tickets') {
    return getCorporateTickets().map((ticket) => ({
      ...ticket,
      impactCop: Math.round(ticket.impactCop * risk),
      slaHours: Math.max(4, Math.round(ticket.slaHours / Math.max(0.8, params.scale))),
    }))
  }

  return null
}
