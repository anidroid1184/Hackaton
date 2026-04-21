import { PromiseVsRealChart } from '../components/PromiseVsRealChart'
import { NaturalPageHero } from '../components/natural/NaturalPageHero'
import { NaturalStatCard } from '../components/natural/NaturalStatCard'
import { useResidentialNatural } from '../hooks/useResidentialNatural'
import { isRemoteStatsEnabled } from '../lib/naturalStatsApi'
import { formatCop, formatEnergy, formatInteger, formatPercent } from '../lib/format'

export function PerformanceNaturalPage() {
  const { bundle, loading, error } = useResidentialNatural()

  if (loading || !bundle) {
    return (
      <div
        className="mx-auto flex max-w-7xl flex-col gap-8 animate-enter"
        aria-busy="true"
        role="status"
      >
        <div className="h-32 animate-pulse rounded-2xl bg-surface-container-low" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(['a', 'b', 'c', 'd'] as const).map((id) => (
            <div key={id} className="h-28 animate-pulse rounded-2xl bg-surface-container-low" />
          ))}
        </div>
        <div className="card h-80 animate-pulse bg-surface-container-low" />
        <p className="text-center text-sm text-on-surface-variant">Cargando rendimiento…</p>
      </div>
    )
  }

  const summary = bundle.performanceSummary
  const pvr = bundle.promiseVsReal

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 animate-enter">
      {error && isRemoteStatsEnabled() ? (
        <aside
          role="alert"
          className="rounded-xl border border-error-container/60 bg-error-container/20 px-4 py-3 text-sm text-on-surface"
        >
          No se pudo contactar el mock-hub; mostrando datos locales. {error.message}
        </aside>
      ) : null}
      <NaturalPageHero
        eyebrow="Cliente residencial · Rendimiento"
        title="Rendimiento de tu sistema"
        description="Visualiza la eficiencia de tu instalación por semana y mes: compara lo prometido con lo generado en condiciones reales."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NaturalStatCard
          icon="bolt"
          label="Generación mensual"
          value={formatEnergy(summary.monthGenerationKwh, 'kWh')}
          tone="solar"
        />
        <NaturalStatCard
          icon="payments"
          label="Ahorro mensual"
          value={formatCop(summary.monthSavingsCop)}
          tone="green"
        />
        <NaturalStatCard
          icon="insights"
          label="Cumplimiento"
          value={formatPercent(summary.monthPerformancePct)}
          hint="frente al contrato"
        />
        <NaturalStatCard
          icon="calendar_view_week"
          label="Generación semanal"
          value={formatEnergy(summary.weekGenerationKwh, 'kWh')}
          hint="últimos 7 días"
        />
      </section>

      <section className="card p-6 sm:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-on-surface">
              Curva de rendimiento diario
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">{summary.efficiencyNote}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-on-surface-variant">
              Ventana analizada: {pvr.window.label}
            </p>
          </div>
          <div
            className={[
              'inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-end',
              pvr.fulfillmentPct >= 100
                ? 'bg-secondary-container/70 text-on-secondary-container'
                : 'bg-error-container/60 text-on-error-container',
            ].join(' ')}
          >
            <span aria-hidden className="material-symbols-outlined text-[1rem]">
              {pvr.fulfillmentPct >= 100 ? 'trending_up' : 'trending_down'}
            </span>
            {formatInteger(pvr.fulfillmentPct)}% del contrato
          </div>
        </div>
        <PromiseVsRealChart data={pvr} />
      </section>
    </div>
  )
}
