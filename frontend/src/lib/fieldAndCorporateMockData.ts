export type CorporateRoiPoint = {
  month: string
  savingsCop: number
  targetCop: number
  /** Energía mensual objetivo contractual (kWh). */
  promisedKwh: number
  /** Energía mensual generada / medida en planta (kWh). */
  generatedKwh: number
}

export type CorporateKpiRow = {
  id: string
  plant: string
  vo: number
  io: number
  fp: number
  hz: number
  errorType: 'arc_fault' | 'degradation' | 'breaker_fatigue' | 'offline' | 'out_of_range'
  errorDetail: string
  energyKwh: number
  status: 'ok' | 'warn' | 'critical'
}

export type CorporateTicket = {
  id: string
  title: string
  state: 'abierto' | 'en_progreso' | 'cerrado'
  nextVisitAt: string | null
  slaHours: number
  impactCop: number
}

export type CorporateOverview = {
  roiAccumulatedCop: number
  paybackMonths: number
  monthlySavingsCop: number
  criticalPlants: number
  riskExposureCop: number
  openTickets: number
  compliancePct: number
}

export type FieldVisit = {
  id: string
  plant: string
  address: string
  geozone: string
  window: string
  ticketId: string
  problemSummary: string
  priority: 'alta' | 'media' | 'baja'
}

export type FieldTelemetry = {
  label: string
  value: string
  source: 'live' | 'buffer'
}

export type FieldPreventiveTask = {
  id: string
  title: string
  state: 'pendiente' | 'realizada'
  critical: boolean
}

export const CORPORATE_MONTH_LABELS = [
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
] as const

const _seasonalKwhFactor = [0.85, 0.88, 0.92, 0.95, 0.97, 0.99, 1, 0.99, 0.96, 0.93, 0.89, 0.86]

const corporateRoi: CorporateRoiPoint[] = CORPORATE_MONTH_LABELS.map((month, i) => {
  const baseKwh = 90000 * (_seasonalKwhFactor[i] ?? 1)
  const promisedKwh = Math.round(baseKwh * 0.95)
  const generatedKwh = Math.round(baseKwh * (0.98 + (i % 5) * 0.008))
  return {
    month,
    savingsCop: Math.round(4_200_000 + i * 280_000),
    targetCop: Math.round(3_900_000 + i * 150_000),
    promisedKwh,
    generatedKwh,
  }
})

function coerceCorporateRoiEnergy(p: CorporateRoiPoint): CorporateRoiPoint {
  const promised =
    typeof p.promisedKwh === 'number' && !Number.isNaN(p.promisedKwh) ? p.promisedKwh : 0
  const generated =
    typeof p.generatedKwh === 'number' && !Number.isNaN(p.generatedKwh) ? p.generatedKwh : 0
  return { ...p, promisedKwh: promised, generatedKwh: generated }
}

/** Asegura 12 puntos Ene–Dic (relleno con ceros si el API devuelve meses parciales). */
export function fillCorporateRoiToTwelveMonths(roi: CorporateRoiPoint[]): CorporateRoiPoint[] {
  const map = new Map(roi.map((p) => [p.month, coerceCorporateRoiEnergy(p)]))
  return CORPORATE_MONTH_LABELS.map((month) => {
    const existing = map.get(month)
    if (existing) return existing
    return {
      month,
      savingsCop: 0,
      targetCop: 0,
      promisedKwh: 0,
      generatedKwh: 0,
    }
  })
}

const corporateKpis: CorporateKpiRow[] = [
  {
    id: 'kpi-1',
    plant: 'Planta Norte',
    vo: 228,
    io: 17.2,
    fp: 0.96,
    hz: 60,
    energyKwh: 1320,
    errorType: 'out_of_range',
    errorDetail: 'Pico de corriente fuera de rango por 6m',
    status: 'ok',
  },
  {
    id: 'kpi-2',
    plant: 'Planta Sur',
    vo: 215,
    io: 16.3,
    fp: 0.89,
    hz: 59.8,
    energyKwh: 1180,
    errorType: 'breaker_fatigue',
    errorDetail: '12 disparos en 48h',
    status: 'warn',
  },
  {
    id: 'kpi-3',
    plant: 'Planta Centro',
    vo: 204,
    io: 15.9,
    fp: 0.81,
    hz: 59.7,
    energyKwh: 970,
    errorType: 'arc_fault',
    errorDetail: 'Arco detectado en string S2 con corte automatico',
    status: 'critical',
  },
]

const corporateTickets: CorporateTicket[] = [
  {
    id: 'tk-9001',
    title: 'Revision de string por sobretemperatura',
    state: 'en_progreso',
    nextVisitAt: '2026-04-22T09:30:00Z',
    slaHours: 8,
    impactCop: 580000,
  },
  {
    id: 'tk-9002',
    title: 'Validar caida de factor de potencia',
    state: 'abierto',
    nextVisitAt: '2026-04-23T14:00:00Z',
    slaHours: 24,
    impactCop: 340000,
  },
]

const corporateOverview: CorporateOverview = {
  roiAccumulatedCop: 7400000,
  paybackMonths: 26,
  monthlySavingsCop: 1480000,
  criticalPlants: 1,
  riskExposureCop: 920000,
  openTickets: 2,
  compliancePct: 87,
}

const fieldVisits: FieldVisit[] = [
  {
    id: 'fv-1',
    plant: 'Planta Lagos Norte',
    address: 'Calle 120 #18-44, Bogota',
    geozone: 'Zona Norte',
    window: '08:00 - 10:00',
    ticketId: 'tk-9001',
    problemSummary: 'Arco electrico en string S2',
    priority: 'alta',
  },
  {
    id: 'fv-2',
    plant: 'Parque Solar Sur',
    address: 'Carrera 49 #7-20, Cali',
    geozone: 'Zona Sur',
    window: '11:30 - 13:00',
    ticketId: 'tk-9002',
    problemSummary: 'Fatiga de breaker principal',
    priority: 'media',
  },
]

const fieldTelemetry: FieldTelemetry[] = [
  { label: 'Voltaje (Vo)', value: '224 V', source: 'live' },
  { label: 'Corriente (Io)', value: '16.8 A', source: 'live' },
  { label: 'Factor potencia (fp)', value: '0.93', source: 'live' },
  { label: 'Frecuencia (Hz)', value: '59.9 Hz', source: 'buffer' },
]

const fieldPreventiveTasks: FieldPreventiveTask[] = [
  { id: 'task-1', title: 'Inspeccionar aislamiento en string S2', state: 'pendiente', critical: true },
  { id: 'task-2', title: 'Prueba termografica en breaker principal', state: 'pendiente', critical: true },
  { id: 'task-3', title: 'Registro fotografico de tablero', state: 'realizada', critical: false },
]

export function getCorporateRoi(): CorporateRoiPoint[] {
  return corporateRoi
}

export function getCorporateKpis(): CorporateKpiRow[] {
  return corporateKpis
}

export function getCorporateTickets(): CorporateTicket[] {
  return corporateTickets
}

export function getCorporateOverview(): CorporateOverview {
  return corporateOverview
}

export function getFieldVisits(): FieldVisit[] {
  return fieldVisits
}

export function getFieldTelemetry(): FieldTelemetry[] {
  return fieldTelemetry
}

export function getFieldPreventiveTasks(): FieldPreventiveTask[] {
  return fieldPreventiveTasks
}
