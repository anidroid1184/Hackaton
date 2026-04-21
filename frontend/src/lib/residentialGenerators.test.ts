import { describe, expect, it } from 'vitest'
import {
  buildMockStatsResponse,
  buildNaturalBundle,
  getDefaultScenario,
  parseScenarioParams,
} from './residentialGenerators'

describe('residentialGenerators', () => {
  it('parseScenarioParams usa valores por defecto', () => {
    const p = parseScenarioParams(new URLSearchParams())
    expect(p.noise).toBeGreaterThanOrEqual(0)
    expect(p.scale).toBeGreaterThanOrEqual(0.3)
    expect(p.profile).toBe('canonical')
  })

  it('buildNaturalBundle produce cumplimiento coherente', () => {
    const b = buildNaturalBundle(getDefaultScenario())
    expect(b.promiseVsReal.promise.length).toBe(b.promiseVsReal.real.length)
    expect(b.promiseVsReal.fulfillmentPct).toBe(95)
    expect(b.snapshot.today.kwh).toBeGreaterThan(0)
  })

  it('buildMockStatsResponse incluye raw_alias_demo y scenario', () => {
    const r = buildMockStatsResponse('abc', getDefaultScenario())
    expect(r.client_id).toBe('abc')
    expect(r.raw_alias_demo.values).toBeDefined()
    expect(r.scenario.profile).toBe('canonical')
  })
})
