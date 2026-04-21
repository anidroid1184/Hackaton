import {
  fetchOperationsScheduleData,
  type MaintenanceScheduleRow,
} from './roleDashboardApi'

export type AgendaStatus = 'scheduled' | 'suggested' | 'overdue' | 'completed'

export type ClientAgendaEntry = {
  id: string
  title: string
  date: string
  status: AgendaStatus
  summary: string
  location: string
  technician: string | null
}

const SUGGESTED_DAYS_THRESHOLD = 10

const fallbackAgenda: ClientAgendaEntry[] = [
  {
    id: 'fallback-scheduled',
    title: 'Mantenimiento confirmado',
    date: '2026-04-22T09:00:00Z',
    status: 'scheduled',
    summary: 'Visita de control general del sistema fotovoltaico.',
    location: 'Calle 120 #18-44, Bogota',
    technician: 'Camilo Rojas',
  },
  {
    id: 'fallback-suggested',
    title: 'Limpieza preventiva sugerida',
    date: '2026-04-29T10:30:00Z',
    status: 'suggested',
    summary: 'Se sugiere limpieza de paneles por baja de rendimiento en horas pico.',
    location: 'Carrera 49 #7-20, Cali',
    technician: null,
  },
  {
    id: 'fallback-overdue',
    title: 'Visita vencida',
    date: '2026-04-12T08:00:00Z',
    status: 'overdue',
    summary: 'La revisión de string S2 quedó pendiente y necesita reagendamiento.',
    location: 'Av 6N #33-90, Medellin',
    technician: 'Luisa Leon',
  },
  {
    id: 'fallback-completed',
    title: 'Mantenimiento completado',
    date: '2026-04-08T15:00:00Z',
    status: 'completed',
    summary: 'Cambio de conectores MC4 y validación térmica completada.',
    location: 'Calle 120 #18-44, Bogota',
    technician: 'Andres Pava',
  },
]

export function getClientAgendaFallback(): ClientAgendaEntry[] {
  return fallbackAgenda.map((entry) => ({ ...entry }))
}

export function mapMaintenanceRowsToClientAgenda(rows: MaintenanceScheduleRow[]): ClientAgendaEntry[] {
  const entries = rows.flatMap((row) => {
    const rowEntries: ClientAgendaEntry[] = []

    if (row.last_maintenance_at) {
      rowEntries.push({
        id: `${row.id}-completed`,
        title: `${row.plant_name}: mantenimiento completado`,
        date: row.last_maintenance_at,
        status: 'completed',
        summary: row.problem_summary,
        location: row.address_line,
        technician: row.assigned_technician,
      })
    }

    if (row.next_scheduled_at) {
      rowEntries.push({
        id: `${row.id}-next`,
        title: `${row.plant_name}: próxima visita`,
        date: row.next_scheduled_at,
        status: resolveUpcomingStatus(row.next_scheduled_at, row.assigned_technician),
        summary: row.problem_summary,
        location: row.address_line,
        technician: row.assigned_technician,
      })
    }

    return rowEntries
  })

  return entries.sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchClientAgendaEntries(): Promise<ClientAgendaEntry[]> {
  try {
    const rows = await fetchOperationsScheduleData()
    const mapped = mapMaintenanceRowsToClientAgenda(rows)
    if (mapped.length === 0) return getClientAgendaFallback()
    return mapped
  } catch {
    return getClientAgendaFallback()
  }
}

function resolveUpcomingStatus(date: string, technician: string | null): Exclude<AgendaStatus, 'completed'> {
  const eventTime = new Date(date).getTime()
  const now = Date.now()
  if (eventTime < now) return 'overdue'

  const daysUntil = (eventTime - now) / (1000 * 60 * 60 * 24)
  if (!technician || daysUntil >= SUGGESTED_DAYS_THRESHOLD) return 'suggested'
  return 'scheduled'
}
