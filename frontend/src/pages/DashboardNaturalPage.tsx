import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PromiseVsRealChart } from '../components/PromiseVsRealChart'
import { TimeSlider } from '../components/TimeSlider'
import { useResidentialNatural } from '../hooks/useResidentialNatural'
import { isRemoteStatsEnabled } from '../lib/naturalStatsApi'
import {
  formatCop,
  formatEnergy,
  formatInteger,
  formatPercent,
} from '../lib/format'
import { useAuth } from '../auth/AuthContext'
import {
  buildUserProfileStorageKey,
  calculateSavingsCop,
  getDefaultUserProfile,
  loadUserProfileFromStorage,
} from '../lib/userProfileStorage'
import { useSimulationAutoRefresh } from '../hooks/useSimulationAutoRefresh'

/**
 * Dashboard del perfil Cliente Natural (residencial).
 *
 * Secciones (ver docs/USER_FLOWS.md §1):
 * 1. Hero emocional — kWh del día, ahorro $ y sensación "hoy fue un buen día solar".
 * 2. Promesa vs Real — gráfica de 2 líneas (pieza core de este rol).
 * 3. Impacto ambiental — CO2 evitado y equivalencia visual (árboles).
 * 4. Reportes — descarga simplificada / técnica.
 * 5. Banner técnico asignado — cuando hay visita programada en `maintenances`.
 */
