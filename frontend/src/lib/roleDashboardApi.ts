import {
  getCorporateKpis,
  getCorporateOverview,
  getCorporateRoi,
  getCorporateTickets,
  getFieldPreventiveTasks,
  getFieldTelemetry,
  getFieldVisits,
  type CorporateKpiRow,
  type CorporateOverview,
  type CorporateRoiPoint,
  type CorporateTicket,
  type FieldPreventiveTask,
  type FieldTelemetry,
  type FieldVisit,
} from './fieldAndCorporateMockData'
import {
  getPlantById,
  getFaultsByZone,
  getFleetPlants,
  getScheduleRows,
  getTechnicians,
  getWarRoomAlerts,
  type FaultsByZoneResponse,
  type FleetPlant,
  type MaintenanceScheduleRow,
  type TechnicianProfile,
  type WarRoomAlert,
} from './operationsMockData'
import { appendSimulationContextParams } from './simulationContext'
import { supabase } from './supabaseClient'

export type {
  FieldPreventiveTask,
  FieldTelemetry,
  FieldVisit,
} from './fieldAndCorporateMockData'
export type {
  MaintenanceScheduleRow,
  TechnicianProfile,
  TechnicianStatus,
} from './operationsMockData'

export type OperationsCoreData = {
  plants: FleetPlant[]
  alerts: WarRoomAlert[]
}

export type CorporateCoreData = {
  overview: CorporateOverview
  roi: CorporateRoiPoint[]
  kpis: CorporateKpiRow[]
  tickets: CorporateTicket[]
}

export type TechnicianCoreData = {
  visits: FieldVisit[]
  telemetry: FieldTelemetry[]
  preventiveTasks: FieldPreventiveTask[]
}

export type MaintenanceMutationMode = 'remote' | 'fallback'

export type MaintenanceRescheduleInput = {
  nextScheduledAt: string
  problemSummary?: string
  assignedProfileId?: string | null
}

export type MaintenanceCancelInput = {
  reason?: string
}

export type MaintenanceCompleteInput = {
  maintenanceId: string
  notes?: string
  checklist?: string[]
  evidence?: string[]
}

export type MaintenanceReschedulePayload = {
  maintenance_id: string
  status: 'scheduled'
  next_scheduled_at: string
  problem_summary?: string
  assigned_profile_id?: string | null
}

export type MaintenanceCancelPayload = {
  maintenance_id: string
  status: 'cancelled'
  cancelled_at: string
  reason?: string
}

export type MaintenanceCompletePayload = {
  maintenance_id: string
  status: 'completed'
  completed_at: string
  notes?: string
  checklist?: string[]
  evidence?: string[]
}

export type MaintenanceMutationResult<T> = {
  mode: MaintenanceMutationMode
  payload: T
}

export type TechnicianTelemetrySnapshot = {
  id: string
  plant: string
  geozone: string
  status: 'online' | 'offline'
  source: 'live' | 'buffer'
  technician: string | null
  metrics: FieldTelemetry[]
}

export type OperationsPlantDetailData = {
  plant: FleetPlant
  alerts: WarRoomAlert[]
}

export type OperationsFaultsFilters = {
  geozone?: string
  client?: string
}

export type ComparisonPeriod = 'week' | 'month' | 'year'

export type CorporateElectricalComparisonRow = {
  period: ComparisonPeriod
  system: string
  powerFactor: number
  targetPowerFactor: number
  savingsCop: number
  energyKwh: number
}

function getRoleApiBaseUrl(): string | undefined {
  const base = import.meta.env.VITE_STATS_BASE_URL?.trim()
  return base || undefined
}

function appendRemoteContextQuery(endpoint: string, query?: URLSearchParams): string {
  const [path, existingQuery] = endpoint.split('?')
  const params = new URLSearchParams(existingQuery ?? '')
  if (query) {
    query.forEach((value, key) => {
      params.set(key, value)
    })
  }

  if (typeof window === 'undefined') {
    const queryString = params.toString()
    return queryString ? `${path}?${queryString}` : path
  }
  const remoteContext = new URLSearchParams()
  appendSimulationContextParams(remoteContext)
  remoteContext.forEach((value, key) => {
    params.set(key, value)
  })
  const queryString = params.toString()
  return queryString ? `${path}?${queryString}` : path
}

