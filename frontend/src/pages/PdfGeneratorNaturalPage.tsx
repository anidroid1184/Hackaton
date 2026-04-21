import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NaturalPageHero } from '../components/natural/NaturalPageHero'
import {
  generateReportPdf,
  type ReportAudience,
  type ReportDetail,
  type ReportPeriod,
} from '../lib/reportPdfApi'

export function PdfGeneratorNaturalPage() {
  const [searchParams] = useSearchParams()
  const initialAudience = searchParams.get('audience') === 'corporativo' ? 'corporativo' : 'natural'
  const initialDetail = searchParams.get('detail') === 'tecnico' ? 'tecnico' : 'simplificado'
  const [audience, setAudience] = useState<ReportAudience>(initialAudience)
  const [detail, setDetail] = useState<ReportDetail>(initialDetail)
  const [period, setPeriod] = useState<ReportPeriod>('mensual')
  const [companyName, setCompanyName] = useState('MiTechoRentable')
  const [clientName, setClientName] = useState('Cliente Solar')
  const [includePromiseVsReal, setIncludePromiseVsReal] = useState(true)
  const [includeValidationStamp, setIncludeValidationStamp] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const previewFilename = useMemo(
    () => `reporte-${audience}-${detail}-${period}.pdf`,
    [audience, detail, period],
  )

  async function onGenerate() {
    setIsLoading(true)
    setMessage(null)
    try {
      const output = await generateReportPdf({
        audience,
        detail,
        period,
        companyName,
        clientName,
        includePromiseVsReal,
        includeValidationStamp,
      })
      const href = URL.createObjectURL(output.blob)
      const anchor = document.createElement('a')
      anchor.href = href
      anchor.download = output.filename
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(href)
      setMessage(`PDF generado y descargado: ${output.filename}`)
    } catch (error) {
      const fallback = error instanceof Error ? error.message : 'No fue posible generar el PDF.'
      setMessage(fallback)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 animate-enter">
      <NaturalPageHero
        eyebrow="Cliente residencial · Generación PDF"
        title="Generador de reportes en PDF"
        description="Genera reportes Natural/Jurídico-Corporativo en modo simplificado o técnico. Branding configurable sin logo."
      />

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <form
          className="card flex flex-col gap-5 p-6"
          aria-label="Opciones de reporte PDF"
          onSubmit={(event) => {
            event.preventDefault()
            void onGenerate()
          }}
        >
          <label htmlFor="pdf-audience" className="flex flex-col gap-2 text-sm text-on-surface">
            Audiencia
            <select
              id="pdf-audience"
              className="input"
              value={audience}
              onChange={(event) => setAudience(event.target.value as ReportAudience)}
            >
              <option value="natural">Natural</option>
              <option value="corporativo">Jurídico-Corporativo</option>
            </select>
          </label>
          <label htmlFor="pdf-detail" className="flex flex-col gap-2 text-sm text-on-surface">
            Tipo de reporte
            <select
              id="pdf-detail"
              className="input"
              value={detail}
              onChange={(event) => setDetail(event.target.value as ReportDetail)}
            >
              <option value="simplificado">Simplificado</option>
              <option value="tecnico">Técnico</option>
            </select>
          </label>
          <label htmlFor="pdf-period" className="flex flex-col gap-2 text-sm text-on-surface">
            Periodo
            <select
              id="pdf-period"
              className="input"
              value={period}
              onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </label>
          <label htmlFor="pdf-company" className="flex flex-col gap-2 text-sm text-on-surface">
            Marca (sin logo)
            <input
              id="pdf-company"
              className="input"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </label>
          <label htmlFor="pdf-client" className="flex flex-col gap-2 text-sm text-on-surface">
            Cliente
            <input
              id="pdf-client"
              className="input"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
          </label>
          <label
            htmlFor="pdf-include-pvr"
            className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-on-surface"
          >
            <input
              id="pdf-include-pvr"
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-primary)]"
              checked={includePromiseVsReal}
              onChange={(event) => setIncludePromiseVsReal(event.target.checked)}
            />
            Incluir comparativo Promesa vs Real
          </label>
          <label
            htmlFor="pdf-include-stamp"
            className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-on-surface"
          >
            <input
              id="pdf-include-stamp"
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-primary)]"
              checked={includeValidationStamp}
              onChange={(event) => setIncludeValidationStamp(event.target.checked)}
            />
            Incluir sello de validación técnica
          </label>
          <button type="submit" className="btn-primary w-fit" disabled={isLoading}>
            <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
              picture_as_pdf
            </span>
            {isLoading ? 'Generando...' : 'Generar PDF'}
          </button>
          {message ? (
            <p className="rounded-xl bg-surface-container px-3 py-2 text-sm text-on-surface-variant">
              {message}
            </p>
          ) : null}
        </form>

        <aside className="card flex flex-col gap-4 p-6">
          <h2 className="font-display text-xl font-bold text-on-surface">Vista previa</h2>
          <p className="text-sm text-on-surface-variant">
            El backend renderiza plantilla LaTeX y entrega PDF directo por `/reports/generate`.
          </p>
          <div className="rounded-xl border border-outline-ghost bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Archivo
            </p>
            <p className="mt-1 font-semibold text-on-surface">{previewFilename}</p>
          </div>
          <p className="text-xs text-on-surface-variant">
            Plantillas sin logo: reemplaza branding con el campo "Marca".
          </p>
        </aside>
      </section>
    </div>
  )
}
