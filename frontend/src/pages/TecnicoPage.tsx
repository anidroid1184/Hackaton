import { useState } from 'react'

/** Técnico de Campo — hoja de ruta, telemetría, buffer offline, cierre (docs/USER_FLOWS). */
export default function TecnicoPage() {
  const [cerrado, setCerrado] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-h)]">Técnico de Campo</h1>

      <section className="rounded border border-[var(--border)] p-4">
        <h2 className="mb-2 text-sm font-medium text-[var(--text-h)]">Hoja de ruta (zona Norte)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--text-h)]">
          <li>
            Planta Arrayanes — 09:00 · <span className="text-[var(--text)]">Arco (seguimiento)</span>
          </li>
          <li>
            Bodega Sur — 14:00 · <span className="text-[var(--text)]">Preventivo</span>
          </li>
        </ol>
      </section>

      <section className="rounded border border-[var(--border)] p-4">
        <h2 className="mb-2 text-sm font-medium text-[var(--text-h)]">Telemetría (última muestra)</h2>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ['V_dc', '380 V'],
            ['I_dc', '8,2 A'],
            ['P', '3,1 kW'],
            ['fp', '0,97'],
          ].map(([k, v]) => (
            <div key={k} className="rounded bg-[var(--social-bg)] px-2 py-1">
              <div className="text-xs text-[var(--text)]">{k}</div>
              <div className="font-medium text-[var(--text-h)]">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--text)]">
          Buffer local (offline): <strong>activo</strong> — IndexedDB / cola sync (ver ARCHITECTURE.md)
        </p>
      </section>

      <section className="rounded border border-[var(--border)] p-4">
        <h2 className="mb-2 text-sm font-medium text-[var(--text-h)]">Cierre de mantenimiento</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-h)]">
          <input
            type="checkbox"
            checked={cerrado}
            onChange={(e) => setCerrado(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
          Marcar visita como completada
        </label>
        <button
          type="button"
          disabled={!cerrado}
          className="mt-2 rounded bg-[var(--text-h)] px-3 py-2 text-sm text-[var(--bg)] disabled:opacity-40"
        >
          POST /maintenance/complete (stub)
        </button>
      </section>
    </div>
  )
}
