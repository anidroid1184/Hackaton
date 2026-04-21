import { useState } from 'react'

const tabs = [
  { id: 'roi', label: '1. Rendimiento y ROI' },
  { id: 'kpi', label: '2. Registro KPI' },
  { id: 'soporte', label: '3. Soporte directo' },
] as const

/** Cliente corporativo — 3 pestañas (docs/USER_FLOWS). */
export default function ClienteCorporativoPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('roi')

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[var(--text-h)]">Cliente corporativo</h1>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`rounded-t px-3 py-2 text-sm ${
              tab === t.id
                ? 'border border-b-0 border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]'
                : 'text-[var(--text)] hover:bg-[var(--social-bg)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'roi' && (
        <div role="tabpanel" className="min-h-[120px] rounded border border-[var(--border)] p-4 text-sm">
          <p className="text-[var(--text-h)]">KPI energía, ahorro acumulado, ROI vs inversión (mock).</p>
          <ul className="mt-2 list-inside list-disc text-[var(--text)]">
            <li>Energía mes: 42 MWh</li>
            <li>Ahorro YTD: $ 128M COP</li>
          </ul>
        </div>
      )}

      {tab === 'kpi' && (
        <div role="tabpanel" className="min-h-[120px] rounded border border-[var(--border)] p-4">
          <table className="w-full max-w-md text-left text-sm">
            <caption className="sr-only">Magnitudes eléctricas</caption>
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text)]">
                <th className="py-1 pr-2">Magnitud</th>
                <th className="py-1">Valor</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-h)]">
              <tr>
                <td className="py-1">Vo</td>
                <td>229 V</td>
              </tr>
              <tr>
                <td className="py-1">Io</td>
                <td>12,4 A</td>
              </tr>
              <tr>
                <td className="py-1">fp</td>
                <td>0,98</td>
              </tr>
              <tr>
                <td className="py-1">Hz</td>
                <td>60,0</td>
              </tr>
              <tr>
                <td className="py-1">Status</td>
                <td>OK</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === 'soporte' && (
        <div role="tabpanel" className="min-h-[120px] rounded border border-[var(--border)] p-4 text-sm">
          <p className="text-[var(--text)]">Canal a Operaciones TR (ticket/chat — integrar).</p>
          <button
            type="button"
            className="mt-2 rounded border border-[var(--border)] px-3 py-2 text-[var(--text-h)]"
          >
            Abrir solicitud (stub)
          </button>
        </div>
      )}
    </div>
  )
}
