export const FALLBACK_SUPPORT_WHATSAPP = '573001112233'

const DEFAULT_WHATSAPP_MESSAGE =
  'Hola, necesito ayuda con mi sistema solar y mi panel de cliente.'

function normalizeWhatsappNumber(raw: string | undefined): string {
  const cleaned = (raw ?? '').replace(/\D/g, '')
  return cleaned || FALLBACK_SUPPORT_WHATSAPP
}

export function buildSupportWhatsappLink(message: string = DEFAULT_WHATSAPP_MESSAGE): string {
  const phone = normalizeWhatsappNumber(import.meta.env.VITE_SUPPORT_WHATSAPP?.trim())
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
