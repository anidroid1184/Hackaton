import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { generateReportPdf } from './reportPdfApi'

const getSessionMock = vi.hoisted(() => vi.fn())

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}))

describe('reportPdfApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('VITE_REPORTS_BASE_URL', 'http://127.0.0.1:8000')
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:4010')
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'jwt-demo' } } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('arma query esperado y descarga blob pdf', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['%PDF-1.4']), {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="reporte-natural.pdf"',
          'Content-Type': 'application/pdf',
        },
      }),
    )

    const result = await generateReportPdf({
      audience: 'natural',
      detail: 'tecnico',
      period: 'mensual',
      companyName: 'MiTechoRentable',
      clientName: 'Camila',
      includePromiseVsReal: true,
      includeValidationStamp: false,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('http://127.0.0.1:8000/reports/generate?')
    expect(String(url)).toContain('audience=natural')
    expect(String(url)).toContain('detail=tecnico')
    expect(options?.headers).toEqual({ Authorization: 'Bearer jwt-demo' })
    expect(result.filename).toBe('reporte-natural.pdf')
    expect(result.blob.size).toBeGreaterThan(0)
  })

  it('usa VITE_STATS_BASE_URL como fallback cuando no existe VITE_REPORTS_BASE_URL', async () => {
    vi.stubEnv('VITE_REPORTS_BASE_URL', '')
    vi.stubEnv('VITE_STATS_BASE_URL', 'http://127.0.0.1:4010')

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['%PDF-1.4']), {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="reporte-natural.pdf"',
          'Content-Type': 'application/pdf',
        },
      }),
    )

    await generateReportPdf({
      audience: 'natural',
      detail: 'tecnico',
      period: 'mensual',
      companyName: 'MiTechoRentable',
      clientName: 'Camila',
      includePromiseVsReal: true,
      includeValidationStamp: false,
    })

    const [url] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('http://127.0.0.1:4010/reports/generate?')
  })

  it('lanza error cuando no hay base URL configurada para reportes', async () => {
    vi.stubEnv('VITE_REPORTS_BASE_URL', '')
    vi.stubEnv('VITE_STATS_BASE_URL', '')

    await expect(
      generateReportPdf({
        audience: 'natural',
        detail: 'tecnico',
        period: 'mensual',
        companyName: 'MiTechoRentable',
        clientName: 'Camila',
        includePromiseVsReal: true,
        includeValidationStamp: false,
      }),
    ).rejects.toThrow('Configura VITE_REPORTS_BASE_URL o VITE_STATS_BASE_URL para habilitar PDF backend.')
  })
})
