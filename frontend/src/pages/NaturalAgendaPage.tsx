import { useEffect, useMemo, useState } from 'react'
import {
  fetchClientAgendaEntries,
  getClientAgendaFallback,
  type AgendaStatus,
  type ClientAgendaEntry,
} from '../lib/clientAgendaApi'

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] as const

const STATUS_LABELS: Record<AgendaStatus, string> = {
  scheduled: 'Agendado',
  suggested: 'Sugerido',
  overdue: 'Vencido',
  completed: 'Completado',
}

export function NaturalAgendaPage() {
  const [entries, setEntries] = useState<ClientAgendaEntry[]>(() => getClientAgendaFallback())
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void fetchClientAgendaEntries().then((data) => {
      if (!mounted) return
      setEntries(data)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const eventsByDate = useMemo(() => {
    return entries.reduce<Record<string, ClientAgendaEntry[]>>((acc, entry) => {
      const key = toDateKey(new Date(entry.date))
      acc[key] = acc[key] ? [...acc[key], entry] : [entry]
      return acc
    }, {})
  }, [entries])

  const monthGrid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor])
  const selectedEntries = eventsByDate[selectedDateKey] ?? []

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <header className="card flex flex-col gap-4 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Cliente residencial
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-on-surface">Agenda mensual</h1>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMonthCursor((value) => addMonths(value, -1))}
            >
              <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
                chevron_left
              </span>
              Mes anterior
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMonthCursor(startOfMonth(new Date()))}
            >
              Hoy
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setMonthCursor((value) => addMonths(value, 1))}
            >
              Mes siguiente
              <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant">
          Calendario de visitas y recomendaciones de mantenimiento.
          {loading ? ' Cargando agenda...' : null}
        </p>
      </header>

      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-on-surface">
            {monthCursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['scheduled', 'suggested', 'overdue', 'completed'] as const).map((status) => (
              <span
                key={status}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeClassForStatus(
                  status,
                )}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${dotClassForStatus(status)}`} />
                {STATUS_LABELS[status]}
              </span>
            ))}
          </div>
        </div>

        <div className="-mx-2 overflow-x-auto px-2">
          <div className="grid min-w-[28rem] grid-cols-7 gap-2">
            {WEEK_DAYS.map((day) => (
              <p
                key={day}
                className="px-2 py-1 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
              >
                {day}
              </p>
            ))}
            {monthGrid.map((date) => {
              const dateKey = toDateKey(date)
              const dayEntries = eventsByDate[dateKey] ?? []
              const isCurrentMonth = date.getMonth() === monthCursor.getMonth()
              const isSelected = dateKey === selectedDateKey
              const longLabel = date.toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
              const statusSummary = dayEntries.length
                ? Array.from(new Set(dayEntries.map((entry) => STATUS_LABELS[entry.status]))).join(', ')
                : 'sin eventos'
              const ariaLabel = `${longLabel}, ${dayEntries.length} evento(s): ${statusSummary}`

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(dateKey)}
                  aria-label={ariaLabel}
                  aria-pressed={isSelected}
                  className={[
                    'min-h-24 rounded-xl border p-2 text-left transition',
                    isSelected
                      ? 'border-primary-container bg-primary-container/15'
                      : 'border-outline-ghost bg-surface-container-lowest hover:bg-surface-container-low',
                    isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant/75',
                  ].join(' ')}
                >
                  <p className="text-sm font-semibold">{date.getDate()}</p>
                  {dayEntries.length ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {Array.from(new Set(dayEntries.map((entry) => entry.status))).map((status) => (
                        <span
                          key={status}
                          aria-hidden
                          className={`h-2.5 w-2.5 rounded-full ${dotClassForStatus(status)}`}
                          title={STATUS_LABELS[status]}
                        />
                      ))}
                      <span aria-hidden className="text-xs font-semibold text-on-surface-variant">
                        {dayEntries.length} evento(s)
                      </span>
                    </div>
                  ) : (
                    <p aria-hidden className="mt-2 text-xs text-on-surface-variant">
                      Sin eventos
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-xl font-bold text-on-surface">
          {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('es-CO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h2>
        <div className="mt-4 grid gap-3">
          {selectedEntries.length ? (
            selectedEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-outline-ghost bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClassForStatus(entry.status)}`}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(entry.date).toLocaleString('es-CO')}
                  </p>
                </div>
                <p className="mt-2 font-semibold text-on-surface">{entry.title}</p>
                <p className="text-sm text-on-surface-variant">{entry.summary}</p>
                <p className="mt-1 text-sm text-on-surface">Ubicación: {entry.location}</p>
                <p className="text-sm text-on-surface">
                  Técnico: {entry.technician ?? 'Por asignar'}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">
              No hay actividades para este día. Puedes revisar otras fechas del calendario.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function buildMonthGrid(month: Date): Date[] {
  const start = startOfMonth(month)
  const offset = (start.getDay() + 6) % 7
  const first = new Date(start)
  first.setDate(start.getDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first)
    date.setDate(first.getDate() + index)
    return date
  })
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`
}

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

function badgeClassForStatus(status: AgendaStatus): string {
  if (status === 'scheduled') return 'bg-secondary-container/70 text-on-secondary-container'
  if (status === 'suggested') return 'bg-primary-container/25 text-on-surface'
  if (status === 'overdue') return 'bg-error-container/70 text-on-error-container'
  return 'bg-tertiary-container/70 text-on-tertiary-container'
}

function dotClassForStatus(status: AgendaStatus): string {
  if (status === 'scheduled') return 'bg-secondary'
  if (status === 'suggested') return 'bg-primary'
  if (status === 'overdue') return 'bg-error'
  return 'bg-tertiary'
}
