export type FleetPlantStatus = 'ok' | 'warn' | 'critical'

export type FleetPlant = {
  id: string
  plantName: string
  clientName: string
  addressLine: string
  geozone: string
  status: FleetPlantStatus
  lastMaintenanceAt: string
  nextScheduledAt: string
  activeAlerts: number
  kpis?: {
    energyKwh: number
    powerFactor: number
    uptimePct: number
  }
}

export type AlertSeverity = 'info' | 'warn' | 'critical'

export type WarRoomAlert = {
  id: string
  type: 'arc_fault' | 'breaker_fatigue' | 'degradation' | 'offline' | 'out_of_range'
  severity: AlertSeverity
  ts: string
  plantId: string
  plantName: string
  geozone: string
  summary: string
  suggestedTechnicianName: string
}

export type MaintenanceScheduleRow = {
  id: string
  plant_name: string
  client_name: string
  address_line: string
  last_maintenance_at: string | null
  next_scheduled_at: string | null
  problem_summary: string
  geozone: string
  assigned_technician: string | null
}

export type TechnicianStatus = 'active' | 'busy' | 'offline'

export type TechnicianProfile = {
  id: string
  full_name: string
  geozone: string
  phone: string
  status: TechnicianStatus
}

export type FaultsByZoneResponse = {
  window: {
    from: string
    to: string
  }
  buckets: Array<{
    geozone: string
    fault_count: number
    normalized_rate?: number
    fault_types: Array<{
      type: WarRoomAlert['type']
      count: number
    }>
  }>
}

const fleetPlants: FleetPlant[] = [
  {
    id: 'plant-lagos-1',
    plantName: 'Planta Lagos Norte',
    clientName: 'Alimentos Andina',
    addressLine: 'Calle 120 #18-44, Bogota',
    geozone: 'Zona Norte',
    status: 'critical',
    lastMaintenanceAt: '2026-04-04T09:00:00Z',
    nextScheduledAt: '2026-04-20T14:00:00Z',
    activeAlerts: 3,
  },
  {
    id: 'plant-sur-2',
    plantName: 'Parque Solar Sur',
    clientName: 'Textiles Capital',
    addressLine: 'Carrera 49 #7-20, Cali',
    geozone: 'Zona Sur',
    status: 'warn',
    lastMaintenanceAt: '2026-04-10T11:30:00Z',
    nextScheduledAt: '2026-04-24T10:00:00Z',
    activeAlerts: 1,
  },
  {
    id: 'plant-centro-3',
    plantName: 'Centro Logistico TR',
    clientName: 'Logistica Delta',
    addressLine: 'Av 6N #33-90, Medellin',
    geozone: 'Zona Centro',
    status: 'ok',
    lastMaintenanceAt: '2026-04-15T08:00:00Z',
    nextScheduledAt: '2026-05-02T08:30:00Z',
    activeAlerts: 0,
  },
]

const warRoomAlerts: WarRoomAlert[] = [
  {
    id: 'alert-arc-001',
    type: 'arc_fault',
    severity: 'critical',
    ts: '2026-04-18T10:04:00Z',
    plantId: 'plant-lagos-1',
    plantName: 'Planta Lagos Norte',
    geozone: 'Zona Norte',
    summary: 'Arco electrico detectado en string S2 durante 14s',
    suggestedTechnicianName: 'Camilo Rojas',
  },
  {
    id: 'alert-breaker-002',
    type: 'breaker_fatigue',
    severity: 'warn',
    ts: '2026-04-18T09:10:00Z',
    plantId: 'plant-sur-2',
    plantName: 'Parque Solar Sur',
    geozone: 'Zona Sur',
    summary: 'Patron de fatiga en breaker principal (12 eventos/48h)',
    suggestedTechnicianName: 'Luisa Leon',
  },
  {
    id: 'alert-offline-003',
    type: 'offline',
    severity: 'info',
    ts: '2026-04-18T08:20:00Z',
    plantId: 'plant-centro-3',
    plantName: 'Centro Logistico TR',
    geozone: 'Zona Centro',
    summary: 'Gateway de telemetria con perdida intermitente',
    suggestedTechnicianName: 'Andres Pava',
  },
]

