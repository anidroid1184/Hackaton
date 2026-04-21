import test from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import { createServer } from './server.ts'

type StartedServer = {
  server: ReturnType<typeof createServer>
  baseUrl: string
}

async function startTestServer(): Promise<StartedServer> {
  const server = createServer(0)
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address() as AddressInfo
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

async function stopTestServer(server: StartedServer['server']): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

test('rutas multi-perfil y simulacion proveedor responden 200', async () => {
  const started = await startTestServer()
  try {
    const routes = [
      '/operations/fleet',
      '/operations/war-room',
      '/operations/schedule',
      '/analytics/faults-by-zone',
      '/operations/technicians',
      '/technician/visits',
      '/technician/telemetry',
      '/technician/preventive-tasks',
      '/corporate/overview',
      '/corporate/roi',
      '/corporate/kpis',
      '/corporate/tickets',
      '/sim/meta',
      '/sim/providers',
      '/sim/providers/huawei/catalog',
      '/sim/providers/huawei/sample/device-kpi',
    ]

    for (const route of routes) {
      const response = await fetch(`${started.baseUrl}${route}?scenario=stress&faultMode=degraded&provider=huawei`)
      assert.equal(response.status, 200, `esperaba 200 en ${route}`)
    }
  } finally {
    await stopTestServer(started.server)
  }
})

test('/stats/:client_id conserva contrato y agrega envelope por proveedor', async () => {
  const started = await startTestServer()
  try {
    const response = await fetch(
      `${started.baseUrl}/stats/00000000-0000-4000-8000-000000000001?provider=deye&noise=0.2&scale=1.1&phase=0.4`,
    )
    assert.equal(response.status, 200)
    const body = (await response.json()) as Record<string, unknown>
    assert.equal(body.client_id, '00000000-0000-4000-8000-000000000001')

    const rawAliasDemo = body.raw_alias_demo as Record<string, unknown>
    assert.equal(typeof rawAliasDemo.values, 'object')
    assert.equal(rawAliasDemo.provider, 'deye')
    assert.equal(typeof rawAliasDemo.provider_envelope, 'object')
    const providerEnvelope = rawAliasDemo.provider_envelope as { simulation?: { compareProvider?: string } }
    assert.equal(providerEnvelope.simulation?.compareProvider, 'deye')
  } finally {
    await stopTestServer(started.server)
  }
})

test('/sim/meta versiona contrato de simulacion', async () => {
  const started = await startTestServer()
  try {
    const response = await fetch(
      `${started.baseUrl}/sim/meta?provider=huawei&compareProvider=growatt&scenario=stress&faultMode=offline`,
    )
    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      contractVersion: string
      context: { provider: string; compareProvider: string; scenario: string; faultMode: string }
    }
    assert.equal(body.contractVersion, '2026-04-18.sim.v1')
    assert.equal(body.context.provider, 'huawei')
    assert.equal(body.context.compareProvider, 'growatt')
    assert.equal(body.context.scenario, 'stress')
    assert.equal(body.context.faultMode, 'offline')
  } finally {
    await stopTestServer(started.server)
  }
})

test('/operations/plants/{id} entrega payload compatible con roleDashboardApi', async () => {
  const started = await startTestServer()
  try {
    const response = await fetch(
      `${started.baseUrl}/operations/plants/plant-lagos-1?scenario=stress&faultMode=degraded&provider=huawei`,
    )

    assert.equal(response.status, 200)
    const body = (await response.json()) as {
      plant: {
        id: string
        plantName: string
        activeAlerts: number
      }
      alerts: Array<{
        plantId: string
        summary: string
      }>
    }

    assert.equal(body.plant.id, 'plant-lagos-1')
    assert.equal(typeof body.plant.plantName, 'string')
    assert.equal(typeof body.plant.activeAlerts, 'number')
    assert.ok(Array.isArray(body.alerts))
    for (const alert of body.alerts) {
      assert.equal(alert.plantId, body.plant.id)
      assert.equal(typeof alert.summary, 'string')
    }
  } finally {
    await stopTestServer(started.server)
  }
})

test('/operations/plants/{id} responde 404 cuando planta no existe', async () => {
  const started = await startTestServer()
  try {
    const response = await fetch(`${started.baseUrl}/operations/plants/plant-no-existe`)
    assert.equal(response.status, 404)
  } finally {
    await stopTestServer(started.server)
  }
})

test('/operations/fleet varia payload segun noise en querystring', async () => {
  const started = await startTestServer()
  try {
    const urlLow = `${started.baseUrl}/operations/fleet?noise=0.0&scale=1&phase=0`
    const urlHigh = `${started.baseUrl}/operations/fleet?noise=0.9&scale=1&phase=0`

    const [resLow, resHigh] = await Promise.all([fetch(urlLow), fetch(urlHigh)])
    assert.equal(resLow.status, 200)
    assert.equal(resHigh.status, 200)

    const bodyLow = (await resLow.json()) as Array<{ id: string; activeAlerts: number }>
    const bodyHigh = (await resHigh.json()) as Array<{ id: string; activeAlerts: number }>

    assert.ok(Array.isArray(bodyLow) && bodyLow.length > 0, 'fleet low payload vacio')
    assert.equal(bodyLow.length, bodyHigh.length)

    const differs = bodyLow.some((plant, idx) => plant.activeAlerts !== bodyHigh[idx]?.activeAlerts)
    assert.ok(
      differs,
      `esperaba diferencia en activeAlerts entre noise=0.0 y noise=0.9, low=${JSON.stringify(
        bodyLow.map((p) => p.activeAlerts),
      )} high=${JSON.stringify(bodyHigh.map((p) => p.activeAlerts))}`,
    )
  } finally {
    await stopTestServer(started.server)
  }
})
