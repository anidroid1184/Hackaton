import { useEffect, useMemo, useState } from 'react'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import {
  fetchOperationsScheduleData,
  fetchOperationsTechniciansData,
  getOperationsScheduleFallback,
  getOperationsTechniciansFallback,
  type TechnicianProfile,
  type TechnicianStatus,
} from '../lib/roleDashboardApi'

type TechnicianDraft = {
  full_name: string
  geozone: string
  phone: string
}

const INITIAL_DRAFT: TechnicianDraft = {
  full_name: '',
  geozone: 'Zona Norte',
  phone: '',
}

export function OperationsTechniciansPage() {
  const [technicians, setTechnicians] = useState(() => getOperationsTechniciansFallback())
  const [scheduleRows, setScheduleRows] = useState(() => getOperationsScheduleFallback())
  const [draft, setDraft] = useState<TechnicianDraft>(INITIAL_DRAFT)

  useEffect(() => {
    let mounted = true
    void Promise.all([fetchOperationsTechniciansData(), fetchOperationsScheduleData()]).then(
      ([nextTechnicians, nextSchedule]) => {
        if (!mounted) return
        setTechnicians(nextTechnicians)
        setScheduleRows(nextSchedule)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  const loadByTechnician = useMemo(() => {
    const counters = new Map<string, number>()
    scheduleRows.forEach((row) => {
      if (!row.assigned_technician) return
      counters.set(row.assigned_technician, (counters.get(row.assigned_technician) ?? 0) + 1)
    })
    return counters
  }, [scheduleRows])

  const sortedTechnicians = useMemo(
    () => [...technicians].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [technicians],
  )

  function updateStatus(technicianId: string, status: TechnicianStatus) {
    setTechnicians((prev) =>
      prev.map((tech) => (tech.id === technicianId ? { ...tech, status } : tech)),
    )
  }

  function onSubmitNewTechnician(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.full_name.trim() || !draft.phone.trim()) return

    const newTechnician: TechnicianProfile = {
      id: `tech-${Math.random().toString(36).slice(2, 8)}`,
      full_name: draft.full_name.trim(),
      geozone: draft.geozone,
      phone: draft.phone.trim(),
      status: 'active',
    }
    setTechnicians((prev) => [newTechnician, ...prev])
    setDraft(INITIAL_DRAFT)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Operaciones Techos Rentables"
        title="Panel de tecnicos"
        description="Administra disponibilidad, zona y carga de agenda de los tecnicos de campo."
      />

      <section className="card p-6">
        <h2 className="font-display text-xl font-bold text-on-surface">Registrar tecnico</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onSubmitNewTechnician}>
          <div className="flex flex-col gap-1">
            <label htmlFor="tech-full-name" className="text-xs font-semibold text-on-surface-variant">
              Nombre completo
            </label>
            <input
              id="tech-full-name"
              className="input-plain"
              placeholder="Nombre completo"
              value={draft.full_name}
              onChange={(event) => setDraft((prev) => ({ ...prev, full_name: event.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tech-geozone" className="text-xs font-semibold text-on-surface-variant">
              Zona
            </label>
            <select
              id="tech-geozone"
              className="input-plain"
              value={draft.geozone}
              onChange={(event) => setDraft((prev) => ({ ...prev, geozone: event.target.value }))}
            >
              <option value="Zona Norte">Zona Norte</option>
              <option value="Zona Sur">Zona Sur</option>
              <option value="Zona Centro">Zona Centro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tech-phone" className="text-xs font-semibold text-on-surface-variant">
              Telefono
            </label>
            <input
              id="tech-phone"
              className="input-plain"
              placeholder="Telefono"
              value={draft.phone}
              onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>
          <button className="btn-primary self-end" type="submit">
            Agregar tecnico
          </button>
        </form>
      </section>

      <section className="card overflow-x-auto p-4 sm:p-6">
        <table className="min-w-full divide-y divide-outline-ghost text-left text-sm">
          <thead>
            <tr className="text-on-surface-variant">
              <th className="px-3 py-2 font-semibold">Tecnico</th>
              <th className="px-3 py-2 font-semibold">Zona</th>
              <th className="px-3 py-2 font-semibold">Telefono</th>
              <th className="px-3 py-2 font-semibold">Carga agenda</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-ghost">
            {sortedTechnicians.map((tech) => (
              <tr key={tech.id}>
                <td className="px-3 py-3 font-semibold text-on-surface">{tech.full_name}</td>
                <td className="px-3 py-3 text-on-surface">{tech.geozone}</td>
                <td className="px-3 py-3 text-on-surface">{tech.phone}</td>
                <td className="px-3 py-3 text-on-surface">
                  {loadByTechnician.get(tech.full_name) ?? 0} visitas
                </td>
                <td className="px-3 py-3">
                  <select
                    className="input-plain min-h-11 min-w-[130px]"
                    value={tech.status}
                    onChange={(event) =>
                      updateStatus(tech.id, event.target.value as TechnicianStatus)
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="busy">Ocupado</option>
                    <option value="offline">Offline</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
