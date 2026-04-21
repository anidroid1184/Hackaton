import { supabase } from './supabaseClient'

export type ReportAudience = 'natural' | 'corporativo'
export type ReportDetail = 'simplificado' | 'tecnico'
export type ReportPeriod = 'mensual' | 'trimestral' | 'anual'

export type GeneratePdfInput = {
  audience: ReportAudience
  detail: ReportDetail
  period: ReportPeriod
  companyName: string
  clientName: string
  includePromiseVsReal: boolean
  includeValidationStamp: boolean
}

export type GeneratedPdf = {
  blob: Blob
  filename: string
}

function reportsBaseUrl(): string | undefined {
  const reportsUrl = import.meta.env.VITE_REPORTS_BASE_URL?.trim()
  if (reportsUrl) {
    return reportsUrl
  }
  const statsUrl = import.meta.env.VITE_STATS_BASE_URL?.trim()
  return statsUrl || undefined
}

function parseFilename(disposition: string | null): string {
  if (!disposition) return 'reporte.pdf'
  const match = disposition.match(/filename="([^"]+)"/i)
  return match?.[1] ?? 'reporte.pdf'
}

export async function generateReportPdf(input: GeneratePdfInput): Promise<GeneratedPdf> {
  const baseUrl = reportsBaseUrl()
  if (!baseUrl) {
    throw new Error('Configura VITE_REPORTS_BASE_URL o VITE_STATS_BASE_URL para habilitar PDF backend.')
  }

  const query = new URLSearchParams({
    audience: input.audience,
    detail: input.detail,
    period: input.period,
    output: 'pdf',
    company_name: input.companyName,
    client_name: input.clientName,
    include_promise_vs_real: String(input.includePromiseVsReal),
    include_validation_stamp: String(input.includeValidationStamp),
  })
  const url = `${baseUrl.replace(/\/$/, '')}/reports/generate?${query.toString()}`

  const sessionResult = await supabase.auth.getSession()
  const token = sessionResult.data.session?.access_token
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    throw new Error(`Error generando PDF (${response.status})`)
  }
  const filename = parseFilename(response.headers.get('content-disposition'))
  return {
    blob: await response.blob(),
    filename,
  }
}