export function isRoleDashboardRemoteEnabled(): boolean {
  return Boolean(getRoleApiBaseUrl())
}

async function getAuthHeader(): Promise<HeadersInit | undefined> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

async function fetchRolePayload<T>(
  endpoint: string,
  isValid: (value: unknown) => value is T,
  query?: URLSearchParams,
): Promise<T | null> {
  const base = getRoleApiBaseUrl()
  if (!base) return null

  try {
    const endpointWithContext = appendRemoteContextQuery(endpoint, query)
    const url = `${base.replace(/\/$/, '')}${endpointWithContext}`
    const headers = await getAuthHeader()
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`roleDashboardApi: ${res.status} ${res.statusText}`)
    const body = (await res.json()) as unknown
    if (!isValid(body)) throw new Error('roleDashboardApi: invalid payload')
    return body
  } catch {
    return null
  }
}

async function fetchRoleCsv(
  endpoint: string,
  query?: URLSearchParams,
): Promise<{ filename: string; content: Blob } | null> {
  const base = getRoleApiBaseUrl()
  if (!base) return null

  try {
    const endpointWithContext = appendRemoteContextQuery(endpoint, query)
    const url = `${base.replace(/\/$/, '')}${endpointWithContext}`
    const headers = await getAuthHeader()
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`roleDashboardApi: ${res.status} ${res.statusText}`)
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/csv')) throw new Error('roleDashboardApi: invalid csv response')
    const disposition = res.headers.get('content-disposition') ?? ''
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'analytics-export.csv'
    return { filename, content: await res.blob() }
  } catch {
    return null
  }
}

async function mutateRolePayload<T>(
  endpoint: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>,
  isValid: (value: unknown) => value is T,
): Promise<T | null> {
  const base = getRoleApiBaseUrl()
  if (!base) return null

  try {
    const endpointWithContext = appendRemoteContextQuery(endpoint)
    const url = `${base.replace(/\/$/, '')}${endpointWithContext}`
    const authHeader = await getAuthHeader()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(authHeader ?? {}),
    }
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`roleDashboardApi: ${res.status} ${res.statusText}`)
    const payload = (await res.json()) as unknown
    if (!isValid(payload)) throw new Error('roleDashboardApi: invalid payload')
    return payload
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isComparisonPeriod(value: unknown): value is ComparisonPeriod {
  return value === 'week' || value === 'month' || value === 'year'
}

function isFleetPlantKpis(value: unknown): value is NonNullable<FleetPlant['kpis']> {
  if (!isRecord(value)) return false
  return isNumber(value.energyKwh) && isNumber(value.powerFactor) && isNumber(value.uptimePct)
}

function isFleetPlant(value: unknown): value is FleetPlant {
  if (!isRecord(value)) return false
  if (value.kpis !== undefined && !isFleetPlantKpis(value.kpis)) return false
  return (
    isString(value.id) &&
    isString(value.plantName) &&
    isString(value.clientName) &&
    isString(value.addressLine) &&
    isString(value.geozone) &&
    (value.status === 'ok' || value.status === 'warn' || value.status === 'critical') &&
    isString(value.lastMaintenanceAt) &&
    isString(value.nextScheduledAt) &&
    isNumber(value.activeAlerts)
  )
}

function isWarRoomAlert(value: unknown): value is WarRoomAlert {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    (value.type === 'arc_fault' ||
      value.type === 'breaker_fatigue' ||
      value.type === 'degradation' ||
      value.type === 'offline' ||
      value.type === 'out_of_range') &&
    (value.severity === 'info' || value.severity === 'warn' || value.severity === 'critical') &&
    isString(value.ts) &&
    isString(value.plantId) &&
    isString(value.plantName) &&
    isString(value.geozone) &&
    isString(value.summary) &&
    isString(value.suggestedTechnicianName)
  )
}

function isMaintenanceScheduleRow(value: unknown): value is MaintenanceScheduleRow {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.plant_name) &&
    isString(value.client_name) &&
    isString(value.address_line) &&
    (value.last_maintenance_at === null || isString(value.last_maintenance_at)) &&
    (value.next_scheduled_at === null || isString(value.next_scheduled_at)) &&
    isString(value.problem_summary) &&
    isString(value.geozone) &&
    (value.assigned_technician === undefined ||
      value.assigned_technician === null ||
      isString(value.assigned_technician))
  )
}

