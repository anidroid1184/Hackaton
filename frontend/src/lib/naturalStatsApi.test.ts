import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNaturalBundle, getLocalNaturalBundle } from './naturalStatsApi'
import { buildNaturalBundle, getDefaultScenario } from './residentialGenerators'
import { SIMULATION_CONTEXT_STORAGE_KEY } from './simulationContext'

const getSessionMock = vi.hoisted(() => vi.fn())

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}))

describe('naturalStatsApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_STATS_BASE_URL', '')
    getSessionMock.mockResolvedValue({ data: { session: null } })
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
    window.localStorage.removeItem(SIMULATION_CONTEXT_STORAGE_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa bundle local cuando no existe VITE_STATS_BASE_URL', async () => {
    const bundle = await fetchNaturalBundle('client-1', getDefaultScenario())
    const local = getLocalNaturalBundle()
    expect(bundle.snapshot.plantName).toBe(local.snapshot.plantName)
    expect(bundle.promiseVsReal.promise.length).toBeGreaterThan(0)
  })

  it('usa auth bearer y mapea respuesta backend /stats', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'jwt-test' } },
    })

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            window: { from: '2026-04-18T00:00:00Z', to: '2026-04-18T23:59:59Z' },
            financial: { savings_accumulated_usd: 10 },
            environmental: { co2_avoided_kg: 20, trees_equivalent: 3 },
            technical: {
              energy_kwh: 5,
              uptime_contractual_pct: 92,
              power_factor_mean: 0.91,
              degradation_trend_pct_per_year: 0,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const bundle = await fetchNaturalBundle('00000000-0000-4000-8000-000000000001', getDefaultScenario())

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/stats/00000000-0000-4000-8000-000000000001?')
    expect(String(url)).toContain('from=')
    expect(String(url)).toContain('to=')
    expect(options?.headers).toEqual({ Authorization: 'Bearer jwt-test' })
    expect(bundle.snapshot.today.kwh).toBe(5)
    expect(bundle.snapshot.today.savingsCop).toBe(40000)
    expect(bundle.snapshot.cumulative.treesEquivalent).toBe(3)
  })

  it('agrega provider/scenario/faultMode al query remoto cuando existen en URL', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    window.history.replaceState(
      {},
      '',
      '/?provider=growatt&scenario=storm&faultMode=sensor-drift',
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          window: { from: '2026-04-18T00:00:00Z', to: '2026-04-18T23:59:59Z' },
          financial: { savings_accumulated_usd: 10 },
          environmental: { co2_avoided_kg: 20, trees_equivalent: 3 },
          technical: {
            energy_kwh: 5,
            uptime_contractual_pct: 92,
            power_factor_mean: 0.91,
            degradation_trend_pct_per_year: 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await fetchNaturalBundle('00000000-0000-4000-8000-000000000001', getDefaultScenario())

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('provider=growatt')
    expect(String(url)).toContain('compareProvider=deye')
    expect(String(url)).toContain('scenario=storm')
    expect(String(url)).toContain('faultMode=sensor-drift')
  })

  it('usa contexto persistido cuando la URL no trae provider/scenario/faultMode', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    window.localStorage.setItem(
      SIMULATION_CONTEXT_STORAGE_KEY,
      JSON.stringify({
        provider: 'deye',
        compareProvider: 'growatt',
        scenario: 'recovery',
        faultMode: 'offline',
      }),
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          window: { from: '2026-04-18T00:00:00Z', to: '2026-04-18T23:59:59Z' },
          financial: { savings_accumulated_usd: 10 },
          environmental: { co2_avoided_kg: 20, trees_equivalent: 3 },
          technical: {
            energy_kwh: 5,
            uptime_contractual_pct: 92,
            power_factor_mean: 0.91,
            degradation_trend_pct_per_year: 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await fetchNaturalBundle('00000000-0000-4000-8000-000000000001', getDefaultScenario())

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('provider=deye')
    expect(String(url)).toContain('compareProvider=growatt')
    expect(String(url)).toContain('scenario=recovery')
    expect(String(url)).toContain('faultMode=offline')
  })

  it('hace fallback local cuando backend remoto responde error', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('boom', { status: 500 }))
    const params = getDefaultScenario()

    const bundle = await fetchNaturalBundle('client-1', params)

    expect(bundle).toEqual(buildNaturalBundle(params))
  })

  it('hace fallback local cuando payload remoto es invalido', async () => {
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:8000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ nope: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const params = getDefaultScenario()

    const bundle = await fetchNaturalBundle('client-2', params)

    expect(bundle).toEqual(buildNaturalBundle(params))
  })
})
