/** Detección de modo auth sin Supabase (desarrollo / demo). */

export function hasViteSupabaseCredentials(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return Boolean(url && key)
}

/**
 * Mock: sin Supabase real (login local, sesión en localStorage).
 * - `VITE_AUTH_MODE=mock` fuerza mock.
 * - En DEV, si faltan URL/anon en .env, mock por defecto (evita 127.0.0.1:54321 caído).
 */
export function isAuthMockMode(): boolean {
  const mode = import.meta.env.VITE_AUTH_MODE?.trim().toLowerCase()
  if (mode === 'mock') return true
  if (mode === 'supabase') return false
  if (import.meta.env.DEV && !hasViteSupabaseCredentials()) return true
  return false
}