function isTechnicianProfile(value: unknown): value is TechnicianProfile {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.full_name) &&
    isString(value.geozone) &&
    isString(value.phone) &&
    (value.status === 'active' || value.status === 'busy' || value.status === 'offline')
  )
}

function isFieldVisit(value: unknown): value is FieldVisit {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.plant) &&
    isString(value.address) &&
    isString(value.geozone) &&
    isString(value.window) &&
    isString(value.ticketId) &&
    isString(value.problemSummary) &&
    (value.priority === 'alta' || value.priority === 'media' || value.priority === 'baja')
  )
}

function isFieldTelemetry(value: unknown): value is FieldTelemetry {
  if (!isRecord(value)) return false
  return (
    isString(value.label) &&
    isString(value.value) &&
    (value.source === 'live' || value.source === 'buffer')
  )
}

function isFieldPreventiveTask(value: unknown): value is FieldPreventiveTask {
  if (!isRecord(value)) return false
  return (
    isString(value.id) &&
    isString(value.title) &&
    (value.state === 'pendiente' || value.state === 'realizada') &&
    isBoolean(value.critical)
  )
}

function isCorporateElectricalComparisonRow(value: unknown): value is CorporateElectricalComparisonRow {
  if (!isRecord(value)) return false
  return (
    isComparisonPeriod(value.period) &&
    isString(value.system) &&
    isNumber(value.powerFactor) &&
    isNumber(value.targetPowerFactor) &&
    isNumber(value.savingsCop) &&
    isNumber(value.energyKwh)
  )
}

function isMaintenanceReschedulePayload(value: unknown): value is MaintenanceReschedulePayload {
  if (!isRecord(value)) return false
  return (
    isString(value.maintenance_id) &&
    value.status === 'scheduled' &&
    isString(value.next_scheduled_at) &&
    (value.problem_summary === undefined || isString(value.problem_summary)) &&
    (value.assigned_profile_id === undefined ||
      value.assigned_profile_id === null ||
      isString(value.assigned_profile_id))
  )
}

function isMaintenanceCancelPayload(value: unknown): value is MaintenanceCancelPayload {
  if (!isRecord(value)) return false
  return (
    isString(value.maintenance_id) &&
    value.status === 'cancelled' &&
    isString(value.cancelled_at) &&
    (value.reason === undefined || isString(value.reason))
  )
}

function isMaintenanceCompletePayload(value: unknown): value is MaintenanceCompletePayload {
  if (!isRecord(value)) return false
  return (
    isString(value.maintenance_id) &&
    value.status === 'completed' &&
    isString(value.completed_at) &&
    (value.notes === undefined || isString(value.notes)) &&
    (value.checklist === undefined || (isArray(value.checklist) && value.checklist.every(isString))) &&
    (value.evidence === undefined || (isArray(value.evidence) && value.evidence.every(isString)))
  )
}

function isOperationsPlantDetailData(value: unknown): value is OperationsPlantDetailData {
  if (!isRecord(value)) return false
  return isFleetPlant(value.plant) && isArray(value.alerts) && value.alerts.every(isWarRoomAlert)
}

function isFleetPlantArray(value: unknown): value is FleetPlant[] {
  return isArray(value) && value.every(isFleetPlant)
}

function isWarRoomAlertArray(value: unknown): value is WarRoomAlert[] {
  return isArray(value) && value.every(isWarRoomAlert)
}

function isMaintenanceScheduleArray(value: unknown): value is MaintenanceScheduleRow[] {
  return isArray(value) && value.every(isMaintenanceScheduleRow)
}

function isFaultsByZoneResponse(value: unknown): value is FaultsByZoneResponse {
  if (!isRecord(value)) return false
  if (!isRecord(value.window) || !isArray(value.buckets)) return false
  if (!isString(value.window.from) || !isString(value.window.to)) return false

  return value.buckets.every((bucket) => {
    if (!isRecord(bucket)) return false
    if (!isString(bucket.geozone) || !isNumber(bucket.fault_count)) return false
    if (bucket.normalized_rate !== undefined && !isNumber(bucket.normalized_rate)) return false
    if (!isArray(bucket.fault_types)) return false

    return bucket.fault_types.every((faultType) => {
      if (!isRecord(faultType)) return false
      return (
        (faultType.type === 'arc_fault' ||
          faultType.type === 'breaker_fatigue' ||
          faultType.type === 'degradation' ||
          faultType.type === 'offline' ||
          faultType.type === 'out_of_range') &&
        isNumber(faultType.count)
      )
    })
  })
}

