import { useEffect, useId, useMemo, useState } from 'react'
import { fetchOperationsCoreData, getOperationsCoreFallback } from '../lib/roleDashboardApi'
import type { FleetPlant, FleetPlantStatus } from '../lib/operationsMockData'
import { TimeSlider } from '../components/TimeSlider'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'

type PlantKpis = { energyKwh: number; powerFactor: number; uptimePct: number }
type BarRow = { id: string; label: string; value: number; max: number; formatted: string }

const DEFAULT_KPIS: PlantKpis = { energyKwh: 300, powerFactor: 0.93, uptimePct: 97.5 }
const MAX_SELECTED = 4
const STATUS_LABEL: Record<FleetPlantStatus, string> = { ok: 'OK', warn: 'Alerta', critical: 'Critico' }

function readKpis(plant: FleetPlant): PlantKpis {
  const maybe = (plant as FleetPlant & { kpis?: Partial<PlantKpis> }).kpis
  return {
    energyKwh: maybe?.energyKwh ?? DEFAULT_KPIS.energyKwh,
    powerFactor: maybe?.powerFactor ?? DEFAULT_KPIS.powerFactor,
    uptimePct: maybe?.uptimePct ?? DEFAULT_KPIS.uptimePct,
  }
}

function statusPill(status: FleetPlantStatus): string {
  const base = 'rounded-full px-2.5 py-0.5 text-xs font-semibold'
  if (status === 'critical') return `${base} bg-error-container/70 text-on-error-container`
  if (status === 'warn') return `${base} bg-primary-container/70 text-on-primary-container`
  return `${base} bg-secondary-container/60 text-on-secondary-container`
}

function Bars({ title, suffix, rows }: { title: string; suffix: string; rows: BarRow[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-base font-semibold text-on-surface">{title}</h3>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const pct = row.max > 0 ? Math.min(100, Math.max(0, (row.value / row.max) * 100)) : 0
          return (
            <li key={row.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm text-on-surface">
                <span className="truncate">{row.label}</span>
                <span className="font-mono text-xs text-on-surface-variant">{row.formatted}{suffix}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container"
                role="progressbar" aria-label={`${title} - ${row.label}`}
                aria-valuenow={Number(row.value.toFixed(2))} aria-valuemin={0} aria-valuemax={Number(row.max.toFixed(2))}
                aria-hidden>
                <div className="h-full rounded-full bg-primary-container/60" style={{ width: `${pct}%` }} aria-hidden />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function OperationsComparePlantsPage() {
  const [plants, setPlants] = useState<FleetPlant[]>(() => getOperationsCoreFallback().plants)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectorId = useId()

  useEffect(() => {
    let mounted = true
    void fetchOperationsCoreData().then((data) => {
      if (mounted) setPlants(data.plants)
    })
    return () => {
      mounted = false
    }
  }, [])

  const kpiRows = useMemo(
    () =>
      plants
        .filter((plant) => selectedIds.includes(plant.id))
        .map((plant) => ({ plant, kpis: readKpis(plant) })),
    [plants, selectedIds],
  )

  const maxEnergy = Math.max(1, ...kpiRows.map((r) => r.kpis.energyKwh))
  const maxPf = Math.max(0.01, ...kpiRows.map((r) => r.kpis.powerFactor))
  const maxUptime = Math.max(1, ...kpiRows.map((r) => r.kpis.uptimePct))

  const toggle = (id: string) => setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_SELECTED ? prev : [...prev, id])
  const limitReached = selectedIds.length >= MAX_SELECTED
  const mkRow = (p: FleetPlant, value: number, max: number, formatted: string): BarRow => ({
    id: p.id, label: p.plantName, value, max, formatted,
  })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Operaciones Techos Rentables"
        title="Comparar plantas"
        description={`Selecciona hasta ${MAX_SELECTED} plantas para comparar KPIs energia, PF y uptime.`}
      />

      <TimeSlider label="Ventana comparativa" />

      <section className="card p-5" aria-labelledby={`${selectorId}-title`}>
        <h2 id={`${selectorId}-title`} className="font-display text-lg font-semibold text-on-surface">
          Flota disponible ({selectedIds.length}/{MAX_SELECTED})
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => {
            const checked = selectedIds.includes(plant.id)
            const disabled = !checked && limitReached
            const inputId = `${selectorId}-${plant.id}`
            return (
              <li key={plant.id} className="flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container/40 px-3 py-2">
                <input id={inputId} type="checkbox" checked={checked} disabled={disabled}
                  onChange={() => toggle(plant.id)} className="h-4 w-4 accent-[var(--color-primary-container)]" />
                <label htmlFor={inputId} className="flex-1 cursor-pointer text-sm text-on-surface">
                  <span className="font-semibold">{plant.plantName}</span>
                  <span className="block text-xs text-on-surface-variant">{plant.geozone}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card p-5">
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="mb-3 text-left font-display text-lg font-semibold text-on-surface">
              Tabla comparativa
            </caption>
            <thead className="text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th scope="col" className="py-2 pr-4 text-left">Planta</th>
                <th scope="col" className="py-2 pr-4 text-right">Energia (kWh)</th>
                <th scope="col" className="py-2 pr-4 text-right">PF</th>
                <th scope="col" className="py-2 pr-4 text-right">Uptime %</th>
                <th scope="col" className="py-2 pr-4 text-right">Alertas</th>
                <th scope="col" className="py-2 text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-on-surface-variant">
                    Selecciona al menos una planta para iniciar la comparacion.
                  </td>
                </tr>
              ) : (
                kpiRows.map(({ plant, kpis }) => (
                  <tr key={plant.id} className="border-t border-outline-variant/40">
                    <th scope="row" className="py-2 pr-4 text-left font-medium text-on-surface">{plant.plantName}</th>
                    <td className="py-2 pr-4 text-right font-mono">{kpis.energyKwh.toFixed(0)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{kpis.powerFactor.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{kpis.uptimePct.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-right font-mono">{plant.activeAlerts}</td>
                    <td className="py-2 text-right"><span className={statusPill(plant.status)}>{STATUS_LABEL[plant.status]}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {kpiRows.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Bars title="Energia (kWh)" suffix=" kWh"
            rows={kpiRows.map(({ plant, kpis }) => mkRow(plant, kpis.energyKwh, maxEnergy, kpis.energyKwh.toFixed(0)))} />
          <Bars title="Factor de potencia" suffix=""
            rows={kpiRows.map(({ plant, kpis }) => mkRow(plant, kpis.powerFactor, maxPf, kpis.powerFactor.toFixed(2)))} />
          <Bars title="Uptime %" suffix=" %"
            rows={kpiRows.map(({ plant, kpis }) => mkRow(plant, kpis.uptimePct, maxUptime, kpis.uptimePct.toFixed(1)))} />
        </section>
      ) : null}
    </div>
  )
}
