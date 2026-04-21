import { useEffect, useState } from 'react'
import {
  completeTechnicianMaintenance,
  fetchTechnicianAgendaData,
  getTechnicianAgendaFallback,
  type MaintenanceScheduleRow,
} from '../lib/roleDashboardApi'

export function FieldTechnicianClosePage() {
  const [agenda, setAgenda] = useState<MaintenanceScheduleRow[]>(() => getTechnicianAgendaFallback())
  const [selectedVisit, setSelectedVisit] = useState(agenda[0]?.id ?? '')
  const [completedMessage, setCompletedMessage] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [switchReplaced, setSwitchReplaced] = useState(true)
  const [photoEvidence, setPhotoEvidence] = useState(true)
  const [thermalInspection, setThermalInspection] = useState(false)
  const [cleanupDone, setCleanupDone] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)

  async function completeMaintenance() {
    if (!selectedVisit) {
      setCompletedMessage('Selecciona una visita para completar.')
      return
    }
    setSending(true)
    const checklist = buildChecklist({
      switchReplaced,
      photoEvidence,
      thermalInspection,
      cleanupDone,
    })
    const evidence = attachedFiles.map((file) =>
      JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        lastModified: file.lastModified,
      }),
    )
    const result = await completeTechnicianMaintenance({
      maintenanceId: selectedVisit,
      notes,
      checklist,
      evidence,
    })
    setCompletedMessage(
      result.mode === 'remote'
        ? `Visita ${selectedVisit} cerrada y persistida (${attachedFiles.length} adjunto(s)).`
        : `Backend no disponible: visita ${selectedVisit} cerrada en modo fallback con metadata de adjuntos.`,
    )
    setSending(false)
  }

  useEffect(() => {
    let mounted = true
    void fetchTechnicianAgendaData().then((nextAgenda) => {
      if (!mounted) return
      setAgenda(nextAgenda)
      setSelectedVisit((current) => current || nextAgenda[0]?.id || '')
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 animate-enter">
      <header className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
          Tecnico de Campo
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-on-surface">
          Cierre de visita detallado
        </h1>
        <p className="mt-3 text-sm text-on-surface-variant">
          Completa checklist tecnico, adjunta evidencia y envia metadata al endpoint de cierre enriquecido.
        </p>
      </header>

      <section className="card p-6">
        <label className="text-sm text-on-surface-variant" htmlFor="visit-select">
          Visita
        </label>
        {agenda.length === 0 ? (
          <p className="mt-2 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
            Sin visitas pendientes.
          </p>
        ) : (
          <select
            id="visit-select"
            className="input-plain mt-2"
            value={selectedVisit}
            onChange={(event) => {
              setSelectedVisit(event.target.value)
              setCompletedMessage(null)
            }}
          >
            <option value="" disabled>
              Elige una visita
            </option>
            {agenda.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.plant_name} · {toVisitWindow(visit.next_scheduled_at)}
              </option>
            ))}
          </select>
        )}

        <button
          className="btn-primary mt-4"
          type="button"
          disabled={sending || agenda.length === 0 || !selectedVisit}
          onClick={() => void completeMaintenance()}
        >
          Completar visita
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 py-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={switchReplaced}
              onChange={(event) => setSwitchReplaced(event.target.checked)}
            />
            Breaker revisado/reemplazado
          </label>
          <label className="flex min-h-11 items-center gap-3 py-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={photoEvidence}
              onChange={(event) => setPhotoEvidence(event.target.checked)}
            />
            Evidencia fotografica cargada
          </label>
          <label className="flex min-h-11 items-center gap-3 py-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={thermalInspection}
              onChange={(event) => setThermalInspection(event.target.checked)}
            />
            Termografia ejecutada
          </label>
          <label className="flex min-h-11 items-center gap-3 py-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={cleanupDone}
              onChange={(event) => setCleanupDone(event.target.checked)}
            />
            Limpieza y cierre de tablero
          </label>
        </div>

        <label htmlFor="close-notes" className="mt-4 block text-sm text-on-surface-variant">
          Notas de cierre tecnico
        </label>
        <textarea
          id="close-notes"
          className="input mt-2 min-h-24"
          placeholder="Notas de cierre tecnico"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        <label className="mt-4 block text-sm text-on-surface-variant" htmlFor="evidence-files">
          Adjuntar imagenes de evidencia
        </label>
        <input
          id="evidence-files"
          type="file"
          accept="image/*"
          multiple
          className="input mt-2"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? [])
            setAttachedFiles(nextFiles)
            if (nextFiles.length > 0) setPhotoEvidence(true)
          }}
        />
        {attachedFiles.length ? (
          <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
            {attachedFiles.map((file) => (
              <li key={`${file.name}-${file.lastModified}`}>
                {file.name} · {(file.size / 1024).toFixed(1)} KB · {file.type || 'tipo-desconocido'}
              </li>
            ))}
          </ul>
        ) : null}

        {completedMessage ? (
          <p className="mt-4 rounded-xl bg-secondary-container/50 px-4 py-3 text-sm text-on-secondary-container">
            {completedMessage}
          </p>
        ) : null}
      </section>
    </div>
  )
}

function toVisitWindow(nextScheduledAt: string | null): string {
  if (!nextScheduledAt) return 'Sin fecha'
  const date = new Date(nextScheduledAt)
  if (Number.isNaN(date.valueOf())) return 'Sin fecha'
  return date.toLocaleString('es-CO')
}

function buildChecklist(input: {
  switchReplaced: boolean
  photoEvidence: boolean
  thermalInspection: boolean
  cleanupDone: boolean
}): string[] {
  const checklist: string[] = []
  if (input.switchReplaced) checklist.push('Breaker revisado/reemplazado')
  if (input.photoEvidence) checklist.push('Evidencia fotografica cargada')
  if (input.thermalInspection) checklist.push('Termografia ejecutada')
  if (input.cleanupDone) checklist.push('Limpieza y cierre de tablero')
  return checklist
}
