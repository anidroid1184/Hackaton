import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { getDefaultRouteForRole, type AppRole } from './mockOperationsAuth'

type ProtectedRouteProps = {
  children: ReactNode
  redirectTo?: string
  requiredRole?: AppRole
}

/**
 * Envoltorio para rutas autenticadas.
 * - Mientras `loading`, muestra un skeleton mínimo (evita parpadeo de login).
 * - Si no hay sesión, redirige a `/login` conservando `from` para volver tras auth.
 */
export function ProtectedRoute({
  children,
  redirectTo = '/login',
  requiredRole,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface text-on-surface-variant">
        <div
          aria-live="polite"
          className="flex items-center gap-3 rounded-full bg-surface-container-low px-5 py-3 text-sm font-medium"
        >
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-primary-container" />
          Comprobando sesión…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={getDefaultRouteForRole(role ?? 'cliente')} replace />
  }

  return <>{children}</>
}

/**
 * Para rutas PÚBLICAS que deben desaparecer si ya hay sesión (landing, login, register):
 * se redirige al dashboard y se evita volver con “atrás”.
 */
export function RedirectIfAuthed({
  children,
  to,
}: {
  children: ReactNode
  to?: string
}) {
  const { user, role, loading } = useAuth()
  if (loading) return <>{children}</>
  if (user) return <Navigate to={to ?? getDefaultRouteForRole(role ?? 'cliente')} replace />
  return <>{children}</>
}
