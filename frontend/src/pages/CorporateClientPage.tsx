import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCorporateElectricalComparisonData,
  fetchCorporateCoreData,
  getCorporateElectricalComparisonFallback,
  getCorporateCoreFallback,
  type ComparisonPeriod,
} from '../lib/roleDashboardApi'
import { useSimulationAutoRefresh } from '../hooks/useSimulationAutoRefresh'

type CorporateTab = 'roi' | 'kpi' | 'support'

const TABS: Array<{ id: CorporateTab; label: string; hint: string; icon: string }> = [
  {
    id: 'roi',
    label: 'ROI solar',
    hint: 'Generado VS meta contrato · payback',
    icon: 'query_stats',
  },
  {
    id: 'kpi',
    label: 'Registro KPI',
    hint: 'Vo, Io, fp, Hz, tipo de error e impacto',
    icon: 'tune',
  },
  {
    id: 'support',
    label: 'Soporte y SLA',
    hint: 'Tickets, visitas y riesgo financiero',
    icon: 'support_agent',
  },
]

export function CorporateClientPage() {
  useSimulationAutoRefresh()
  const [activeTab, setActiveTab] = useState<CorporateTab>('roi')
  const [data, setData] = useState(() => getCorporateCoreFallback())
  const [comparisonRows, setComparisonRows] = useState(() => getCorporateElectricalComparisonFallback())
  const [period, setPeriod] = useState<ComparisonPeriod>('month')
  const tabIdPrefix = useId()
  const tabId = (id: CorporateTab): string => `${tabIdPrefix}-tab-${id}`
  const panelId = (id: CorporateTab): string => `${tabIdPrefix}-panel-${id}`
  const { overview, roi, kpis, tickets } = data
  const comparisonByPeriod = useMemo(
    () => comparisonRows.filter((row) => row.period === period),
    [comparisonRows, period],
  )
  const periodSummary = useMemo(() => {
    const rows = comparisonByPeriod
    const totalSavings = rows.reduce((acc, row) => acc + row.savingsCop, 0)
    const totalEnergy = rows.reduce((acc, row) => acc + row.energyKwh, 0)
    const avgPf = rows.length > 0 ? rows.reduce((acc, row) => acc + row.powerFactor, 0) / rows.length : 0
    return { totalSavings, totalEnergy, avgPf }
  }, [comparisonByPeriod])
  const maxRoi = useMemo(
    () => Math.max(...roi.map((point) => Math.max(point.savingsCop, point.targetCop)), 1),
    [roi],
  )

  useEffect(() => {
    let mounted = true
    void Promise.all([fetchCorporateCoreData(), fetchCorporateElectricalComparisonData()]).then(
      ([nextData, nextComparison]) => {
        if (!mounted) return
        setData(nextData)
        setComparisonRows(nextComparison)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <header className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Cliente corporativo
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-on-surface">
          Consola industrial
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Visibilidad financiera y tecnica con foco en riesgo, cumplimiento y continuidad operativa.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ROI acumulado" value={formatCop(overview.roiAccumulatedCop)} hint="ahorro total" />
        <KpiCard label="Payback estimado" value={`${overview.paybackMonths} meses`} hint="proyeccion actual" />
        <KpiCard label="Riesgo expuesto" value={formatCop(overview.riskExposureCop)} hint="si no se interviene" />
        <KpiCard label="Cumplimiento SLA" value={`${overview.compliancePct}%`} hint={`${overview.openTickets} tickets abiertos`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="card p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Menu operativo
          </div>
          <div
            role="tablist"
            aria-label="Secciones del cliente corporativo"
            aria-orientation="vertical"
            className="mt-3 space-y-2"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={tabId(tab.id)}
                  aria-selected={isActive}
                  aria-controls={panelId(tab.id)}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
                    isActive
                      ? 'bg-primary-container/20 ring-1 ring-primary-container/40'
                      : 'hover:bg-surface-container',
                  ].join(' ')}
                >
                  <span
                    aria-hidden
                    className="material-symbols-outlined text-[1.1rem] text-on-surface-variant"
                  >
                    {tab.icon}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-on-surface">{tab.label}</span>
                    <span className="block text-xs text-on-surface-variant">{tab.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={panelId(activeTab)}
          aria-labelledby={tabId(activeTab)}
          className="card p-6 sm:p-8"
        >
          {activeTab === 'roi' ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold text-on-surface">
                    Ahorro real vs objetivo y payback
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Panel de rendimiento y ganancias con comparacion por periodo.
                  </p>
                </div>
                <label htmlFor="corporate-period-selector" className="text-sm font-semibold text-on-surface">
                  Periodo
                  <select
                    id="corporate-period-selector"
                    className="input-plain ml-2 min-w-[10rem] font-normal"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value as ComparisonPeriod)}
                  >
                    <option value="week">Semana</option>
                    <option value="month">Mes</option>
                    <option value="year">Ano</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <KpiCard
                  label="Ganancia estimada"
                  value={formatCop(periodSummary.totalSavings)}
                  hint={`Periodo: ${periodLabel(period)}`}
                />
                <KpiCard
                  label="Energia generada"
                  value={`${Math.round(periodSummary.totalEnergy).toLocaleString('es-CO')} kWh`}
                  hint="Suma de sistemas comparados"
                />
                <KpiCard
                  label="PF promedio"
                  value={periodSummary.avgPf.toFixed(2)}
                  hint="Factor de potencia agregado"
                />
              </div>
              <figure
                role="img"
                aria-label={`Ahorro real vs objetivo a lo largo de ${roi.length} meses. Mayor ahorro real: ${
                  roi.reduce((best, point) => (point.savingsCop > best.savingsCop ? point : best), roi[0])?.month ?? 'n/d'
                } con ${formatCop(Math.max(...roi.map((point) => point.savingsCop)))}.`}
                className="mt-5"
              >
                <span className="sr-only">
                  {`${roi.length} meses comparados. Mayor ahorro real: ${
                    roi.reduce((best, point) => (point.savingsCop > best.savingsCop ? point : best), roi[0])?.month ?? 'n/d'
                  } con ${formatCop(Math.max(...roi.map((point) => point.savingsCop)))}.`}
                </span>
                <div className="overflow-x-auto rounded-xl bg-surface-container p-4">
                  <div className="grid h-64 min-w-[640px] grid-cols-12 items-end gap-3">
                    {roi.map((point) => {
                      const realHeight = Math.round((point.savingsCop / maxRoi) * 200)
                      const targetHeight = Math.round((point.targetCop / maxRoi) * 200)
                      return (
                        <div key={point.month} className="flex h-full min-w-0 flex-col justify-end gap-2">
                          <div className="flex items-end gap-1">
                            <div
                              className="w-1/2 rounded bg-secondary"
                              style={{ height: `${Math.max(realHeight, 4)}px` }}
                              title={`Real: ${formatCop(point.savingsCop)}`}
                            />
                            <div
                              className="w-1/2 rounded bg-primary-container/70"
                              style={{ height: `${Math.max(targetHeight, 4)}px` }}
                              title={`Objetivo: ${formatCop(point.targetCop)}`}
                            />
                          </div>
                          <span className="text-xs text-on-surface-variant">{point.month}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <figcaption className="mt-4 text-sm text-on-surface-variant">
                  Barra verde = real, barra ambar = objetivo contractual.
                </figcaption>
              </figure>
              <div className="mt-6 rounded-2xl bg-surface-container-low p-4">
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Comparativo electrico por sistema (foco PF)
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Endpoint real: /corporate/electrical-comparison con fallback local robusto.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-outline-ghost text-left text-sm">
                    <thead>
                      <tr className="text-on-surface-variant">
                        <th className="px-3 py-2 font-semibold">Sistema</th>
                        <th className="px-3 py-2 font-semibold">PF actual</th>
                        <th className="px-3 py-2 font-semibold">PF objetivo</th>
                        <th className="px-3 py-2 font-semibold">Delta PF</th>
                        <th className="px-3 py-2 font-semibold">Ganancia</th>
                        <th className="px-3 py-2 font-semibold">Energia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-ghost">
                      {comparisonByPeriod.map((row) => {
                        const delta = row.powerFactor - row.targetPowerFactor
                        return (
                          <tr key={`${row.period}-${row.system}`}>
                            <td className="px-3 py-3 font-semibold text-on-surface">{row.system}</td>
                            <td className="px-3 py-3">{row.powerFactor.toFixed(2)}</td>
                            <td className="px-3 py-3">{row.targetPowerFactor.toFixed(2)}</td>
                            <td
                              className={[
                                'px-3 py-3 font-semibold',
                                delta >= 0 ? 'text-secondary' : 'text-error',
                              ].join(' ')}
                            >
                              {delta >= 0 ? '+' : ''}
                              {delta.toFixed(2)}
                            </td>
                            <td className="px-3 py-3">{formatCop(row.savingsCop)}</td>
                            <td className="px-3 py-3">{Math.round(row.energyKwh).toLocaleString('es-CO')} kWh</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'kpi' ? (
            <>
              <h2 className="font-display text-xl font-bold text-on-surface">
                Registro KPI y errores diferenciados por planta
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-outline-ghost text-left text-sm">
                  <thead>
                    <tr className="text-on-surface-variant">
                      <th className="px-3 py-2 font-semibold">Planta</th>
                      <th className="px-3 py-2 font-semibold">Vo</th>
                      <th className="px-3 py-2 font-semibold">Io</th>
                      <th className="px-3 py-2 font-semibold">fp</th>
                      <th className="px-3 py-2 font-semibold">Hz</th>
                      <th className="px-3 py-2 font-semibold">kWh</th>
                      <th className="px-3 py-2 font-semibold">Tipo de error</th>
                      <th className="px-3 py-2 font-semibold">Detalle</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-ghost">
                    {kpis.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-3 font-semibold text-on-surface">{row.plant}</td>
                        <td className="px-3 py-3">{row.vo}</td>
                        <td className="px-3 py-3">{row.io}</td>
                        <td className="px-3 py-3">{row.fp}</td>
                        <td className="px-3 py-3">{row.hz}</td>
                        <td className="px-3 py-3">{row.energyKwh}</td>
                        <td className="px-3 py-3">{formatErrorType(row.errorType)}</td>
                        <td className="px-3 py-3">{row.errorDetail}</td>
                        <td className="px-3 py-3">
                          <span className={statusClass(row.status)}>{row.status.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {activeTab === 'support' ? (
            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl bg-surface-container-low p-5">
                <h3 className="font-display text-lg font-bold text-on-surface">Tickets activos</h3>
                <div className="mt-4 space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-xl bg-surface-container-lowest p-4">
                      <p className="font-semibold text-on-surface">{ticket.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        Estado: {ticket.state} · SLA: {ticket.slaHours}h
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Riesgo estimado: {formatCop(ticket.impactCop)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl bg-surface-container-low p-5">
                <h3 className="font-display text-lg font-bold text-on-surface">Canal directo</h3>
                <p className="mt-3 text-sm text-on-surface-variant">
                  Contacto a Operaciones TR: operaciones@techorentable.co · +57 601 400 9988
                </p>
                <Link to="/support" className="btn-secondary mt-4 inline-flex w-fit items-center">
                  Crear ticket de soporte
                </Link>
              </article>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="card p-5">
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface">{value}</p>
      <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
    </article>
  )
}

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function statusClass(status: 'ok' | 'warn' | 'critical'): string {
  if (status === 'ok') return 'rounded-full bg-secondary-container/70 px-3 py-1 text-xs font-semibold text-on-secondary-container'
  if (status === 'warn') return 'rounded-full bg-primary-container/70 px-3 py-1 text-xs font-semibold text-on-primary-container'
  return 'rounded-full bg-error-container/70 px-3 py-1 text-xs font-semibold text-on-error-container'
}

function formatErrorType(type: string): string {
  if (type === 'arc_fault') return 'Arco electrico'
  if (type === 'degradation') return 'Degradacion'
  if (type === 'breaker_fatigue') return 'Fatiga breaker'
  if (type === 'offline') return 'Offline'
  return 'Fuera de rango'
}

function periodLabel(period: ComparisonPeriod): string {
  if (period === 'week') return 'Semana'
  if (period === 'month') return 'Mes'
  return 'Ano'
}
