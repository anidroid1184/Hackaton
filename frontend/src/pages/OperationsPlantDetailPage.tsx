import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import {
  fetchOperationsPlantDetailData,
  getOperationsPlantDetailFallback,
} from '../lib/roleDashboardApi'

export function OperationsPlantDetailPage() {
  const { plantId = '' } = useParams<{ plantId: string }>()
  const [data, setData] = useState(() => getOperationsPlantDetailFallback(plantId))

  useEffect(() => {
    let mounted = true
    void fetchOperationsPlantDetailData(plantId).then((nextData) => {
      if (!mounted) return
      setData(nextData)
    })
    return () => {
      mounted = false
    }
  }, [plantId])

  if (!data) {
    return (
      <div className="card mx-auto max-w-3xl p-8">
        <h1 className="font-display text-2xl font-bold text-on-surface">Planta no encontrada</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          La referencia solicitada no existe en los datos mock actuales.
        </p>
        <Link className="btn-secondary mt-4 inline-flex" to="/operaciones/dashboard">
          Volver a Fleet
        </Link>
      </div>
    )
  }

  const { plant, alerts } = data

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Detalle de planta"
        title={plant.plantName}
        description={plant.addressLine}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Cliente" value={plant.clientName} icon="apartment" />
        <MetricCard label="Zona" value={plant.geozone} icon="map" />
        <MetricCard label="Alertas activas" value={String(plant.activeAlerts)} icon="warning" />
      </section>

      <section className="card p-6">
        <h2 className="font-display text-xl font-bold text-on-surface">Alertas recientes</h2>
        <div className="mt-4 space-y-3">
          {alerts.length ? (
            alerts.map((alert) => (
              <article key={alert.id} className="rounded-xl bg-surface-container-low p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {alert.severity} · {new Date(alert.ts).toLocaleString('es-CO')}
                </p>
                <p className="mt-1 text-sm text-on-surface">{alert.summary}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">Sin alertas recientes.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <article className="card p-5">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span aria-hidden className="material-symbols-outlined text-lg text-on-surface-variant">
          {icon}
        </span>
        <p className="font-display text-lg font-semibold text-on-surface">{value}</p>
      </div>
    </article>
  )
}