const scheduleRows: MaintenanceScheduleRow[] = [
  {
    id: 'mnt-1001',
    plant_name: 'Planta Lagos Norte',
    client_name: 'Alimentos Andina',
    address_line: 'Calle 120 #18-44, Bogota',
    last_maintenance_at: '2026-04-04T09:00:00Z',
    next_scheduled_at: '2026-04-20T14:00:00Z',
    problem_summary: 'Arco electrico recurrente en string S2',
    geozone: 'Zona Norte',
    assigned_technician: 'Camilo Rojas',
  },
  {
    id: 'mnt-1002',
    plant_name: 'Parque Solar Sur',
    client_name: 'Textiles Capital',
    address_line: 'Carrera 49 #7-20, Cali',
    last_maintenance_at: '2026-04-10T11:30:00Z',
    next_scheduled_at: '2026-04-24T10:00:00Z',
    problem_summary: 'Revisar breaker principal y termografia',
    geozone: 'Zona Sur',
    assigned_technician: 'Luisa Leon',
  },
  {
    id: 'mnt-1003',
    plant_name: 'Centro Logistico TR',
    client_name: 'Logistica Delta',
    address_line: 'Av 6N #33-90, Medellin',
    last_maintenance_at: '2026-04-15T08:00:00Z',
    next_scheduled_at: '2026-05-02T08:30:00Z',
    problem_summary: 'Inspeccion preventiva mensual',
    geozone: 'Zona Centro',
    assigned_technician: 'Andres Pava',
  },
]

const technicians: TechnicianProfile[] = [
  {
    id: 'tech-001',
    full_name: 'Camilo Rojas',
    geozone: 'Zona Norte',
    phone: '+57 300 100 2201',
    status: 'busy',
  },
  {
    id: 'tech-002',
    full_name: 'Luisa Leon',
    geozone: 'Zona Sur',
    phone: '+57 300 100 2202',
    status: 'active',
  },
  {
    id: 'tech-003',
    full_name: 'Andres Pava',
    geozone: 'Zona Centro',
    phone: '+57 300 100 2203',
    status: 'active',
  },
]

const faultsByZone: FaultsByZoneResponse = {
  window: {
    from: '2026-04-01T00:00:00Z',
    to: '2026-04-18T23:59:59Z',
  },
  buckets: [
    {
      geozone: 'Zona Norte',
      fault_count: 14,
      normalized_rate: 2.7,
      fault_types: [
        { type: 'arc_fault', count: 7 },
        { type: 'breaker_fatigue', count: 3 },
        { type: 'degradation', count: 2 },
        { type: 'offline', count: 1 },
        { type: 'out_of_range', count: 1 },
      ],
    },
    {
      geozone: 'Zona Sur',
      fault_count: 9,
      normalized_rate: 1.6,
      fault_types: [
        { type: 'arc_fault', count: 2 },
        { type: 'breaker_fatigue', count: 3 },
        { type: 'degradation', count: 2 },
        { type: 'offline', count: 1 },
        { type: 'out_of_range', count: 1 },
      ],
    },
    {
      geozone: 'Zona Centro',
      fault_count: 4,
      normalized_rate: 0.8,
      fault_types: [
        { type: 'arc_fault', count: 0 },
        { type: 'breaker_fatigue', count: 1 },
        { type: 'degradation', count: 1 },
        { type: 'offline', count: 1 },
        { type: 'out_of_range', count: 1 },
      ],
    },
  ],
}

export function getFleetPlants(): FleetPlant[] {
  return fleetPlants
}

export function getPlantById(plantId: string): FleetPlant | null {
  return fleetPlants.find((plant) => plant.id === plantId) ?? null
}

export function getWarRoomAlerts(): WarRoomAlert[] {
  return [...warRoomAlerts].sort((a, b) => {
    if (a.severity === b.severity) return b.ts.localeCompare(a.ts)
    const order: Record<AlertSeverity, number> = { critical: 3, warn: 2, info: 1 }
    return order[b.severity] - order[a.severity]
  })
}

export function getScheduleRows(): MaintenanceScheduleRow[] {
  return scheduleRows.map((row) => ({ ...row }))
}

export function getFaultsByZone(): FaultsByZoneResponse {
  return faultsByZone
}

export function getTechnicians(): TechnicianProfile[] {
  return technicians.map((tech) => ({ ...tech }))
}
