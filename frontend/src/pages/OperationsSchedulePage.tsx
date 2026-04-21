import { useEffect, useMemo, useState } from 'react'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import {
  fetchOperationsScheduleData,
  fetchOperationsTechniciansData,
  getOperationsScheduleFallback,
  getOperationsTechniciansFallback,
  type MaintenanceScheduleRow,
} from '../lib/roleDashboardApi'

export function OperationsSchedulePage() {
  const [rows, setRows] = useState(() => getOperationsScheduleFallback())
  const [technicians, setTechnicians] = useState(() => getOperationsTechniciansFallback())
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date().toISOString()))
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [draftDate, setDraftDate] = useState('')
  const [draftTechnician, setDraftTechnician] = useState('')

  const rowsForSelectedDate = useMemo(() => {
    return rows.filter((row) => {
      if (!row.next_scheduled_at) return false
      return toDateInputValue(row.next_scheduled_at) === selectedDate
    })
  }, [rows, selectedDate])

  useEffect(() => {
    let mounted = true
    void Promise.all([fetchOperationsScheduleData(), fetchOperationsTechniciansData()]).then(
      ([schedule, techs]) => {
        if (!mounted) return
        setRows(schedule)
        setTechnicians(techs)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  function beginEdit(row: MaintenanceScheduleRow) {
    setEditingRowId(row.id)
    setDraftDate(toDateTimeInputValue(row.next_scheduled_at))
    setDraftTechnician(row.assigned_technician ?? '')
  }

  function saveEdit(rowId: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              next_scheduled_at: draftDate ? new Date(draftDate).toISOString() : row.next_scheduled_at,
              assigned_technician: draftTechnician || null,
            }
          : row,
      ),
    )
    setEditingRowId(null)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero eyebrow="Operaciones Techos Rentables" title="Panel de agenda" />

      <section className="card p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-on-surface">Calendario de agenda</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm text-on-surface-variant">
            Fecha
            <input
              className="input-plain min-w-[220px]"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <p className="text-sm text-on-surface">
            {rowsForSelectedDate.length} visita(s) para {formatDateOnly(selectedDate)}
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          {rowsForSelectedDate.length ? (
            rowsForSelectedDate.map((row) => (
              <article key={row.id} className="rounded-xl bg-surface-container-low p-4">
                <p className="font-semibold text-on-surface">{row.plant_name}</p>
                <p className="text-sm text-on-surface-variant">{row.problem_summary}</p>
                <p className="mt-1 text-sm text-on-surface">
                  Tecnico: {row.assigned_technician ?? 'Sin asignar'}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-on-surface-variant">No hay visitas agendadas para esta fecha.</p>
          )}
        </div>
      </section>

      <section className="card overflow-x-auto p-4 sm:p-6">
        <table className="min-w-full divide-y divide-outline-ghost text-left text-sm">
          <thead>
            <tr className="text-on-surface-variant">
              <th className="px-3 py-2 font-semibold">Nombre</th>
              <th className="px-3 py-2 font-semibold">Direccion</th>
              <th className="px-3 py-2 font-semibold">Ultimo mantenimiento</th>
              <th className="px-3 py-2 font-semibold">Proximo agendado</th>
              <th className="px-3 py-2 font-semibold">Tecnico asignado</th>
              <th className="px-3 py-2 font-semibold">Problema</th>
              <th className="px-3 py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-ghost">
            {rows.map((row) => {
              const isEditing = editingRowId === row.id
              return (
                <tr key={row.id}>
                  <td className="px-3 py-3 align-top">
                    <p className="font-semibold text-on-surface">{row.plant_name}</p>
                    <p className="text-xs text-on-surface-variant">{row.client_name}</p>
                  </td>
                  <td className="max-w-[24rem] whitespace-normal break-words px-3 py-3 text-on-surface">{row.address_line}</td>
                  <td className="px-3 py-3 text-on-surface">{formatDate(row.last_maintenance_at)}</td>
                  <td className="px-3 py-3 text-on-surface">
                    {isEditing ? (
                      <input
                        className="input-plain h-10 min-w-[190px]"
                        type="datetime-local"
                        value={draftDate}
                        onChange={(event) => setDraftDate(event.target.value)}
                      />
                    ) : (
                      formatDate(row.next_scheduled_at)
                    )}
                  </td>
                  <td className="px-3 py-3 text-on-surface">
                    {isEditing ? (
                      <select
                        className="input-plain h-10 min-w-[180px]"
                        value={draftTechnician}
                        onChange={(event) => setDraftTechnician(event.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.full_name}>
                            {tech.full_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.assigned_technician ?? 'Sin asignar'
                    )}
                  </td>
                  <td className="px-3 py-3 text-on-surface">{row.problem_summary}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button className="btn-primary" type="button" onClick={() => saveEdit(row.id)}>
                            Guardar
                          </button>
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => setEditingRowId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button className="btn-secondary" type="button" onClick={() => beginEdit(row)}>
                          Editar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin dato'
  return new Date(value).toLocaleString('es-CO')
}

function toDateInputValue(value: string): string {
  return new Date(value).toISOString().slice(0, 10)
}

function toDateTimeInputValue(value: string | null): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 16)
}

function formatDateOnly(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO')
}
