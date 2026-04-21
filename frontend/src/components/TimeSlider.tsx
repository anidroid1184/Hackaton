import { useId, useMemo, type ChangeEvent } from 'react'
import { useTimeWindow, type TimePreset } from '../hooks/useTimeWindow'

type TimeSliderProps = {
  className?: string
  label?: string
}

const PRESETS: ReadonlyArray<{ key: Exclude<TimePreset, 'custom'>; label: string }> = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
]

const FORMATTER_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'short',
}

export function TimeSlider({ className = '', label = 'Ventana temporal' }: TimeSliderProps) {
  const { window: w, setPreset, setT } = useTimeWindow()
  const sliderId = useId()

  const fromMs = Date.parse(w.from)
  const toMs = Date.parse(w.to)
  const tMs = Date.parse(w.t)
  const span = Math.max(1, toMs - fromMs)
  const percent = Math.min(100, Math.max(0, ((tMs - fromMs) / span) * 100))

  const formattedT = useMemo(() => {
    const d = new Date(tMs)
    if (!Number.isFinite(d.getTime())) return '—'
    return d.toLocaleString('es-CO', FORMATTER_OPTIONS)
  }, [tMs])

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value)
    if (!Number.isFinite(next)) return
    const nextMs = fromMs + (next / 100) * span
    setT(new Date(nextMs).toISOString())
  }

  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border border-outline-ghost bg-surface-container-lowest px-4 py-3 text-on-surface shadow-ambient md:flex-row md:items-center ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <label htmlFor={sliderId} className="text-sm font-semibold">
          {label}
        </label>
        <div
          role="group"
          aria-label="Preajustes de ventana temporal"
          className="flex items-center gap-1"
        >
          {PRESETS.map((preset) => {
            const active = w.preset === preset.key
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setPreset(preset.key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container ${
                  active
                    ? 'border-primary-container bg-primary-container/20 text-on-surface ring-1 ring-primary-container/40'
                    : 'border-outline-ghost bg-transparent text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={percent}
          onChange={handleRangeChange}
          aria-label="Instante simulado"
          aria-valuetext={formattedT}
          className="w-full accent-[var(--color-primary-container)]"
        />
        <span
          aria-live="polite"
          className="ml-auto whitespace-nowrap rounded-md bg-surface-container px-2 py-1 font-mono text-xs text-on-surface-variant"
        >
          {formattedT}
        </span>
      </div>
    </section>
  )
}

export default TimeSlider