function isTechniciansArray(value: unknown): value is TechnicianProfile[] {
  return isArray(value) && value.every(isTechnicianProfile)
}

function isFieldVisitsArray(value: unknown): value is FieldVisit[] {
  return isArray(value) && value.every(isFieldVisit)
}

function isFieldTelemetryArray(value: unknown): value is FieldTelemetry[] {
  return isArray(value) && value.every(isFieldTelemetry)
}

function isFieldPreventiveTaskArray(value: unknown): value is FieldPreventiveTask[] {
  return isArray(value) && value.every(isFieldPreventiveTask)
}

function isCorporateElectricalComparisonArray(value: unknown): value is CorporateElectricalComparisonRow[] {
  return isArray(value) && value.every(isCorporateElectricalComparisonRow)
}

function toFaultsFilterQuery(filters?: OperationsFaultsFilters): URLSearchParams | undefined {
  if (!filters) return undefined
  const query = new URLSearchParams()
  if (filters.geozone) query.set('geozone', filters.geozone)
  if (filters.client) {
    query.set('client', filters.client)
    query.set('client_id', filters.client)
    query.set('client_name', filters.client)
  }
  return query.size ? query : undefined
}

function applyFaultsFallbackFilters(
  payload: FaultsByZoneResponse,
  filters?: OperationsFaultsFilters,
): FaultsByZoneResponse {
  if (!filters?.geozone) return payload
  return {
    window: payload.window,
    buckets: payload.buckets.filter((bucket) => bucket.geozone === filters.geozone),
  }
}

export function getOperationsCoreFallback(): OperationsCoreData {
  return {
    plants: getFleetPlants(),
    alerts: getWarRoomAlerts(),
  }
}

export function getOperationsScheduleFallback(): MaintenanceScheduleRow[] {
  return getScheduleRows()
}

export function getOperationsFaultsByZoneFallback(): FaultsByZoneResponse {
  return getFaultsByZone()
}

export function getOperationsTechniciansFallback(): TechnicianProfile[] {
  return getTechnicians()
}

export function getCorporateCoreFallback(): CorporateCoreData {
  return {
    overview: getCorporateOverview(),
    roi: getCorporateRoi(),
    kpis: getCorporateKpis(),
    tickets: getCorporateTickets(),
  }
}

export function getCorporateElectricalComparisonFallback(): CorporateElectricalComparisonRow[] {
  return [
    {
      period: 'week',
      system: 'Sistema A',
      powerFactor: 0.92,
      targetPowerFactor: 0.95,
      savingsCop: 640000,
      energyKwh: 7820,
    },
    {
      period: 'week',
      system: 'Sistema B',
      powerFactor: 0.87,
      targetPowerFactor: 0.95,
      savingsCop: 518000,
      energyKwh: 7310,
    },
    {
      period: 'month',
      system: 'Sistema A',
      powerFactor: 0.94,
      targetPowerFactor: 0.95,
      savingsCop: 2480000,
      energyKwh: 31240,
    },
    {
      period: 'month',
      system: 'Sistema B',
      powerFactor: 0.89,
      targetPowerFactor: 0.95,
      savingsCop: 2010000,
      energyKwh: 28460,
    },
    {
      period: 'year',
      system: 'Sistema A',
      powerFactor: 0.95,
      targetPowerFactor: 0.95,
      savingsCop: 28600000,
      energyKwh: 382200,
    },
    {
      period: 'year',
      system: 'Sistema B',
      powerFactor: 0.9,
      targetPowerFactor: 0.95,
      savingsCop: 24100000,
      energyKwh: 350800,
    },
  ]
}

export function getTechnicianCoreFallback(): TechnicianCoreData {
  return {
    visits: getFieldVisits(),
    telemetry: getFieldTelemetry(),
    preventiveTasks: getFieldPreventiveTasks(),
  }
}

export function getTechnicianAgendaFallback(): MaintenanceScheduleRow[] {
  return getOperationsScheduleFallback()
}

