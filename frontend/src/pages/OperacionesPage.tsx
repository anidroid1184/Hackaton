import { useState } from 'react'

type OpTab = 'war' | 'agenda' | 'analitica'

/** Operaciones Techos Rentables — War Room, agenda, analítica regional (docs/USER_FLOWS). */
export default function OperacionesPage() {
  const [tab, setTab] = useState<OpTab>('war')

  const zonas = [
    { sector: 'Norte', count: 12 },
    { sector: 'Centro', count: 7 },
    { sector: 'Sur', count: 4 },
    { sector: 'Occidente', count: 9 },
  ]
  const max = Math.max(...zonas.map((z) => z.count))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[var(--text-h)]">Operaciones Techos Rentables</h1>

      <div className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {(
          [
            ['war', 'War Room'],
            ['agenda', 'Panel de agenda'],
            ['analitica', 'Analítica regional'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-t px-3 py-2 text-sm ${
              tab === id
                ? 'border border-b-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]'
                : 'text-[var(--text)] hover:bg-[var(--social-bg)]'
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'war' && (
        <div className="space-y-3 rounded border border-[var(--border)] p-4">
          <div
            className="rounded border-2 border-red-500/60 bg-red-500/10 p-3 text-sm"
            role="alert"
          >
            <div className="font-semibold text-red-700 dark:text-red-300">Arco eléctrico — CRÍTICO</div>
            <p className="mt-1 text-[var(--text)]">Planta Los Arrayanes · hace 2 min</p>
            <p className="mt-2 text-[var(--text-h)]">
              Sugerencia técnico: <strong>Carlos Ruiz (zona Norte)</strong>
            </p>
            <button type="button" className="mt-2 rounded bg-red-600 px-2 py-1 text-xs text-white">
              Despachar (stub)
            </button>
          </div>
          <p className="text-xs text-[var(--text)]">GET /alerts o WS — datos mock</p>
        </div>
      )}

      {tab === 'agenda' && (
        <div className="overflow-x-auto rounded border border-[var(--border)]">
          <table className="w-full min-w-[600px] text-left text-sm">
            <caption className="sr-only">Agenda de mantenimientos</caption>
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--social-bg)] text-[var(--text)]">
                <th className="p-2">Nombre</th>
                <th className="p-2">Dirección</th>
                <th className="p-2">Último mant.</th>
                <th className="p-2">Próximo</th>
                <th className="p-2">Problema</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-h)]">
              <tr className="border-b border-[var(--border)]">
                <td className="p-2">Planta Arrayanes</td>
                <td className="p-2">Cll 10 #4-20</td>
                <td className="p-2">2026-03-01</td>
                <td className="p-2">2026-04-22</td>
                <td className="p-2">Revisión pos-arco</td>
              </tr>
              <tr>
                <td className="p-2">Bodega Sur</td>
                <td className="p-2">Km 3 Variante</td>
                <td className="p-2">2026-02-15</td>
                <td className="p-2">2026-05-10</td>
                <td className="p-2">Preventivo</td>
              </tr>
            </tbody>
          </table>
          <p className="p-2 text-xs text-[var(--text)]">GET /maintenance/schedule</p>
        </div>
      )}

      {tab === 'analitica' && (
        <div className="rounded border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-medium text-[var(--text-h)]">Frecuencia de falla vs sector</h2>
          <div className="flex h-40 items-end gap-3 border-b border-[var(--border)] pb-1">
            {zonas.map((z) => (
              <div key={z.sector} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full min-w-[2rem] rounded-t bg-[var(--accent)] opacity-80"
                  style={{ height: `${(z.count / max) * 100}%`, minHeight: '8px' }}
                  title={`${z.count} fallas`}
                />
                <span className="text-xs text-[var(--text)]">{z.sector}</span>
                <span className="text-xs font-medium text-[var(--text-h)]">{z.count}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--text)]">GET /analytics/faults-by-zone</p>
        </div>
      )}
    </div>
  )
}
