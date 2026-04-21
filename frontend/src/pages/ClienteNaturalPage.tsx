/** Cliente natural — hero, promesa vs real, reporte, aviso técnico (docs/USER_FLOWS). */
export default function ClienteNaturalPage() {
  const promesa = [20, 35, 42, 48, 55, 60, 58, 62]
  const real = [18, 32, 40, 45, 52, 58, 56, 59]
  const w = 320
  const h = 120
  const max = 70
  const toX = (i: number) => (i / (promesa.length - 1)) * (w - 16) + 8
  const toY = (v: number) => h - 8 - (v / max) * (h - 16)

  const pathDashed = promesa.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  const pathSolid = real.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--text-h)]">Cliente residencial</h1>

      <section className="rounded border border-[var(--border)] p-4" aria-labelledby="hero-heading">
        <h2 id="hero-heading" className="mb-2 text-sm font-medium text-[var(--text-h)]">
          Hero emocional
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded bg-[var(--social-bg)] p-3 text-center">
            <div className="text-2xl font-semibold text-[var(--text-h)]">12,4</div>
            <div className="text-xs text-[var(--text)]">kWh hoy</div>
          </div>
          <div className="rounded bg-[var(--social-bg)] p-3 text-center">
            <div className="text-2xl font-semibold text-[var(--text-h)]">$ 18.200</div>
            <div className="text-xs text-[var(--text)]">Ahorro estimado hoy</div>
          </div>
          <div className="rounded bg-[var(--social-bg)] p-3 text-center">
            <div className="text-2xl font-semibold text-[var(--text-h)]">3</div>
            <div className="text-xs text-[var(--text)]">Árboles equiv.</div>
          </div>
        </div>
      </section>

      <div
        className="rounded border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-2 text-sm text-[var(--text-h)]"
        role="status"
      >
        Técnico asignado: <strong>Ana López</strong> — ventana estimada mañana 9:00–11:00
      </div>

      <section className="rounded border border-[var(--border)] p-4" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="mb-2 text-sm font-medium text-[var(--text-h)]">
          Promesa TR (punteada) vs real (sólida)
        </h2>
        <svg width={w} height={h} className="max-w-full" aria-hidden="true">
          <path
            d={pathDashed}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <path d={pathSolid} fill="none" stroke="var(--text-h)" strokeWidth="2" />
        </svg>
        <p className="mt-1 text-xs text-[var(--text)]">Datos mock — conectar a GET /stats o series reales.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--text-h)]">Reporte</h2>
        <button
          type="button"
          className="rounded border border-[var(--border)] bg-[var(--code-bg)] px-3 py-2 text-sm text-[var(--text-h)]"
        >
          Descargar PDF (stub)
        </button>
      </section>
    </div>
  )
}