export function DashboardNaturalPage() {
  useSimulationAutoRefresh()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const { bundle, loading, error } = useResidentialNatural()
  const prefix = pathname.startsWith('/preview/cliente') ? '/preview/cliente' : ''
  const profileStorageKey = buildUserProfileStorageKey(user?.role, user?.email)
  const profile = loadUserProfileFromStorage(profileStorageKey, getDefaultUserProfile(user ?? {}))
  const effectiveEnergyRate = profile.energyRateCopKwh

  const treeTiles = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ id: `tree-${i}`, index: i })),
    [],
  )

  if (loading || !bundle) {
    return (
      <div
        className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter"
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        <div className="card h-48 animate-pulse bg-surface-container-low" />
        <div className="card h-96 animate-pulse bg-surface-container-low" />
        <p className="text-center text-sm text-on-surface-variant">Cargando métricas…</p>
      </div>
    )
  }

  const { snapshot, promiseVsReal: pvr } = bundle

  const greeting = resolveGreeting()
  const userName = snapshot.clientName || user?.email?.split('@')[0] || 'vecino'
  const isAbovePromise = snapshot.today.vsPromisePct >= 100
  const todaySavingsCop = calculateSavingsCop(snapshot.today.kwh, effectiveEnergyRate)
  const cumulativeSavingsCop = calculateSavingsCop(snapshot.cumulative.kwh, effectiveEnergyRate)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 animate-enter">
      {error && isRemoteStatsEnabled() ? (
        <aside
          role="alert"
          className="rounded-xl border border-error-container/60 bg-error-container/20 px-4 py-3 text-sm text-on-surface"
        >
          No se pudo contactar el mock-hub; mostrando datos locales. {error.message}
        </aside>
      ) : null}
      <TimeSlider label="Ventana temporal del día" />
      {/* ---------- Hero emocional ---------- */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden rounded-2xl border border-outline-ghost bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-surface-container-low p-6 shadow-ambient sm:p-8 md:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[120px]"
          style={{ background: 'var(--color-scrim-solar)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full blur-[100px]"
          style={{ background: 'var(--color-scrim-green)' }}
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              {greeting} · {snapshot.plantName}
            </p>
            <h1
              id="hero-title"
              className="mt-3 font-display text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl md:text-5xl"
            >
              Hola {userName}, hoy tu sol{' '}
              <span className="relative inline-block">
                <span className="relative z-10 text-on-surface">
                  {isAbovePromise ? 'superó la meta' : 'viene bien'}
                </span>
                <span
                  aria-hidden
                  className="absolute bottom-1 left-0 -z-0 h-3 w-full rounded bg-primary-container/35"
                />
              </span>
              .
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant md:text-lg">
              Generaste{' '}
              <span className="font-semibold text-on-surface">
                {formatEnergy(snapshot.today.kwh, 'kWh')}
              </span>{' '}
              y ahorraste{' '}
              <span className="font-semibold text-on-surface">
                {formatCop(todaySavingsCop)}
              </span>{' '}
              frente a la tarifa de red. Eso es un{' '}
              <span className="font-semibold text-secondary">
                {formatPercent(snapshot.today.vsPromisePct - 100)}{' '}
              </span>
              vs. lo prometido en tu contrato.
            </p>
          </div>
          <p className="text-xs text-on-surface-variant">
            Tarifa usada para el cálculo: {formatCop(effectiveEnergyRate)} / kWh
          </p>

          {/* Tarjetas KPI del día */}
          <div className="grid w-full max-w-md grid-cols-3 gap-3 sm:gap-4 lg:w-auto lg:max-w-none">
            <KpiTile
              icon="bolt"
              label="kWh hoy"
              value={formatEnergy(snapshot.today.kwh, 'kWh')}
              accent="solar"
            />
            <KpiTile
              icon="savings"
              label="Ahorro hoy"
              value={formatCop(todaySavingsCop)}
              accent="green"
            />
            <KpiTile
              icon="eco"
              label="CO₂ evitado"
              value={formatEnergy(snapshot.today.co2KgAvoided, 'kg')}
              accent="green-soft"
            />
          </div>
        </div>
      </section>

      {/* ---------- Banner técnico asignado (si existe) ---------- */}
      {snapshot.technicianNotice ? (
        <aside
          aria-label="Notificación de visita técnica"
          className="flex flex-col items-start gap-4 rounded-2xl border border-tertiary-container/50 bg-tertiary-container/25 p-5 sm:flex-row sm:items-center"
        >
          <span
            aria-hidden
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container"
          >
            <span className="material-symbols-outlined text-[1.3rem]">engineering</span>
          </span>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-tertiary-container">
              Técnico asignado
            </p>
            <p className="mt-1 font-display text-lg font-bold text-on-surface">
              {snapshot.technicianNotice.technicianName} visitará tu instalación
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {snapshot.technicianNotice.visitWindow} · No necesitas estar presente; te dejaremos
              un resumen al finalizar.
            </p>
          </div>
          <Link to={`${prefix}/agenda`} className="btn-secondary">
            <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
              calendar_month
            </span>
            Ver agenda
          </Link>
        </aside>
      ) : null}

      {/* ---------- Promesa vs Real ---------- */}
      <section
        aria-labelledby="promise-title"
        className="card p-6 sm:p-8"
      >
        <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Promesa y realidad
            </p>
            <h2
              id="promise-title"
              className="mt-1 font-display text-2xl font-bold tracking-tight text-on-surface md:text-3xl"
            >
              Nuestra promesa vs lo que generaste
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
              Mes a mes en kWh: la línea discontinua ámbar es lo que prometimos en tu contrato; la
              línea verde es la energía que realmente generaste.
            </p>
          </div>
          <div
            className={[
              'inline-flex items-center gap-2 self-start rounded-full px-4 py-2 font-display text-sm font-bold sm:self-end',
              pvr.fulfillmentPct >= 100
                ? 'bg-secondary-container/70 text-on-secondary-container'
                : 'bg-error-container/60 text-on-error-container',
            ].join(' ')}
            aria-live="polite"
          >
            <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
              {pvr.fulfillmentPct >= 100 ? 'trending_up' : 'trending_down'}
            </span>
            {formatInteger(pvr.fulfillmentPct)}% del contrato
          </div>
        </header>

        <div className="mt-6">
          <PromiseVsRealChart data={pvr} />
        </div>
      </section>

      {/* ---------- Impacto ambiental ---------- */}
      <section
        aria-labelledby="impact-title"
        className="grid gap-6 md:grid-cols-[1.4fr_1fr]"
      >
        <div className="card overflow-hidden p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Impacto ambiental acumulado
          </p>
          <h2
            id="impact-title"
            className="mt-1 font-display text-2xl font-bold tracking-tight text-on-surface md:text-3xl"
          >
            Tu techo ya equivale a{' '}
            <span className="text-secondary">
              {formatInteger(snapshot.cumulative.treesEquivalent)} árboles
            </span>{' '}
            plantados.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-on-surface-variant">
            Desde que instalamos tu sistema has evitado{' '}
            <span className="font-semibold text-on-surface">
              {formatEnergy(snapshot.cumulative.co2KgAvoided, 'kgCO₂')}
            </span>{' '}
            de emisiones. Eso no tiene precio, pero sí tiene impacto.
          </p>

          <div
            aria-hidden
            className="mt-6 grid grid-cols-12 gap-1.5"
          >
            {treeTiles.map(({ id, index: i }) => {
              const filled = i < Math.min(36, Math.round(snapshot.cumulative.treesEquivalent / 2))
              return (
                <span
                  key={id}
                  className={[
                    'flex aspect-square items-center justify-center rounded-md text-[0.95rem] transition',
                    filled
                      ? 'bg-secondary-container/70 text-on-secondary-container'
                      : 'bg-surface-container text-on-surface-variant/40',
                  ].join(' ')}
                >
                  <span className="material-symbols-outlined text-base">
                    park
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        <div className="card flex flex-col gap-5 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Lo acumulado
          </p>
          <CumulativeRow
            icon="bolt"
            label="Energía generada"
            value={formatEnergy(snapshot.cumulative.kwh, 'kWh')}
          />
          <CumulativeRow
            icon="payments"
            label="Ahorro total"
            value={formatCop(cumulativeSavingsCop)}
          />
          <CumulativeRow
            icon="eco"
            label="CO₂ evitado"
            value={formatEnergy(snapshot.cumulative.co2KgAvoided, 'kgCO₂')}
          />
          <CumulativeRow
            icon="park"
            label="Árboles equivalentes"
            value={formatInteger(snapshot.cumulative.treesEquivalent)}
          />
        </div>
      </section>

      {/* ---------- Reportes ---------- */}
      <section aria-labelledby="reports-title" className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Reportes
          </p>
          <h2
            id="reports-title"
            className="font-display text-2xl font-bold tracking-tight text-on-surface md:text-3xl"
          >
            Descarga lo que necesitas
          </h2>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <ReportCard
            tone="solar"
            icon="description"
            title="Reporte simplificado"
            description="Resumen mensual: kWh, ahorro y CO₂ evitado, en una sola página lista para compartir."
            actionLabel="Descargar PDF"
            to={`${prefix}/reports/pdf`}
          />
          <ReportCard
            tone="green"
            icon="analytics"
            title="Reporte técnico"
            description="Detalle de potencias, factor de planta y desviaciones por franja horaria. Ideal para tu instalador."
            actionLabel="Descargar PDF técnico"
            to={`${prefix}/reports/pdf`}
          />
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          Los reportes consumen <code className="font-mono">GET /reports/generate</code> (FastAPI)
          con tu sesión Supabase. Mientras conectamos la API real usamos datos de demostración.
        </p>
      </section>

      <footer className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-outline-ghost pt-6 text-xs text-on-surface-variant">
        <span>
          Datos de demostración · conecta tu planta para ver métricas en vivo.
        </span>
        <Link
          to={`${prefix}/support`}
          className="rounded-full font-semibold text-on-surface underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
        >
          ¿Necesitas ayuda?
        </Link>
      </footer>
    </div>
  )
}

function resolveGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'De madrugada'
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

type KpiTileProps = {
  icon: string
  label: string
  value: string
  accent: 'solar' | 'green' | 'green-soft'
}

function KpiTile({ icon, label, value, accent }: KpiTileProps) {
  const accentMap = {
    solar: 'bg-primary-container/15 text-primary-container ring-primary-container/25',
    green: 'bg-secondary-container/40 text-on-secondary-container ring-secondary/25',
    'green-soft':
      'bg-secondary/10 text-secondary ring-secondary/25',
  } as const
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-container-lowest/80 p-4 ring-1 ring-outline-ghost backdrop-blur">
      <div className="flex items-center justify-between">
        <span
          aria-hidden
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ${accentMap[accent]}`}
        >
          <span className="material-symbols-outlined text-[1.05rem]">{icon}</span>
        </span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className="font-display text-xl font-extrabold leading-tight tracking-tight text-on-surface sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

function CumulativeRow({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container"
      >
        <span className="material-symbols-outlined text-[1.1rem] text-on-surface-variant">
          {icon}
        </span>
      </span>
      <div className="flex-1">
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="font-display font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  )
}

function ReportCard({
  tone,
  icon,
  title,
  description,
  actionLabel,
  to,
}: {
  tone: 'solar' | 'green'
  icon: string
  title: string
  description: string
  actionLabel: string
  to: string
}) {
  const toneMap = {
    solar:
      'bg-gradient-to-br from-primary-container/15 via-surface-container-lowest to-surface-container-lowest',
    green:
      'bg-gradient-to-br from-secondary-container/40 via-surface-container-lowest to-surface-container-lowest',
  } as const

  const iconTone =
    tone === 'solar'
      ? 'bg-primary-container text-on-primary-container'
      : 'bg-secondary text-on-secondary'

  return (
    <article
      className={`card relative flex flex-col gap-4 overflow-hidden p-6 ${toneMap[tone]}`}
    >
      <span
        aria-hidden
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${iconTone}`}
      >
        <span className="material-symbols-outlined text-[1.2rem]">{icon}</span>
      </span>
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">{title}</h3>
        <p className="mt-1 text-sm text-on-surface-variant">{description}</p>
      </div>
      <Link to={to} className="btn-secondary mt-auto inline-flex" aria-label={actionLabel}>
        <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
          download
        </span>
        {actionLabel}
      </Link>
    </article>
  )
}
