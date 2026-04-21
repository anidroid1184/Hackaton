import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NaturalActionCard } from '../components/natural/NaturalActionCard'
import { NaturalPageHero } from '../components/natural/NaturalPageHero'
import { getReportsMock } from '../lib/residentialMock'

export function ReportsNaturalPage() {
  const { pathname } = useLocation()
  const reports = useMemo(() => getReportsMock(), [])
  const prefix = pathname.startsWith('/preview/cliente') ? '/preview/cliente' : ''

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 animate-enter">
      <NaturalPageHero
        eyebrow="Cliente residencial · Reportes"
        title="Tus reportes listos para compartir"
        description="Accede a reportes simplificados y técnicos de tu planta. Puedes enviarlos a bancos, administración o tu instalador."
        actions={
          <Link to={`${prefix}/reports/pdf`} className="btn-primary">
            <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
              picture_as_pdf
            </span>
            Generar PDF
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        <NaturalActionCard
          icon="description"
          title="Reporte simplificado"
          description="Versión ejecutiva con generación, ahorro y CO2 evitado."
          actionLabel="Abrir generador"
          to={`${prefix}/reports/pdf?detail=simplificado`}
        />
        <NaturalActionCard
          icon="analytics"
          title="Reporte técnico"
          description="Incluye detalle de rendimiento, cumplimiento y alertas operativas."
          actionLabel="Abrir generador"
          to={`${prefix}/reports/pdf?detail=tecnico`}
        />
      </section>

      <section className="card overflow-hidden">
        <header className="border-b border-outline-ghost px-6 py-4">
          <h2 className="font-display text-xl font-bold text-on-surface">Historial de reportes</h2>
        </header>
        <div className="divide-y divide-outline-ghost">
          {reports.map((report) => (
            <article key={report.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
              <div className="min-w-40 flex-1">
                <h3 className="font-semibold text-on-surface">{report.period}</h3>
                <p className="text-sm text-on-surface-variant">{report.kind}</p>
              </div>
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider',
                  report.status === 'ready'
                    ? 'bg-secondary-container/60 text-on-secondary-container'
                    : 'bg-tertiary-container/50 text-on-tertiary-container',
                ].join(' ')}
              >
                {report.status === 'ready' ? 'Listo' : 'Generando'}
              </span>
              <Link
                to={`${prefix}/reports/pdf?detail=${report.kind}`}
                className="btn-secondary px-4 py-2 text-sm"
              >
                <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
                  download
                </span>
                Descargar
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
