import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchClientAgendaEntries, getClientAgendaFallback } from './clientAgendaApi'

const fetchOperationsScheduleDataMock = vi.hoisted(() => vi.fn())

vi.mock('./roleDashboardApi', () => ({
  fetchOperationsScheduleData: fetchOperationsScheduleDataMock,
}))

describe('clientAgendaApi', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-18T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('adapta maintenance schedule a estados de agenda cliente', async () => {
    fetchOperationsScheduleDataMock.mockResolvedValue([
      {
        id: 'mnt-1',
        plant_name: 'Planta Norte',
        client_name: 'Cliente Norte',
        address_line: 'Calle 1',
        last_maintenance_at: '2026-04-10T10:00:00Z',
        next_scheduled_at: '2026-04-17T09:00:00Z',
        problem_summary: 'Revisión de inversor',
        geozone: 'Zona Norte',
        assigned_technician: 'Camilo',
      },
      {
        id: 'mnt-2',
        plant_name: 'Planta Centro',
        client_name: 'Cliente Centro',
        address_line: 'Carrera 2',
        last_maintenance_at: null,
        next_scheduled_at: '2026-04-19T09:00:00Z',
        problem_summary: 'Ajuste de tableros',
        geozone: 'Zona Centro',
        assigned_technician: 'Luisa',
      },
      {
        id: 'mnt-3',
        plant_name: 'Planta Sur',
        client_name: 'Cliente Sur',
        address_line: 'Avenida 3',
        last_maintenance_at: null,
        next_scheduled_at: '2026-05-05T09:00:00Z',
        problem_summary: 'Limpieza preventiva',
        geozone: 'Zona Sur',
        assigned_technician: null,
      },
    ])

    const entries = await fetchClientAgendaEntries()
    const statuses = new Set(entries.map((entry) => entry.status))

    expect(statuses.has('completed')).toBe(true)
    expect(statuses.has('overdue')).toBe(true)
    expect(statuses.has('scheduled')).toBe(true)
    expect(statuses.has('suggested')).toBe(true)
  })

  it('usa fallback explícito cuando no hay agenda disponible', async () => {
    fetchOperationsScheduleDataMock.mockResolvedValue([])

    const entries = await fetchClientAgendaEntries()

    expect(entries).toEqual(getClientAgendaFallback())
  })
})
