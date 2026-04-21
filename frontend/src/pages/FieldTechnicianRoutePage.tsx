import { useEffect, useMemo, useState } from 'react'
import {
  cancelTechnicianMaintenance,
  fetchTechnicianAgendaData,
  getTechnicianAgendaFallback,
  rescheduleTechnicianMaintenance,
  type MaintenanceScheduleRow,
} from '../lib/roleDashboardApi'

type AgendaStatus = 'scheduled' | 'cancelled'

type AgendaRow = MaintenanceScheduleRow & {
  status: AgendaStatus
  cancellationReason?: string
}

export function FieldTechnicianRoutePage() {
  const [agenda, setAgenda] = useState<AgendaRow[]>(() => toAgendaRows(getTechnicianAgendaFallback()))
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    void fetchTechnicianAgendaData().then((rows) => {
      if (!mounted) return
      setAgenda(toAgendaRows(rows))
    })
    return () => {
      mounted = false
    }
  }, [])

  const sortedAgenda = useMemo(
    () =>
      [...agenda].sort((a, b) =>
        (a.next_scheduled_at ?? '').localeCompare(b.next_scheduled_at ?? '', undefined, {
          numeric: true,
        }),
      ),
    [agenda],
  )

  async function saveAgenda(row: AgendaRow) {
    const next = row.next_scheduled_at
    if (!next) {
      setFeedback('Debes definir una fecha/hora antes de guardar la agenda.')
      return
    }
    setBusyId(row.id)
    const result = await rescheduleTechnicianMaintenance(row.id, {
      nextScheduledAt: next,
      problemSummary: row.problem_summary,
    })
    setAgenda((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: result.payload.status,
              next_scheduled_at: result.payload.next_scheduled_at,
              problem_summary: result.payload.problem_summary ?? item.problem_summary,
            }
          : item,
      ),
    )
    setFeedback(
      result.mode === 'remote'
        ? `Agenda de ${row.plant_name} actualizada en backend.`
        : `Sin backend disponible: agenda de ${row.plant_name} guardada en modo fallback.`,
    )
    setBusyId(null)
  }

  async function cancelAgenda(row: AgendaRow) {
    setBusyId(row.id)
    const reason = cancelReasonById[row.id]?.trim()
    const result = await cancelTechnicianMaintenance(row.id, { reason: reason || undefined })
    setAgenda((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: result.payload.status,
              cancellationReason: result.payload.reason ?? reason,
            }
          : item,
      ),
    )
    setFeedback(
      result.mode === 'remote'
        ? `Visita ${row.id} cancelada y persistida.`
        : `Sin backend disponible: visita ${row.id} marcada como cancelada en UI.`,
    )
    setBusyId(null)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <header className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Tecnico de Campo
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-on-surface">
          Agenda editable por zona
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant">
          Reprograma o cancela visitas de campo y persiste cambios contra backend con fallback seguro.
        </p>
      </header>

      <div role="status" aria-live="polite" aria-atomic="true">
        {feedback ? (
          <p className="rounded-xl bg-secondary-container/50 px-4 py-3 text-sm text-on-secondary-container">
            {feedback}
          </p>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {sortedAgenda.map((row) => (
          <article key={row.id} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-on-surface-variant">
                {row.geozone} · {row.client_name}
              </p>
              <span className={statusClass(row.status)}>{row.status.toUpperCase()}</span>
            </div>
            <h2 className="mt-1 font-display text-xl font-bold text-on-surface">{row.plant_name}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{row.address_line}</p>
            <label className="mt-3 block text-xs text-on-surface-variant" htmlFor={`next-${row.id}`}>
              Proxima visita
            </label>
            <input
              id={`next-${row.id}`}
              type="datetime-local"
              className="input mt-1"
              value={toDatetimeLocalValue(row.next_scheduled_at)}
              onChange={(event) => {
                const isoValue = fromDatetimeLocalValue(event.target.value)
                setAgenda((prev) =>
                  prev.map((item) =>
                    item.id === row.id
                      ? {
                          ...item,
                          next_scheduled_at: isoValue,
                          status: item.status === 'cancelled' ? 'scheduled' : item.status,
                        }
                      : item,
                  ),
                )
              }}
            />
            <label className="mt-3 block text-xs text-on-surface-variant" htmlFor={`summary-${row.id}`}>
              Alcance/observacion
            </label>
            <textarea
              id={`summary-${row.id}`}
              className="input mt-1 min-h-20"
              value={row.problem_summary}
              onChange={(event) =>
                setAgenda((prev) =>
                  prev.map((item) => (item.id === row.id ? { ...item, problem_summary: event.target.value } : item)),
                )
              }
            />
            <label className="mt-3 block text-xs text-on-surface-variant" htmlFor={`reason-${row.id}`}>
              Motivo de cancelacion (opcional)
            </label>
            <input
              id={`reason-${row.id}`}
              className="input mt-1"
              value={cancelReasonById[row.id] ?? ''}
              onChange={(event) => {
                setCancelReasonById((prev) => ({ ...prev, [row.id]: event.target.value }))
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn-primary"
                type="button"
                disabled={busyId === row.id}
                onClick={() => void saveAgenda(row)}
              >
                Guardar agenda
              </button>
              <button
                className="btn-secondary"
                type="button"
                disabled={busyId === row.id || row.status === 'cancelled'}
                onClick={() => void cancelAgenda(row)}
              >
                Cancelar visita
              </button>
            </div>
            {row.cancellationReason ? (
              <p className="mt-2 text-xs text-on-surface-variant">Cancelacion: {row.cancellationReason}</p>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}

function toAgendaRows(rows: MaintenanceScheduleRow[]): AgendaRow[] {
  return rows.map((row) => ({ ...row, status: 'scheduled' }))
}

function statusClass(status: AgendaStatus): string {
  if (status === 'cancelled') {
    return 'rounded-full bg-error-container/70 px-3 py-1 text-xs font-semibold text-on-error-container'
  }
  return 'rounded-full bg-secondary-container/70 px-3 py-1 text-xs font-semibold text-on-secondary-container'
}

function toDatetimeLocalValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return null
  return date.toISOString()
}
