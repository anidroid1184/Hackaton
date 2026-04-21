import { createClient } from '@supabase/supabase-js'
import { isAuthMockMode } from '../auth/authEnv'

/** Valores por defecto del stack Supabase local (`supabase start`). Solo se usan en desarrollo si faltan env. */
const LOCAL_DEV_URL = 'http://127.0.0.1:54321'
const LOCAL_DEV_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

/** Host inalcanzable: el cliente existe por tipos; login no debe llamar a Supabase en modo mock. */
const PLACEHOLDER_URL = 'http://127.0.0.1:9'

function resolveUrlAndKey(): { url: string; anonKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (url && anonKey) {
    return { url, anonKey }
  }
  // Modo mock explícito (funciona en DEV y PROD)
  if (isAuthMockMode()) {
    console.info(
      '[MiTechoRentable] Auth mock mode: login local, sin Supabase Auth.',
    )
    return { url: PLACEHOLDER_URL, anonKey: LOCAL_DEV_ANON_KEY }
  }
  if (import.meta.env.DEV) {
    // Evita pantalla en blanco por throw en import: la app renderiza; auth fallará si el stack no está levantado.
    console.warn(
      '[MiTechoRentable] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env; usando URL/anon del Supabase local.',
    )
    return { url: LOCAL_DEV_URL, anonKey: LOCAL_DEV_ANON_KEY }
  }
  // PROD sin env vars ni mock → fallback a mock en lugar de crashear
  console.warn(
    '[MiTechoRentable] Producción sin credenciales Supabase: activando modo demo automáticamente.',
  )
  return { url: PLACEHOLDER_URL, anonKey: LOCAL_DEV_ANON_KEY }
}

const { url, anonKey } = resolveUrlAndKey()

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
