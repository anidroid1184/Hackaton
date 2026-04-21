import { useEffect, useMemo, useState } from 'react'
import {
  fetchTechnicianTelemetrySnapshotData,
  type TechnicianTelemetrySnapshot,
} from '../lib/roleDashboardApi'
import { useSimulationAutoRefresh } from '../hooks/useSimulationAutoRefresh'

type BufferItem = {
  id: string
  note: string
  createdAt: string
}

export function FieldTechnicianTelemetryPage() {
  useSimulationAutoRefresh()
  const [snapshot, setSnapshot] = useState<TechnicianTelemetrySnapshot[]>([])
  const [offlineMode, setOfflineMode] = useState(false)
  const [buffer, setBuffer] = useState<BufferItem[]>([])
  const [note, setNote] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('all')
  const [selectedZone, setSelectedZone] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'online' | 'offline'>('all')

  const queueLabel = useMemo(() => `${buffer.length} pendiente(s)`, [buffer.length])
  const plantOptions = useMemo(
    () => ['all', ...new Set(snapshot.map((item) => item.plant))],
    [snapshot],
  )
  const zoneOptions = useMemo(
    () => ['all', ...new Set(snapshot.map((item) => item.geozone))],
    [snapshot],
  )

  const filteredSnapshot = useMemo(() => {
    return snapshot.filter((item) => {
      const currentStatus = offlineMode ? 'offline' : item.status
      const byPlant = selectedPlant === 'all' || item.plant === selectedPlant
      const byZone = selectedZone === 'all' || item.geozone === selectedZone
      const byStatus = selectedStatus === 'all' || currentStatus === selectedStatus
      return byPlant && byZone && byStatus
    })
  }, [offlineMode, selectedPlant, selectedStatus, selectedZone, snapshot])

  function enqueueNote() {
    if (!note.trim()) return
    setBuffer((prev) => [
      {
        id: `buf-${Date.now()}`,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setNote('')
  }

  function syncBuffer() {
    setBuffer([])
    setOfflineMode(false)
  }

  useEffect(() => {
    let mounted = true
    void fetchTechnicianTelemetrySnapshotData().then((nextSnapshot) => {
      if (!mounted) return
      setSnapshot(nextSnapshot)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <header className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Tecnico de Campo
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-on-surface">
          Telemetria por planta y zona
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant">
          Filtra por planta, zona y conectividad. El estado online/offline se refleja por visita activa.
        </p>
      </header>

      <section className="card p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-on-surface-variant" htmlFor="telemetry-plant-filter">
            Planta
            <select
              id="telemetry-plant-filter"
              className="input mt-2"
              value={selectedPlant}
              onChange={(event) => setSelectedPlant(event.target.value)}
            >
              {plantOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todas' : option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-on-surface-variant" htmlFor="telemetry-zone-filter">
            Zona
            <select
              id="telemetry-zone-filter"
              className="input mt-2"
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
            >
              {zoneOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Todas' : option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-on-surface-variant" htmlFor="telemetry-status-filter">
            Estado
            <select
              id="telemetry-status-filter"
              className="input mt-2"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as 'all' | 'online' | 'offline')}
            >
              <option value="all">Online y offline</option>
              <option value="online">Solo online</option>
              <option value="offline">Solo offline</option>
            </select>
          </label>
        </div>
      </section>

      {filteredSnapshot.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Sin resultados con los filtros actuales.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {filteredSnapshot.map((item) => {
          const status = offlineMode ? 'offline' : item.status
          return (
            <article key={item.id} className="card p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-on-surface-variant">{item.geozone}</p>
                  <p className="mt-1 break-words font-display text-xl font-bold text-on-surface">{item.plant}</p>
                </div>
                <span className={statusClass(status)}>{status}</span>
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                Tecnico: {item.technician ?? 'Sin asignar'}
              </p>
              <div className="mt-3 space-y-1">
                {item.metrics.map((metric) => (
                  <p key={`${item.id}-${metric.label}`} className="text-sm text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{metric.label}:</span> {metric.value}
                  </p>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-on-surface">Cola offline</h2>
          <button
            type="button"
            onClick={() => setOfflineMode((v) => !v)}
            className={offlineMode ? 'btn-primary' : 'btn-secondary'}
          >
            {offlineMode ? 'Modo offline activo' : 'Activar modo offline'}
          </button>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Estado buffer: {queueLabel}. Si recuperas conectividad, sincroniza en un click.
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Al sincronizar, las notas se enviarian con idempotencia para evitar duplicados.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <label htmlFor="telemetry-note" className="sr-only">
            Nota tecnica / lectura manual
          </label>
          <input
            id="telemetry-note"
            className="input w-full flex-1 sm:min-w-0"
            placeholder="Nota tecnica / lectura manual"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button className="btn-secondary" type="button" onClick={enqueueNote}>
            Encolar
          </button>
          <button className="btn-primary" type="button" onClick={syncBuffer}>
            Sincronizar
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {buffer.map((item) => (
            <article key={item.id} className="rounded-xl bg-surface-container-low p-3 text-sm">
              <p className="text-on-surface">{item.note}</p>
              <p className="text-xs text-on-surface-variant">
                {new Date(item.createdAt).toLocaleString('es-CO')}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function statusClass(status: 'online' | 'offline'): string {
  if (status === 'online') {
    return 'rounded-full bg-secondary-container/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-on-secondary-container'
  }
  return 'rounded-full bg-error-container/70 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-on-error-container'
}
