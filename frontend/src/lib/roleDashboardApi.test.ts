import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelTechnicianMaintenance,
  completeTechnicianMaintenance,
  exportOperationsFaultsByZoneCsv,
  fetchCorporateElectricalComparisonData,
  fetchOperationsFaultsByZoneData,
  fetchOperationsPlantDetailData,
  fetchOperationsTechniciansData,
  fetchTechnicianAgendaData,
  fetchTechnicianCoreData,
  fetchTechnicianPreventiveTasksData,
  fetchTechnicianTelemetrySnapshotData,
  fetchTechnicianTelemetryData,
  fetchTechnicianVisitsData,
  getCorporateElectricalComparisonFallback,
  getTechnicianAgendaFallback,
  getOperationsFaultsByZoneFallback,
  getOperationsPlantDetailFallback,
  getOperationsTechniciansFallback,
  getTechnicianCoreFallback,
  rescheduleTechnicianMaintenance,
} from './roleDashboardApi'
import { SIMULATION_CONTEXT_STORAGE_KEY } from './simulationContext'
import { MOCK_SCENARIO_STORAGE_KEY } from './naturalStatsApi'

const getSessionMock = vi.hoisted(() => vi.fn())

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}))

describe('roleDashboardApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('VITE_STATS_BASE_URL', '')
    getSessionMock.mockResolvedValue({ data: { session: null } })
    window.history.replaceState({}, '', '/')
    window.localStorage.removeItem(SIMULATION_CONTEXT_STORAGE_KEY)
    window.sessionStorage.removeItem(MOCK_SCENARIO_STORAGE_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('consume /operations/technicians remoto con bearer token', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'jwt-test' } } })

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'tech-1',
            full_name: 'Camilo Rojas',
            geozone: 'Zona Norte',
            phone: '+57 300 100 1111',
            status: 'active',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const data = await fetchOperationsTechniciansData()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/operations/technicians')
    expect(options?.headers).toEqual({ Authorization: 'Bearer jwt-test' })
    expect(data[0]?.full_name).toBe('Camilo Rojas')
    expect(data[0]?.status).toBe('active')
  })

  it('agrega provider/scenario/faultMode en consumo remoto cuando vienen en URL', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    window.history.replaceState(
      {},
      '',
      '/?provider=deye&scenario=cloudy-day&faultMode=inverter-offline',
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'tech-2',
            full_name: 'Luisa Mora',
            geozone: 'Zona Centro',
            phone: '+57 300 100 1112',
            status: 'busy',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await fetchOperationsTechniciansData()

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('provider=deye')
    expect(String(url)).toContain('compareProvider=deye')
    expect(String(url)).toContain('scenario=cloudy-day')
    expect(String(url)).toContain('faultMode=inverter-offline')
  })

  it('usa contexto persistido para endpoints multi-rol cuando no hay query params', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    window.localStorage.setItem(
      SIMULATION_CONTEXT_STORAGE_KEY,
      JSON.stringify({
        provider: 'growatt',
        compareProvider: 'huawei',
        scenario: 'recovery',
        faultMode: 'spikes',
      }),
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'tech-3',
            full_name: 'Jorge Leon',
            geozone: 'Zona Oriente',
            phone: '+57 300 100 1113',
            status: 'active',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await fetchOperationsTechniciansData()

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('provider=growatt')
    expect(String(url)).toContain('compareProvider=huawei')
    expect(String(url)).toContain('scenario=recovery')
    expect(String(url)).toContain('faultMode=spikes')
  })

  it('inyecta noise/scale/phase/profile del mock hub en endpoints de rol', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    window.sessionStorage.setItem(
      MOCK_SCENARIO_STORAGE_KEY,
      JSON.stringify({ noise: 0.8, scale: 2.5, phase: 0.4, profile: 'pac' }),
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await fetchOperationsTechniciansData()

    const [url] = fetchMock.mock.calls[0]
    const urlStr = String(url)
    expect(urlStr).toContain('/operations/technicians')
    expect(urlStr).toContain('noise=0.8')
    expect(urlStr).toContain('scale=2.5')
    expect(urlStr).toContain('phase=0.4')
    expect(urlStr).toContain('profile=pac')
    window.sessionStorage.removeItem(MOCK_SCENARIO_STORAGE_KEY)
  })

  it('usa fallback de /operations/technicians cuando payload remoto es invalido', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ bad: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const data = await fetchOperationsTechniciansData()
    expect(data).toEqual(getOperationsTechniciansFallback())
  })

  it('envia filtros de zona y cliente a /analytics/faults-by-zone', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          window: { from: '2026-04-01T00:00:00Z', to: '2026-04-18T23:59:59Z' },
          buckets: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await fetchOperationsFaultsByZoneData({ geozone: 'Zona Norte', client: 'Alimentos Andina' })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/analytics/faults-by-zone?')
    expect(String(url)).toContain('geozone=Zona+Norte')
    expect(String(url)).toContain('client=Alimentos+Andina')
    expect(String(url)).toContain('client_id=Alimentos+Andina')
  })

  it('hace fallback de faults-by-zone filtrando zona cuando backend falla', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))

    const data = await fetchOperationsFaultsByZoneData({ geozone: 'Zona Norte' })

    expect(data.buckets).toEqual(
      getOperationsFaultsByZoneFallback().buckets.filter((bucket) => bucket.geozone === 'Zona Norte'),
    )
  })

  it('exporta CSV por ruta nueva y mantiene filtros', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('geozone,fault_count\nZona Norte,3\n', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="faults-zona-norte.csv"',
        },
      }),
    )

    const csv = await exportOperationsFaultsByZoneCsv({ geozone: 'Zona Norte', client: 'Alimentos Andina' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/analytics/faults-by-zone/export.csv')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('client_name=Alimentos+Andina')
    expect(csv?.filename).toBe('faults-zona-norte.csv')
  })

  it('hace fallback al endpoint legacy de csv cuando la ruta nueva falla', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(new Response('missing', { status: 404 }))
      .mockResolvedValueOnce(
        new Response('geozone,fault_count\nZona Norte,3\n', {
          status: 200,
          headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        }),
      )

    const csv = await exportOperationsFaultsByZoneCsv({ geozone: 'Zona Norte' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/analytics/faults-by-zone?format=csv')
    expect(csv).not.toBeNull()
  })

  it('consume /operations/plants/{id} remoto y valida estructura', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          plant: {
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
          alerts: [
            {
              id: 'alert-1',
              type: 'arc_fault',
              severity: 'critical',
              ts: '2026-04-18T10:04:00Z',
              plantId: 'plant-lagos-1',
              plantName: 'Planta Lagos Norte',
              geozone: 'Zona Norte',
              summary: 'Arco detectado',
              suggestedTechnicianName: 'Camilo Rojas',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const data = await fetchOperationsPlantDetailData('plant-lagos-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/operations/plants/plant-lagos-1')
    expect(data?.plant.id).toBe('plant-lagos-1')
    expect(data?.alerts).toHaveLength(1)
  })

  it('usa fallback de /operations/plants/{id} cuando backend falla', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))

    const data = await fetchOperationsPlantDetailData('plant-lagos-1')
    expect(data).toEqual(getOperationsPlantDetailFallback('plant-lagos-1'))
  })

  it('consume /technician/telemetry remoto y usa fallback en error', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([{ label: 'Vo', value: '221 V', source: 'live' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const remoteData = await fetchTechnicianTelemetryData()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/technician/telemetry')
    expect(remoteData[0]?.label).toBe('Vo')

    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const fallbackData = await fetchTechnicianTelemetryData()
    expect(fallbackData).toEqual(getTechnicianCoreFallback().telemetry)
  })

  it('consume /technician/preventive-tasks remoto y usa fallback en error', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'task-remote-1',
            title: 'Inspeccion remota',
            state: 'pendiente',
            critical: true,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const remoteData = await fetchTechnicianPreventiveTasksData()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/technician/preventive-tasks')
    expect(remoteData[0]?.id).toBe('task-remote-1')

    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const fallbackData = await fetchTechnicianPreventiveTasksData()
    expect(fallbackData).toEqual(getTechnicianCoreFallback().preventiveTasks)
  })

  it('consume /technician/visits remoto y usa fallback en error', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'visit-remote-1',
            plant: 'Planta Norte',
            address: 'Calle 1',
            geozone: 'Zona Norte',
            window: '08:00 - 10:00',
            ticketId: 'tk-1',
            problemSummary: 'Arco electrico',
            priority: 'alta',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const remoteData = await fetchTechnicianVisitsData()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/technician/visits')
    expect(remoteData[0]?.id).toBe('visit-remote-1')

    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const fallbackData = await fetchTechnicianVisitsData()
    expect(fallbackData).toEqual(getTechnicianCoreFallback().visits)
  })

  it('consume /maintenance/schedule para agenda tecnica y usa fallback en error', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'mnt-2001',
            plant_name: 'Planta Lagos Norte',
            client_name: 'Alimentos Andina',
            address_line: 'Calle 120 #18-44, Bogota',
            last_maintenance_at: null,
            next_scheduled_at: '2026-04-20T14:00:00Z',
            problem_summary: 'Arco electrico recurrente',
            geozone: 'Zona Norte',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const remoteData = await fetchTechnicianAgendaData()
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/maintenance/schedule')
    expect(remoteData[0]?.id).toBe('mnt-2001')

    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const fallbackData = await fetchTechnicianAgendaData()
    expect(fallbackData).toEqual(getTechnicianAgendaFallback())
  })

  it('reprograma mantenimiento con PATCH /maintenances/{id} y mantiene fallback local', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          maintenance_id: 'mnt-1001',
          status: 'scheduled',
          next_scheduled_at: '2026-05-01T10:00:00Z',
          problem_summary: 'Reprogramado',
          assigned_profile_id: 'tech-001',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const remoteResult = await rescheduleTechnicianMaintenance('mnt-1001', {
      nextScheduledAt: '2026-05-01T10:00:00Z',
      problemSummary: 'Reprogramado',
      assignedProfileId: 'tech-001',
    })
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/maintenances/mnt-1001')
    expect(options?.method).toBe('PATCH')
    expect(remoteResult.mode).toBe('remote')
    expect(remoteResult.payload.status).toBe('scheduled')

    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const fallbackResult = await rescheduleTechnicianMaintenance('mnt-1001', {
      nextScheduledAt: '2026-05-02T10:00:00Z',
    })
    expect(fallbackResult.mode).toBe('fallback')
    expect(fallbackResult.payload.maintenance_id).toBe('mnt-1001')
  })

  it('cancela mantenimiento con POST /maintenances/{id}/cancel y mantiene fallback local', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          maintenance_id: 'mnt-1001',
          status: 'cancelled',
          cancelled_at: '2026-04-20T11:00:00Z',
          reason: 'Cliente reagenda',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const remoteResult = await cancelTechnicianMaintenance('mnt-1001', { reason: 'Cliente reagenda' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/maintenances/mnt-1001/cancel')
    expect(options?.method).toBe('POST')
    expect(remoteResult.mode).toBe('remote')
    expect(remoteResult.payload.status).toBe('cancelled')

    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }))
    const fallbackResult = await cancelTechnicianMaintenance('mnt-1001', { reason: 'Sin conectividad' })
    expect(fallbackResult.mode).toBe('fallback')
    expect(fallbackResult.payload.maintenance_id).toBe('mnt-1001')
  })

  it('completa mantenimiento enriquecido con evidencia y checklist', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          maintenance_id: 'mnt-1001',
          status: 'completed',
          completed_at: '2026-04-20T11:30:00Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await completeTechnicianMaintenance({
      maintenanceId: 'mnt-1001',
      notes: 'Se reemplazo breaker y se ajusto torque',
      checklist: ['Breaker revisado/reemplazado', 'Limpieza de tablero'],
      evidence: ['{"name":"foto-1.jpg","size":1234}'],
    })

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/maintenance/complete')
    expect(options?.method).toBe('POST')
    expect(options?.body).toContain('"evidence"')
    expect(result.mode).toBe('remote')
    expect(result.payload.status).toBe('completed')
  })

  it('arma snapshot de telemetria por planta/zona con estado online/offline', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
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
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ label: 'Voltaje (Vo)', value: '220 V', source: 'live' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'tech-1',
              full_name: 'Camilo Rojas',
              geozone: 'Zona Norte',
              phone: '+57 300 100 1111',
              status: 'active',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const snapshot = await fetchTechnicianTelemetrySnapshotData()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(snapshot[0]?.plant).toBe('Planta Lagos Norte')
    expect(snapshot[0]?.status).toBe('online')
  })

  it('fetchTechnicianCoreData arma bundle usando endpoints de tecnico', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'visit-remote-2',
              plant: 'Planta Sur',
              address: 'Carrera 2',
              geozone: 'Zona Sur',
              window: '10:00 - 11:00',
              ticketId: 'tk-2',
              problemSummary: 'Fatiga breaker',
              priority: 'media',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ label: 'Io', value: '16 A', source: 'live' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 'task-remote-2',
              title: 'Termografia',
              state: 'realizada',
              critical: false,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const data = await fetchTechnicianCoreData()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(data.visits[0]?.id).toBe('visit-remote-2')
    expect(data.telemetry[0]?.label).toBe('Io')
    expect(data.preventiveTasks[0]?.id).toBe('task-remote-2')
  })

  it('consume comparacion electrica corporativa y valida PF', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            period: 'month',
            system: 'Sistema A',
            powerFactor: 0.94,
            targetPowerFactor: 0.95,
            savingsCop: 2000000,
            energyKwh: 31000,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const data = await fetchCorporateElectricalComparisonData()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/corporate/electrical-comparison')
    expect(data[0]?.powerFactor).toBe(0.94)
  })

  it('usa fallback de comparacion electrica cuando payload es invalido', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ period: 'month', bad: true }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const data = await fetchCorporateElectricalComparisonData()
    expect(data).toEqual(getCorporateElectricalComparisonFallback())
  })
})