export function getOperationsPlantDetailFallback(
  plantId: string,
): OperationsPlantDetailData | null {
  const plant = getPlantById(plantId)
  if (!plant) return null
  const alerts = getWarRoomAlerts().filter((alert) => alert.plantId === plant.id)
  return { plant, alerts }
}

export async function fetchOperationsCoreData(): Promise<OperationsCoreData> {
  const [plants, alerts] = await Promise.all([
    fetchRolePayload('/operations/fleet', isFleetPlantArray),
    fetchRolePayload('/operations/war-room', isWarRoomAlertArray),
  ])
  const fallback = getOperationsCoreFallback()
  return {
    plants: plants ?? fallback.plants,
    alerts: alerts ?? fallback.alerts,
  }
}

export async function fetchCorporateCoreData(): Promise<CorporateCoreData> {
  const [overview, roi, kpis, tickets] = await Promise.all([
    fetchRolePayload('/corporate/overview', (value): value is CorporateOverview => isRecord(value)),
    fetchRolePayload('/corporate/roi', (value): value is CorporateRoiPoint[] => isArray(value)),
    fetchRolePayload('/corporate/kpis', (value): value is CorporateKpiRow[] => isArray(value)),
    fetchRolePayload('/corporate/tickets', (value): value is CorporateTicket[] => isArray(value)),
  ])
  const fallback = getCorporateCoreFallback()
  return {
    overview: overview ?? fallback.overview,
    roi: roi ?? fallback.roi,
    kpis: kpis ?? fallback.kpis,
    tickets: tickets ?? fallback.tickets,
  }
}

export async function fetchTechnicianCoreData(): Promise<TechnicianCoreData> {
  const [visits, telemetry, preventiveTasks] = await Promise.all([
    fetchTechnicianVisitsData(),
    fetchTechnicianTelemetryData(),
    fetchTechnicianPreventiveTasksData(),
  ])
  return {
    visits,
    telemetry,
    preventiveTasks,
  }
}

export async function fetchOperationsPlantDetailData(
  plantId: string,
): Promise<OperationsPlantDetailData | null> {
  const remote = await fetchRolePayload(`/operations/plants/${plantId}`, isOperationsPlantDetailData)
  return remote ?? getOperationsPlantDetailFallback(plantId)
}

export async function fetchOperationsWarRoomData(): Promise<WarRoomAlert[]> {
  const remote = await fetchRolePayload('/operations/war-room', isWarRoomAlertArray)
  return remote ?? getOperationsCoreFallback().alerts
}

export async function fetchOperationsScheduleData(): Promise<MaintenanceScheduleRow[]> {
  const remote = await fetchRolePayload('/operations/schedule', isMaintenanceScheduleArray)
  return remote ?? getOperationsScheduleFallback()
}

export async function fetchOperationsFaultsByZoneData(
  filters?: OperationsFaultsFilters,
): Promise<FaultsByZoneResponse> {
  const remote = await fetchRolePayload('/analytics/faults-by-zone', isFaultsByZoneResponse, toFaultsFilterQuery(filters))
  if (remote) return remote
  return applyFaultsFallbackFilters(getOperationsFaultsByZoneFallback(), filters)
}

export async function exportOperationsFaultsByZoneCsv(
  filters?: OperationsFaultsFilters,
): Promise<{ filename: string; content: Blob } | null> {
  const query = toFaultsFilterQuery(filters)
  const remote =
    (await fetchRoleCsv('/analytics/faults-by-zone/export.csv', query)) ??
    (await fetchRoleCsv('/analytics/faults-by-zone?format=csv', query))
  return remote
}

export async function fetchOperationsTechniciansData(): Promise<TechnicianProfile[]> {
  const remote = await fetchRolePayload('/operations/technicians', isTechniciansArray)
  return remote ?? getOperationsTechniciansFallback()
}

export async function fetchTechnicianVisitsData(): Promise<FieldVisit[]> {
  const remote = await fetchRolePayload('/technician/visits', isFieldVisitsArray)
  return remote ?? getTechnicianCoreFallback().visits
}

export async function fetchTechnicianAgendaData(): Promise<MaintenanceScheduleRow[]> {
  const remote = await fetchRolePayload('/maintenance/schedule', isMaintenanceScheduleArray)
  return remote ?? getTechnicianAgendaFallback()
}

