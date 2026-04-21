import { rounded, type ProviderId, type SimulationParams } from './simulationParams.ts'

type ProviderEntity =
  | 'station-list'
  | 'station-kpi'
  | 'device-list'
  | 'device-kpi'
  | 'alerts'

type ProviderCatalogItem = {
  entity: ProviderEntity
  route: string
  description: string
}

type ProviderDefinition = {
  id: ProviderId
  displayName: string
  docsRef: string
  envelope: string
  entities: ProviderCatalogItem[]
}

const PROVIDER_DEFINITIONS: Record<ProviderId, ProviderDefinition> = {
  deye: {
    id: 'deye',
    displayName: 'Deye Cloud',
    docsRef: 'docs/api/deye',
    envelope: '{ code, msg, success, requestId, ... }',
    entities: [
      { entity: 'station-list', route: '/v1.0/station/list', description: 'Descubrimiento de plantas' },
      { entity: 'station-kpi', route: '/v1.0/station/latest', description: 'Snapshot instantaneo por planta' },
      { entity: 'device-list', route: '/v1.0/station/listWithDevice', description: 'Plantas + dispositivos' },
      { entity: 'device-kpi', route: '/v1.0/device/latest', description: 'Telemetria instantanea de inversor' },
      { entity: 'alerts', route: '/v1.0/station/alertList', description: 'Alertas por planta en rango' },
    ],
  },
  huawei: {
    id: 'huawei',
    displayName: 'Huawei FusionSolar',
    docsRef: 'docs/api/huawei',
    envelope: '{ success, failCode, message, data, params }',
    entities: [
      { entity: 'station-list', route: '/thirdData/stations', description: 'Descubrimiento de plantas (v2)' },
      { entity: 'station-kpi', route: '/thirdData/getStationRealKpi', description: 'KPI instantaneo por planta' },
      { entity: 'device-list', route: '/thirdData/getDevList', description: 'Dispositivos por planta' },
      { entity: 'device-kpi', route: '/thirdData/getDevRealKpi', description: 'KPI instantaneo por inversor' },
      { entity: 'alerts', route: '/thirdData/getAlarmList', description: 'Alarmas por ventana temporal' },
    ],
  },
  growatt: {
    id: 'growatt',
    displayName: 'Growatt OpenAPI',
    docsRef: 'docs/api/growatt',
    envelope: '{ error_code, error_msg, data }',
    entities: [
      { entity: 'station-list', route: '/v1/plant/list', description: 'Descubrimiento de plantas' },
      { entity: 'station-kpi', route: '/v1/plant/data', description: 'Metricas agregadas en vivo' },
      { entity: 'device-list', route: '/v1/device/list', description: 'Dispositivos por planta' },
      { entity: 'device-kpi', route: '/v1/tlx/data_info', description: 'Snapshot por inversor compatible' },
      { entity: 'alerts', route: '/v1/plant/power', description: 'Serie temporal para deteccion de eventos' },
    ],
  },
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toGrowattDateTime(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`
}

function scenarioMultiplier(scenario: string): number {
  if (scenario === 'stress') return 1.4
  if (scenario === 'recovery') return 0.8
  if (scenario === 'night') return 0.25
  return 1
}

function faultBias(faultMode: SimulationParams['faultMode']): number {
  if (faultMode === 'degraded') return 0.82
  if (faultMode === 'offline') return 0.1
  if (faultMode === 'spikes') return 1.2
  return 1
}

function simulationFactor(params: SimulationParams): number {
  return params.scale * scenarioMultiplier(params.scenario) * faultBias(params.faultMode)
}

function randomId(prefix: string, nowMs: number): string {
  const suffix = nowMs.toString(16).slice(-8)
  return `${prefix}${suffix}`
}

export function listProviders(now = new Date()): {
  generatedAt: string
  providers: ProviderDefinition[]
} {
  return {
    generatedAt: now.toISOString(),
    providers: Object.values(PROVIDER_DEFINITIONS),
  }
}

export function getProviderCatalog(provider: ProviderId, now = new Date()): {
  provider: ProviderDefinition
  generatedAt: string
} {
  return {
    provider: PROVIDER_DEFINITIONS[provider],
    generatedAt: now.toISOString(),
  }
}

function buildDeyeSample(entity: ProviderEntity, params: SimulationParams, now: Date): unknown {
  const nowSec = Math.floor(now.getTime() / 1000)
  const factor = simulationFactor(params)
  const requestId = randomId('sim-deye-', now.getTime())

  if (entity === 'station-list') {
    return {
      code: '1000000',
      msg: 'ok',
      success: true,
      requestId,
      total: 1,
      stationList: [
        {
          id: 40760,
          name: 'Planta Demo Sim',
          installedCapacity: rounded(5.8 * params.scale, 2),
          regionTimezone: 'America/Bogota',
          connectionStatus: params.faultMode === 'offline' ? 'ALL_OFFLINE' : 'NORMAL',
          generationPower: rounded(1250 * factor, 2),
          lastUpdateTime: nowSec,
        },
      ],
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'station-kpi') {
    return {
      code: '1000000',
      msg: 'ok',
      success: true,
      requestId,
      generationPower: rounded(1180 * factor, 2),
      consumptionPower: rounded(820 * factor, 2),
      batterySOC: params.faultMode === 'offline' ? 0 : rounded(78 - params.noise * 12, 1),
      batteryPower: params.faultMode === 'offline' ? 0 : rounded(90 * factor, 2),
      lastUpdateTime: nowSec,
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'device-list') {
    return {
      code: '1000000',
      msg: 'ok',
      success: true,
      requestId,
      stationTotal: 1,
      stationList: [
        {
          id: 40760,
          name: 'Planta Demo Sim',
          deviceTotal: 2,
          deviceListItems: [
            {
              deviceSn: '2402010117',
              deviceType: 'INVERTER',
              connectStatus: params.faultMode === 'offline' ? 0 : 1,
              collectionTime: nowSec,
              stationId: 40760,
            },
            {
              deviceSn: 'COLL-0000SIM',
              deviceType: 'COLLECTOR',
              connectStatus: 1,
              collectionTime: nowSec,
              stationId: 40760,
            },
          ],
        },
      ],
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'device-kpi') {
    return {
      code: '1000000',
      msg: 'ok',
      success: true,
      requestId,
      deviceDataList: [
        {
          deviceSn: '2402010117',
          deviceType: 'INVERTER',
          deviceState: params.faultMode === 'offline' ? 0 : 1,
          collectionTime: nowSec,
          dataList: [
            { key: 'ActivePower', value: `${rounded(4.2 * factor, 3)}`, unit: 'kW' },
            { key: 'GridFrequency', value: `${rounded(60 + params.noise * 0.3, 2)}`, unit: 'Hz' },
            { key: 'SOC', value: `${rounded(80 - params.noise * 10, 0)}`, unit: '%' },
          ],
        },
      ],
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  return {
    code: '1000000',
    msg: 'ok',
    success: true,
    requestId,
    total: params.faultMode === 'none' ? 0 : 1,
    stationAlertItems:
      params.faultMode === 'none'
        ? []
        : [
            {
              alertId: `ALERT-${nowSec}`,
              alertCode: params.faultMode === 'offline' ? 'E005' : 'E013',
              alertLevel: params.faultMode === 'degraded' ? 'WARN' : 'ERROR',
              alertMsg: params.faultMode === 'offline' ? 'Station offline' : 'Power quality event',
              startTimestamp: nowSec - 1800,
              endTimestamp: nowSec - 300,
              status: 'CLEARED',
            },
          ],
    simulation: { scenario: params.scenario, faultMode: params.faultMode },
  }
}

function buildHuaweiSample(entity: ProviderEntity, params: SimulationParams, now: Date): unknown {
  const nowMs = now.getTime()
  const factor = simulationFactor(params)

  if (entity === 'station-list') {
    return {
      success: true,
      failCode: 0,
      message: 'get plant list success',
      params: { pageNo: 1, currentTime: nowMs },
      data: {
        total: 1,
        pageNo: 1,
        pageCount: 1,
        list: [
          {
            plantCode: 'NE=33685734',
            plantName: 'Planta Huawei Sim',
            plantAddress: 'Bogota, Colombia',
            latitude: '4.711754',
            longitude: '-75.919234',
            capacity: rounded(40 * params.scale, 2),
            gridConnectionDate: new Date(nowMs - 300 * 86_400_000).toISOString(),
          },
        ],
      },
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'station-kpi') {
    return {
      success: true,
      failCode: 0,
      message: null,
      params: { currentTime: nowMs, stationCodes: 'NE=33685734' },
      data: [
        {
          stationCode: 'NE=33685734',
          dataItemMap: {
            real_health_state: params.faultMode === 'offline' ? 0 : 1,
            day_power: rounded(12.35 * factor, 2),
            month_power: rounded(845.12 * factor, 2),
            total_power: rounded(43_210.88 * params.scale, 2),
            day_income: rounded(3085 * factor, 2),
          },
        },
      ],
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'device-list') {
    return {
      success: true,
      failCode: 0,
      message: null,
      params: { currentTime: nowMs, stationCodes: 'NE=33685734' },
      data: [
        {
          id: 1000000033685719,
          devName: 'Inverter-1',
          devTypeId: 1,
          esnCode: 'ES21XXXXXXXX',
          model: 'SUN2000-20KTL-M3',
          stationCode: 'NE=33685734',
        },
        {
          id: 1000000033685720,
          devName: 'Dongle-1',
          devTypeId: 62,
          esnCode: 'BT21YYYYYYYY',
          model: 'SDongleA-05',
          stationCode: 'NE=33685734',
        },
      ],
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'device-kpi') {
    return {
      success: true,
      failCode: 0,
      message: null,
      params: { currentTime: nowMs, devIds: '1000000033685719', devTypeId: 1 },
      data: [
        {
          devId: 1000000033685719,
          sn: 'ES21XXXXXXXX',
          dataItemMap: {
            run_state: params.faultMode === 'offline' ? 0 : 1,
            active_power: rounded(4.23 * factor, 3),
            elec_freq: rounded(60 + params.noise * 0.2, 2),
            power_factor: rounded(0.99 - params.noise * 0.04, 3),
            day_cap: rounded(12.35 * factor, 2),
            total_cap: rounded(43_210.88 * params.scale, 2),
            open_time: nowMs - 4 * 3_600_000,
          },
        },
      ],
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  return {
    success: true,
    failCode: 0,
    message: null,
    params: {
      currentTime: nowMs,
      beginTime: nowMs - 86_400_000,
      endTime: nowMs,
      stationCodes: 'NE=33685734',
    },
    data:
      params.faultMode === 'none'
        ? []
        : [
            {
              id: `alarm-${nowMs}`,
              stationCode: 'NE=33685734',
              alarmName: params.faultMode === 'offline' ? 'Communication interruption' : 'Arc fault warning',
              alarmLevel: params.faultMode === 'degraded' ? 2 : 3,
              raiseTime: nowMs - 1_200_000,
              recoverTime: nowMs - 600_000,
            },
          ],
    simulation: { scenario: params.scenario, faultMode: params.faultMode },
  }
}

function buildGrowattSample(entity: ProviderEntity, params: SimulationParams, now: Date): unknown {
  const nowMs = now.getTime()
  const nowText = toGrowattDateTime(now)
  const factor = simulationFactor(params)

  if (entity === 'station-list') {
    return {
      error_code: 0,
      error_msg: '',
      data: {
        count: 1,
        plants: [
          {
            plant_id: 1234567,
            name: 'Planta Growatt Sim',
            country: 'Colombia',
            city: 'Bogota',
            peak_power: rounded(100 * params.scale, 2),
            current_power: `${rounded(4.5 * factor, 2)}`,
            total_energy: `${rounded(100000 * params.scale, 1)}`,
            status: params.faultMode === 'offline' ? 4 : 1,
            create_date: '2024-01-01',
          },
        ],
      },
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'station-kpi') {
    return {
      error_code: 0,
      error_msg: '',
      data: {
        current_power: rounded(4.5 * factor, 2),
        today_energy: `${rounded(12.4 * factor, 1)}`,
        monthly_energy: `${rounded(412.3 * factor, 1)}`,
        yearly_energy: `${rounded(5210 * params.scale, 1)}`,
        total_energy: `${rounded(100000 * params.scale, 1)}`,
        timezone: 'GMT-5',
        last_update_time: nowText,
      },
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'device-list') {
    return {
      error_code: 0,
      error_msg: '',
      data: {
        count: 2,
        devices: [
          {
            device_sn: 'ABC1234567',
            model: 'MIN 6000TL-X',
            type: 7,
            status: params.faultMode === 'offline' ? 0 : 2,
            last_update_time: nowText,
          },
          {
            device_sn: 'meter',
            model: '',
            type: 3,
            last_update_time: nowText,
          },
        ],
      },
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  if (entity === 'device-kpi') {
    return {
      error_code: 0,
      error_msg: '',
      data: {
        dataloggerSn: 'DLG0001ABC',
        serial_num: 'ABC1234567',
        ac_power: `${rounded(4.4 * factor, 3)}`,
        output_power: `${rounded(4.2 * factor, 3)}`,
        pv1_voltage: `${rounded(420 + params.noise * 5, 2)}`,
        pv1_current: `${rounded(5.1 * factor, 2)}`,
        temp_inverter: `${rounded(41 + params.noise * 4, 1)}`,
        last_update_time: nowText,
      },
      simulation: { scenario: params.scenario, faultMode: params.faultMode },
    }
  }

  return {
    error_code: 0,
    error_msg: '',
    data: {
      count: 3,
      powers: [
        { time: toGrowattDateTime(new Date(nowMs - 600_000)).slice(0, 16), power: rounded(3.8 * factor, 2) },
        { time: toGrowattDateTime(new Date(nowMs - 300_000)).slice(0, 16), power: rounded(4.2 * factor, 2) },
        { time: toGrowattDateTime(now).slice(0, 16), power: params.faultMode === 'offline' ? 0 : rounded(4.4 * factor, 2) },
      ],
    },
    simulation: { scenario: params.scenario, faultMode: params.faultMode },
  }
}

const ENTITY_SET: ReadonlySet<string> = new Set([
  'station-list',
  'station-kpi',
  'device-list',
  'device-kpi',
  'alerts',
])

function isProviderEntity(entity: string): entity is ProviderEntity {
  return ENTITY_SET.has(entity)
}

export function buildProviderSample(provider: ProviderId, entity: string, params: SimulationParams, now = new Date()): unknown | null {
  if (!isProviderEntity(entity)) return null
  if (provider === 'deye') return buildDeyeSample(entity, params, now)
  if (provider === 'huawei') return buildHuaweiSample(entity, params, now)
  return buildGrowattSample(entity, params, now)
}
