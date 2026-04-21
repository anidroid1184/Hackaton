import { useCallback, useMemo, useState } from 'react'
import {
  type AliasProfileId,
  getDefaultScenario,
  type ScenarioParams,
} from '../lib/residentialGenerators'
import { MOCK_SCENARIO_STORAGE_KEY } from '../lib/naturalStatsApi'
import { MOCK_SCENARIO_CHANGE_EVENT } from '../hooks/useResidentialNatural'
import {
  readStoredSimulationContext,
  writeStoredSimulationContext,
  type SimulationContext,
  type SimulationProvider,
} from '../lib/simulationContext'

const PROFILES: { id: AliasProfileId; label: string }[] = [
  { id: 'canonical', label: 'Canónico (p_active_kw)' },
  { id: 'pac', label: 'Pac (Huawei/Growatt)' },
  { id: 'active_power', label: 'ActivePower' },
  { id: 'p_total', label: 'P_total' },
]

const PROVIDERS: { id: SimulationProvider; label: string }[] = [
  { id: 'huawei', label: 'Huawei' },
  { id: 'deye', label: 'Deye' },
  { id: 'growatt', label: 'Growatt' },
]

const FAULT_MODES: { id: string; label: string }[] = [
  { id: 'none', label: 'none' },
  { id: 'degraded', label: 'degraded' },
  { id: 'offline', label: 'offline' },
  { id: 'spikes', label: 'spikes' },
]

function loadInitial(): ScenarioParams {
  try {
    const raw = sessionStorage.getItem(MOCK_SCENARIO_STORAGE_KEY)
    if (!raw) return getDefaultScenario()
    const o = JSON.parse(raw) as Partial<ScenarioParams>
    return {
      noise: Number(o.noise ?? getDefaultScenario().noise),
      scale: Number(o.scale ?? getDefaultScenario().scale),
      phase: Number(o.phase ?? getDefaultScenario().phase),
      profile: (o.profile as AliasProfileId) ?? 'canonical',
    }
  } catch {
    return getDefaultScenario()
  }
}

/**
 * Panel solo desarrollo: ajusta escenario del mock-hub y persiste en sessionStorage.
 */
export function MockHubPlaygroundPage() {
  const [params, setParams] = useState<ScenarioParams>(loadInitial)
  const [context, setContext] = useState<SimulationContext>(
    () =>
      readStoredSimulationContext() ?? {
        provider: 'huawei',
        compareProvider: 'deye',
        scenario: 'baseline',
        faultMode: 'none',
      },
  )

  const preview = useMemo(() => JSON.stringify({ scenarioParams: params, context }, null, 2), [params, context])

  const persistScenario = useCallback((next: ScenarioParams, ctx: SimulationContext) => {
    sessionStorage.setItem(MOCK_SCENARIO_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(MOCK_SCENARIO_CHANGE_EVENT))
    writeStoredSimulationContext(ctx)
  }, [])

  const apply = useCallback(() => {
    persistScenario(params, context)
  }, [params, context, persistScenario])

  const randomize = useCallback(() => {
    const next: ScenarioParams = {
      noise: Math.random(),
      scale: 0.3 + Math.random() * 2.7,
      phase: Math.random(),
      profile: params.profile,
    }
    setParams(next)
    persistScenario(next, context)
  }, [context, params.profile, persistScenario])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 animate-enter">
      <header className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Solo desarrollo
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-on-surface">
          Mock hub — escenario
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Ajusta perfil activo, modo de falla y comparativo entre dos sistemas. Al aplicar, las vistas
          recargan desde{' '}
          <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-xs">VITE_STATS_BASE_URL</code> si está definida.
        </p>
      </header>

      <div className="card flex flex-col gap-6 p-6 sm:p-8">
        <SliderRow
          id="mock-noise"
          label="Ruido en serie real"
          min={0}
          max={1}
          step={0.05}
          value={params.noise}
          onChange={(noise) => setParams((p) => ({ ...p, noise }))}
        />
        <SliderRow
          id="mock-scale"
          label="Escala (amplitud / kWh)"
          min={0.3}
          max={3}
          step={0.05}
          value={params.scale}
          onChange={(scale) => setParams((p) => ({ ...p, scale }))}
        />
        <SliderRow
          id="mock-phase"
          label="Fase (desplaza la campana)"
          min={0}
          max={1}
          step={0.02}
          value={params.phase}
          onChange={(phase) => setParams((p) => ({ ...p, phase }))}
        />

        <div>
          <label htmlFor="mock-profile" className="text-sm font-semibold text-on-surface">
            Perfil de claves en raw (inferencia)
          </label>
          <select
            id="mock-profile"
            className="input-plain mt-2 w-full"
            value={params.profile}
            onChange={(e) =>
              setParams((p) => ({ ...p, profile: e.target.value as AliasProfileId }))
            }
          >
            {PROFILES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mock-provider" className="text-sm font-semibold text-on-surface">
              Sistema A (proveedor activo)
            </label>
            <select
              id="mock-provider"
              className="input-plain mt-2 w-full"
              value={context.provider}
              onChange={(e) =>
                setContext((current) => ({ ...current, provider: e.target.value as SimulationProvider }))
              }
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mock-compare-provider" className="text-sm font-semibold text-on-surface">
              Sistema B (comparacion)
            </label>
            <select
              id="mock-compare-provider"
              className="input-plain mt-2 w-full"
              value={context.compareProvider}
              onChange={(e) =>
                setContext((current) => ({
                  ...current,
                  compareProvider: e.target.value as SimulationProvider,
                }))
              }
            >
              {PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mock-scenario" className="text-sm font-semibold text-on-surface">
              Escenario global
            </label>
            <input
              id="mock-scenario"
              type="text"
              className="input-plain mt-2 w-full"
              value={context.scenario}
              onChange={(e) => setContext((current) => ({ ...current, scenario: e.target.value }))}
              placeholder="baseline | stress | recovery | ..."
            />
          </div>
          <div>
            <label htmlFor="mock-fault-mode" className="text-sm font-semibold text-on-surface">
              Modo de falla
            </label>
            <select
              id="mock-fault-mode"
              className="input-plain mt-2 w-full"
              value={context.faultMode}
              onChange={(e) => setContext((current) => ({ ...current, faultMode: e.target.value }))}
            >
              {FAULT_MODES.map((faultMode) => (
                <option key={faultMode.id} value={faultMode.id}>
                  {faultMode.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={apply}>
            Aplicar y refrescar vistas
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={randomize}
            aria-label="Randomizar ruido, escala y fase y aplicar inmediatamente"
          >
            Randomizar
          </button>
        </div>
      </div>

      <section className="card overflow-hidden p-4 sm:p-6" aria-labelledby="preview-title">
        <h2 id="preview-title" className="font-display text-lg font-bold text-on-surface">
          Parámetros (JSON)
        </h2>
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-surface-container p-4 text-xs text-on-surface-variant">
          {preview}
        </pre>
      </section>
    </div>
  )
}

function SliderRow({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold text-on-surface">
          {label}
        </label>
        <span className="font-mono text-xs text-on-surface-variant">{value.toFixed(2)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}
