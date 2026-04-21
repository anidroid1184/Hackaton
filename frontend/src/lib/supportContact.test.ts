import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSupportWhatsappLink, FALLBACK_SUPPORT_WHATSAPP } from './supportContact'

describe('supportContact', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('usa fallback cuando no hay env definido', () => {
    vi.stubEnv('VITE_SUPPORT_WHATSAPP', '')
    const link = buildSupportWhatsappLink()
    expect(link).toContain(`wa.me/${FALLBACK_SUPPORT_WHATSAPP}`)
  })

  it('normaliza el numero desde env y codifica mensaje', () => {
    vi.stubEnv('VITE_SUPPORT_WHATSAPP', '+57 310-555-7788')
    const link = buildSupportWhatsappLink('Necesito soporte técnico')
    expect(link).toBe(
      'https://wa.me/573105557788?text=Necesito%20soporte%20t%C3%A9cnico',
    )
  })
})
