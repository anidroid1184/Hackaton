import { useEffect, useMemo, useState } from 'react'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import {
  exportOperationsFaultsByZoneCsv,
  fetchOperationsFaultsByZoneData,
  fetchOperationsScheduleData,
  getOperationsFaultsByZoneFallback,
  getOperationsScheduleFallback,
  type MaintenanceScheduleRow,
  type OperationsFaultsFilters,
} from '../lib/roleDashboardApi'

export function OperationsRegionalAnalyticsPage() {
  const [data, setData] = useState(() => getOperationsFaultsByZoneFallback())
  const [scheduleRows, setScheduleRows] = useState<MaintenanceScheduleRow[]>(() => getOperationsScheduleFallback())
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [exporting, setExporting] = useState(false)

  const clientsByZone = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const row of scheduleRows) {
      const clients = map.get(row.geozone) ?? new Set<string>()
      clients.add(row.client_name)
      map.set(row.geozone, clients)
    }
    return map
  }, [scheduleRows])

  const zones = useMemo(() => {
    const optionSet = new Set<string>()
    for (const row of scheduleRows) optionSet.add(row.geozone)
    for (const bucket of data.buckets) optionSet.add(bucket.geozone)
    return ['all', ...Array.from(optionSet).sort()]
  }, [data.buckets, scheduleRows])

  const clients = useMemo(() => {
    const optionSet = new Set<string>()
    if (selectedZone === 'all') {
      for (const row of scheduleRows) optionSet.add(row.client_name)
    } else {
      const inZone = clientsByZone.get(selectedZone)
      if (inZone) {
        for (const client of inZone) optionSet.add(client)
      }
    }
    return ['all', ...Array.from(optionSet).sort()]
  }, [clientsByZone, scheduleRows, selectedZone])

  const normalizedSelectedClient = clients.includes(selectedClient) ? selectedClient : 'all'

  const activeFilters = useMemo<OperationsFaultsFilters | undefined>(() => {
    if (selectedZone === 'all' && normalizedSelectedClient === 'all') return undefined
    return {
      geozone: selectedZone === 'all' ? undefined : selectedZone,
      client: normalizedSelectedClient === 'all' ? undefined : normalizedSelectedClient,
    }
  }, [normalizedSelectedClient, selectedZone])

  const visibleBuckets = useMemo(() => {
    if (normalizedSelectedClient === 'all') return data.buckets
    return data.buckets.filter((bucket) => clientsByZone.get(bucket.geozone)?.has(normalizedSelectedClient))
  }, [clientsByZone, data.buckets, normalizedSelectedClient])

  const max = Math.max(
    ...visibleBuckets.flatMap((item) => item.fault_types.map((faultType) => faultType.count)),
    1,
  )

  useEffect(() => {
    let mounted = true
    void fetchOperationsScheduleData().then((rows) => {
      if (!mounted) return
      setScheduleRows(rows)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void fetchOperationsFaultsByZoneData(activeFilters)
      .then((nextData) => {
        if (!mounted) return
        setData(nextData)
      })
    return () => {
      mounted = false
    }
  }, [activeFilters])

  async function handleExportCsv(): Promise<void> {
    setExporting(true)
    const remoteCsv = await exportOperationsFaultsByZoneCsv(activeFilters)
    if (remoteCsv) {
      downloadCsvBlob(remoteCsv.content, remoteCsv.filename)
      setExporting(false)
      return
    }
    const csvFallback = buildFaultsCsv(visibleBuckets)
    const filename = `analytics-faults-${new Date().toISOString().slice(0, 10)}.csv`
    downloadCsvBlob(new Blob([csvFallback], { type: 'text/csv;charset=utf-8' }), filename)
    setExporting(false)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Operaciones Techos Rentables"
        title="Analitica regional"
        description={
          <>
            Frecuencia de falla por sector para la ventana {formatWindow(data.window.from)} -{' '}
            {formatWindow(data.window.to)}.
          </>
        }
      />

      <section className="card p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface">
              Frecuencia de falla por zona y cliente
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Filtra por geozona y cliente para priorizar intervenciones, luego exporta CSV.
            </p>
          </div>
          <button
            className="btn-primary self-start"
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            aria-busy={exporting}
          >
            {exporting ? 'Exportando CSV...' : 'Exportar CSV'}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-on-surface" htmlFor="regional-zone-filter">
            Zona
            <select
              id="regional-zone-filter"
              className="input-plain"
              value={selectedZone}
              onChange={(event) => {
                const nextZone = event.target.value
                setSelectedZone(nextZone)
                if (
                  nextZone !== 'all' &&
                  selectedClient !== 'all' &&
                  !clientsByZone.get(nextZone)?.has(selectedClient)
                ) {
                  setSelectedClient('all')
                }
              }}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone === 'all' ? 'Todas las zonas' : zone}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-on-surface" htmlFor="regional-client-filter">
            Cliente
            <select
              id="regional-client-filter"
              className="input-plain"
              value={normalizedSelectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
            >
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client === 'all' ? 'Todos los clientes' : client}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {visibleBuckets.map((bucket) => {
            return (
              <article key={bucket.geozone} className="rounded-2xl bg-surface-container-low p-4">
                <p className="text-sm font-semibold text-on-surface">{bucket.geozone}</p>
                <div className="mt-4 grid h-52 grid-cols-5 items-end gap-2 rounded-xl bg-surface-container p-3">
                  {bucket.fault_types.map((faultType) => {
                    const height = Math.round((faultType.count / max) * 170)
                    return (
                      <div key={faultType.type} className="flex h-full flex-col justify-end gap-1">
                        <div
                          className={`w-full rounded-sm ${faultTypeClass(faultType.type)}`}
                          style={{ height: `${Math.max(height, faultType.count > 0 ? 8 : 2)}px` }}
                          aria-label={`${faultType.count} fallas tipo ${faultType.type} en ${bucket.geozone}`}
                        />
                        <span className="text-xs font-medium text-on-surface-variant">
                          {shortFaultTypeLabel(faultType.type)}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-sm text-on-surface">
                  {bucket.fault_count} fallas · tasa {bucket.normalized_rate ?? 0}
                </p>
              </article>
            )
          })}
          {visibleBuckets.length === 0 ? (
            <p className="rounded-xl bg-surface-container p-4 text-sm text-on-surface-variant">
              No hay registros para esta combinacion de filtros.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function buildFaultsCsv(
  buckets: Array<{
    geozone: string
    fault_count: number
    normalized_rate?: number
    fault_types: Array<{ type: string; count: number }>
  }>,
): string {
  const lines = ['geozone,fault_count,normalized_rate,fault_type,fault_type_count']
  for (const bucket of buckets) {
    for (const faultType of bucket.fault_types) {
      lines.push(
        [bucket.geozone, bucket.fault_count, bucket.normalized_rate ?? '', faultType.type, faultType.count]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
    }
  }
  return `${lines.join('\n')}\n`
}

function downloadCsvBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function formatWindow(value: string): string {
  return new Date(value).toLocaleDateString('es-CO')
}

function shortFaultTypeLabel(type: string): string {
  if (type === 'arc_fault') return 'Arco'
  if (type === 'breaker_fatigue') return 'Breaker'
  if (type === 'degradation') return 'Degra'
  if (type === 'offline') return 'Off'
  return 'Rango'
}

function faultTypeClass(type: string): string {
  if (type === 'arc_fault') return 'bg-error-container text-on-error-container'
  if (type === 'breaker_fatigue') return 'bg-primary-container text-on-primary-container'
  if (type === 'degradation') return 'bg-secondary-container text-on-secondary-container'
  if (type === 'offline') return 'bg-secondary-container text-on-secondary-container'
  return 'bg-surface-container-high text-on-surface'
}
