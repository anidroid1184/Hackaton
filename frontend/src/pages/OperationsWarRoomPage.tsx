import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import { fetchOperationsWarRoomData, getOperationsCoreFallback } from '../lib/roleDashboardApi'
import { TimeSlider } from '../components/TimeSlider'
import { useTimeWindow } from '../hooks/useTimeWindow'

export function OperationsWarRoomPage() {
  const [alerts, setAlerts] = useState(() => getOperationsCoreFallback().alerts)
  const { window: timeWindow } = useTimeWindow()

  useEffect(() => {
    let mounted = true
    void fetchOperationsWarRoomData().then((data) => {
      if (!mounted) return
      setAlerts(data)
    })
    return () => {
      mounted = false
    }
  }, [timeWindow.from, timeWindow.to, timeWindow.t])

  const anchorTs = new Date(timeWindow.t).getTime()
  const visibleAlerts = alerts.filter((alert) => {
    const alertTs = new Date(alert.ts).getTime()
    return Number.isFinite(alertTs) ? alertTs <= anchorTs : true
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Operaciones Techos Rentables"
        title="War Room"
        description="Prioriza alertas criticas y asigna tecnico sugerido por zona."
      />

      <TimeSlider label="Ventana operativa" />

      <section className="space-y-4">
        {visibleAlerts.length === 0 ? (
          <p className="card p-5 text-sm text-on-surface-variant">
            No hay alertas dentro de la ventana temporal seleccionada.
          </p>
        ) : null}
        {visibleAlerts.map((alert) => (
          <article key={alert.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-on-surface-variant">
                  {new Date(alert.ts).toLocaleString('es-CO')}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-on-surface">
                  {alert.plantName}
                </h2>
                <p className="break-words text-sm text-on-surface-variant">{alert.summary}</p>
              </div>
              <span className={severityClass(alert.severity)}>{alert.severity.toUpperCase()}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-on-surface">
                Zona: <strong>{alert.geozone}</strong> · Tecnico sugerido:{' '}
                <strong>{alert.suggestedTechnicianName}</strong>
              </p>
              <Link className="btn-secondary" to={`/operaciones/plants/${alert.plantId}`}>
                Ir a detalle
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

function severityClass(severity: 'info' | 'warn' | 'critical'): string {
  if (severity === 'critical') {
    return 'rounded-full bg-error-container/70 px-3 py-1 text-xs font-semibold text-on-error-container'
  }
  if (severity === 'warn') {
    return 'rounded-full bg-primary-container/70 px-3 py-1 text-xs font-semibold text-on-primary-container'
  }
  return 'rounded-full bg-secondary-container/60 px-3 py-1 text-xs font-semibold text-on-secondary-container'
}
