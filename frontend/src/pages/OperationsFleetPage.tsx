import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import { fetchOperationsCoreData, getOperationsCoreFallback } from '../lib/roleDashboardApi'
import { useSimulationAutoRefresh } from '../hooks/useSimulationAutoRefresh'

export function OperationsFleetPage() {
  useSimulationAutoRefresh()
  const [plants, setPlants] = useState(() => getOperationsCoreFallback().plants)

  useEffect(() => {
    let mounted = true
    void fetchOperationsCoreData().then((data) => {
      if (!mounted) return
      setPlants(data.plants)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Operaciones Techos Rentables"
        title="Fleet Overview"
        description="Supervisa estado, alertas activas y proximas visitas de toda la flota."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plants.map((plant) => (
          <article key={plant.id} className="card flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-on-surface-variant">{plant.clientName}</p>
                <h2 className="font-display text-xl font-bold text-on-surface">{plant.plantName}</h2>
              </div>
              <span className={statusPillClassname(plant.status)}>{statusLabel(plant.status)}</span>
            </div>
            <p className="text-sm text-on-surface-variant">{plant.addressLine}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-on-surface-variant">Zona</dt>
                <dd className="font-semibold text-on-surface">{plant.geozone}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">Alertas activas</dt>
                <dd className="font-semibold text-on-surface">{plant.activeAlerts}</dd>
              </div>
            </dl>
            <Link className="btn-secondary mt-auto" to={`/operaciones/plants/${plant.id}`}>
              <span aria-hidden className="material-symbols-outlined text-base">
                visibility
              </span>
              Ver detalle de planta
            </Link>
          </article>
        ))}
      </section>
    </div>
  )
}

function statusLabel(status: 'ok' | 'warn' | 'critical') {
  if (status === 'ok') return 'Estable'
  if (status === 'warn') return 'Atencion'
  return 'Critico'
}

function statusPillClassname(status: 'ok' | 'warn' | 'critical') {
  if (status === 'ok') return 'rounded-full bg-secondary-container/60 px-3 py-1 text-xs font-semibold text-on-secondary-container'
  if (status === 'warn') return 'rounded-full bg-primary-container/60 px-3 py-1 text-xs font-semibold text-on-primary-container'
  return 'rounded-full bg-error-container/70 px-3 py-1 text-xs font-semibold text-on-error-container'
}