export async function fetchTechnicianTelemetryData(): Promise<FieldTelemetry[]> {
  const remote = await fetchRolePayload('/technician/telemetry', isFieldTelemetryArray)
  return remote ?? getTechnicianCoreFallback().telemetry
}

export async function fetchTechnicianPreventiveTasksData(): Promise<FieldPreventiveTask[]> {
  const remote = await fetchRolePayload('/technician/preventive-tasks', isFieldPreventiveTaskArray)
  return remote ?? getTechnicianCoreFallback().preventiveTasks
}

function nowIso(): string {
  return new Date().toISOString()
}

export async function rescheduleTechnicianMaintenance(
  maintenanceId: string,
  input: MaintenanceRescheduleInput,
): Promise<MaintenanceMutationResult<MaintenanceReschedulePayload>> {
  const remote = await mutateRolePayload(
    `/maintenances/${maintenanceId}`,
    'PATCH',
    {
      next_scheduled_at: input.nextScheduledAt,
      problem_summary: input.problemSummary,
      assigned_profile_id: input.assignedProfileId,
    },
    isMaintenanceReschedulePayload,
  )
  if (remote) return { mode: 'remote', payload: remote }
  return {
    mode: 'fallback',
    payload: {
      maintenance_id: maintenanceId,
      status: 'scheduled',
      next_scheduled_at: input.nextScheduledAt,
      problem_summary: input.problemSummary,
      assigned_profile_id: input.assignedProfileId,
    },
  }
}

export async function cancelTechnicianMaintenance(
  maintenanceId: string,
  input: MaintenanceCancelInput,
): Promise<MaintenanceMutationResult<MaintenanceCancelPayload>> {
  const remote = await mutateRolePayload(
    `/maintenances/${maintenanceId}/cancel`,
    'POST',
    {
      reason: input.reason,
    },
    isMaintenanceCancelPayload,
  )
  if (remote) return { mode: 'remote', payload: remote }
  return {
    mode: 'fallback',
    payload: {
      maintenance_id: maintenanceId,
      status: 'cancelled',
      cancelled_at: nowIso(),
      reason: input.reason,
    },
  }
}

export async function completeTechnicianMaintenance(
  input: MaintenanceCompleteInput,
): Promise<MaintenanceMutationResult<MaintenanceCompletePayload>> {
  const remote = await mutateRolePayload(
    '/maintenance/complete',
    'POST',
    {
      maintenance_id: input.maintenanceId,
      notes: input.notes,
      checklist: input.checklist,
      evidence: input.evidence,
    },
    isMaintenanceCompletePayload,
  )
  if (remote) return { mode: 'remote', payload: remote }
  return {
    mode: 'fallback',
    payload: {
      maintenance_id: input.maintenanceId,
      status: 'completed',
      completed_at: nowIso(),
      notes: input.notes,
      checklist: input.checklist,
      evidence: input.evidence,
    },
  }
}

export async function fetchTechnicianTelemetrySnapshotData(): Promise<TechnicianTelemetrySnapshot[]> {
  const [visits, telemetry, technicians] = await Promise.all([
    fetchTechnicianVisitsData(),
    fetchTechnicianTelemetryData(),
    fetchOperationsTechniciansData(),
  ])

  const liveAvailable = telemetry.some((item) => item.source === 'live')
  return visits.map((visit) => {
    const zoneTechnicians = technicians.filter((tech) => tech.geozone === visit.geozone)
    const hasConnectedTechnician = zoneTechnicians.some((tech) => tech.status !== 'offline')
    const status: 'online' | 'offline' = liveAvailable && hasConnectedTechnician ? 'online' : 'offline'
    return {
      id: visit.id,
      plant: visit.plant,
      geozone: visit.geozone,
      status,
      source: status === 'online' ? 'live' : 'buffer',
      technician: zoneTechnicians[0]?.full_name ?? null,
      metrics: telemetry,
    }
  })
}

export async function fetchCorporateElectricalComparisonData(): Promise<CorporateElectricalComparisonRow[]> {
  const remote = await fetchRolePayload(
    '/corporate/electrical-comparison',
    isCorporateElectricalComparisonArray,
  )
  return remote ?? getCorporateElectricalComparisonFallback()
}
