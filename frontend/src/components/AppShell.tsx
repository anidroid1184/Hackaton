import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { signOutAppSession } from '../auth/signOutAppSession'
import { Logo } from './Logo'
import { ThemeToggle } from '../theme/ThemeToggle'
import { NotificationDropdown } from './NotificationDropdown'
import { buildNotificationsByRole, type RoleNotification } from '../lib/roleNotifications'
import { useCriticalAlerts } from '../hooks/useCriticalAlerts'

type NavItem = {
  to: string
  label: string
  icon: string
}

type AppShellProps = {
  children?: ReactNode
  mode?: 'auth' | 'demo'
  variant?: 'cliente' | 'operaciones' | 'corporativo' | 'tecnico'
}

function buildNav(
  mode: 'auth' | 'demo',
  variant: 'cliente' | 'operaciones' | 'corporativo' | 'tecnico',
): NavItem[] {
  if (variant === 'operaciones') {
    return [
      { to: '/operaciones/dashboard', label: 'Fleet', icon: 'grid_view' },
      { to: '/operaciones/war-room', label: 'War Room', icon: 'warning' },
      { to: '/operaciones/compare', label: 'Comparar plantas', icon: 'compare_arrows' },
      { to: '/operaciones/agenda', label: 'Agenda', icon: 'calendar_month' },
      { to: '/operaciones/analytics', label: 'Analitica', icon: 'bar_chart' },
      { to: '/operaciones/tecnicos', label: 'Tecnicos', icon: 'engineering' },
      { to: '/operaciones/profile', label: 'Perfil', icon: 'person' },
    ]
  }
  if (variant === 'corporativo') {
    const base = mode === 'demo' ? '/preview/corporativo' : '/corporativo'
    return [
      { to: `${base}/dashboard`, label: 'Cliente corporativo', icon: 'factory' },
      { to: `${base}/profile`, label: 'Perfil', icon: 'person' },
    ]
  }
  if (variant === 'tecnico') {
    const base = mode === 'demo' ? '/preview/tecnico' : '/tecnico'
    return [
      { to: `${base}/ruta`, label: 'Ruta', icon: 'route' },
      { to: `${base}/telemetria`, label: 'Telemetria', icon: 'sensors' },
      { to: `${base}/salud`, label: 'Salud', icon: 'monitor_heart' },
      { to: `${base}/cierre`, label: 'Cierre', icon: 'task_alt' },
      { to: `${base}/profile`, label: 'Perfil', icon: 'person' },
    ]
  }
  const base = mode === 'demo' ? '/preview/cliente' : ''
  return [
    { to: `${base}/dashboard`, label: 'Inicio', icon: 'dashboard' },
    { to: `${base}/agenda`, label: 'Agenda', icon: 'calendar_month' },
    { to: `${base}/analytics`, label: 'Rendimiento', icon: 'monitoring' },
    { to: `${base}/reports`, label: 'Reportes', icon: 'description' },
    { to: `${base}/reports/pdf`, label: 'PDF', icon: 'picture_as_pdf' },
    { to: `${base}/support`, label: 'Soporte', icon: 'contact_support' },
    { to: `${base}/profile`, label: 'Perfil', icon: 'person' },
  ]
}

/**
 * Shell autenticado: sidebar (desktop), topbar (desktop + mobile), bottom-nav (mobile).
 * Mismos tokens para light y dark; un único sistema visual tras iniciar sesión.
 */
export function AppShell({ children, mode = 'auth' }: AppShellProps = {}) {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationRootRef = useRef<HTMLDivElement>(null)
  const notificationsPanelId = useId()
  const variant =
    pathname.startsWith('/operaciones')
      ? 'operaciones'
      : pathname.startsWith('/corporativo') || pathname.startsWith('/preview/corporativo')
        ? 'corporativo'
        : pathname.startsWith('/tecnico') || pathname.startsWith('/preview/tecnico')
          ? 'tecnico'
          : 'cliente'
  const nav = buildNav(mode, variant)
  const homePath = variant === 'operaciones'
    ? '/operaciones/dashboard'
    : variant === 'corporativo'
      ? mode === 'demo'
        ? '/preview/corporativo/dashboard'
        : '/corporativo/dashboard'
      : variant === 'tecnico'
        ? mode === 'demo'
          ? '/preview/tecnico/ruta'
          : '/tecnico/ruta'
    : mode === 'demo'
      ? '/preview/cliente/dashboard'
      : '/dashboard'

  async function handleSignOut() {
    if (mode === 'auth') {
      await signOutAppSession()
      navigate('/', { replace: true })
      return
    }
    navigate(homePath, { replace: true })
  }

  const email = mode === 'demo' ? 'demo@solarpulse.local' : user?.email ?? ''
  const displayName = mode === 'demo' ? 'Vista Demo' : user?.displayName || email.split('@')[0] || 'Cuenta'
  const initials = displayName.slice(0, 2).toUpperCase()
  const resolvedRole =
    role ??
    (variant === 'operaciones'
      ? 'operaciones'
      : variant === 'corporativo'
        ? 'corporativo'
        : variant === 'tecnico'
          ? 'tecnico'
          : 'cliente')
  const [notifications, setNotifications] = useState<RoleNotification[]>(() =>
    buildNotificationsByRole(resolvedRole),
  )
  const unreadCount = notifications.filter((item) => !item.read).length
  const { toasts, critical, dismissToast, clearCritical } = useCriticalAlerts(resolvedRole)
  const warRoomPath = mode === 'demo' ? '/preview/operaciones/war-room' : '/operaciones/war-room'

  useEffect(() => {
    if (!notificationsOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [notificationsOpen])

  useEffect(() => {
    if (!notificationsOpen) return
    function handlePointerDown(e: PointerEvent) {
      const root = notificationRootRef.current
      if (!root?.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [notificationsOpen])

  useEffect(() => {
    if (!notificationsOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setNotificationsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [notificationsOpen])

  return (
    <div className="relative flex min-h-svh bg-surface text-on-surface">
      {/* Sidebar desktop */}
      <aside
        aria-label="Navegación principal"
        className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-outline-ghost bg-surface-container-lowest px-5 py-6 md:flex"
      >
        <Link className="mb-8 inline-flex shrink-0 items-center gap-3 px-2" to={homePath}>
          <Logo />
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Secciones">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'group flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold transition',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
                  isActive
                    ? 'bg-primary-container/15 text-on-surface ring-1 ring-primary-container/30'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                ].join(' ')
              }
                  end={item.to === homePath}
            >
              <span
                aria-hidden
                className="material-symbols-outlined text-[1.2rem]"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 rounded-2xl bg-surface-container-low p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Sesión activa
          </p>
          <p
            className="mt-2 truncate text-sm font-semibold text-on-surface"
            title={email}
          >
            {email || 'Usuario'}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-outline-ghost px-3 py-2 text-sm font-medium text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            >
              <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
                logout
              </span>
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Zona principal */}
      <div className="flex min-h-svh flex-1 flex-col md:ml-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 overflow-visible border-b border-outline-ghost bg-surface/85 px-4 backdrop-blur-xl sm:h-20 sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline-ghost bg-surface-container-lowest text-on-surface md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              type="button"
            >
              <span aria-hidden className="material-symbols-outlined text-[1.2rem]">
                {menuOpen ? 'close' : 'menu'}
              </span>
            </button>
            <div className="flex md:hidden">
              <Logo size="sm" />
            </div>
            <div className="hidden md:flex md:flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                {(variant === 'operaciones'
                  ? 'Operaciones Techos Rentables'
                  : variant === 'corporativo'
                    ? 'Cliente corporativo'
                    : variant === 'tecnico'
                      ? 'Tecnico de Campo'
                      : 'Cliente residencial') + (mode === 'demo' ? ' · Demo' : '')}
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-on-surface">
                {labelFor(pathname, variant)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div ref={notificationRootRef} className="relative">
              <button
                aria-label="Notificaciones"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline-ghost bg-surface-container-lowest text-on-surface transition hover:bg-surface-container-high"
                onClick={() => setNotificationsOpen((v) => !v)}
                type="button"
                aria-expanded={notificationsOpen}
                aria-controls={notificationsPanelId}
              >
                <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                  notifications
                </span>
                {unreadCount > 0 ? (
                  <span
                    aria-hidden
                    className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-on-secondary"
                  >
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              <NotificationDropdown
                id={notificationsPanelId}
                open={notificationsOpen}
                notifications={notifications}
                onNotificationRead={(id) =>
                  setNotifications((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
                  )
                }
                onMarkAllRead={() =>
                  setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
                }
              />
            </div>
            <ThemeToggle compact />
            <div className="hidden items-center gap-3 rounded-full bg-surface-container-lowest px-3 py-1.5 ring-1 ring-outline-ghost sm:inline-flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-brand-solar-deep text-on-primary-container font-display text-xs font-bold">
                {initials}
              </span>
              <span className="hidden text-sm font-semibold text-on-surface md:inline">
                {displayName}
              </span>
            </div>
          </div>
        </header>

        {/* Menú móvil deslizable */}
        {menuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-inverse-surface/40 md:hidden"
            role="presentation"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="absolute inset-x-4 top-24 rounded-2xl border border-outline-ghost bg-surface-container-lowest p-4 shadow-floating animate-enter"
              role="dialog"
              aria-label="Navegación"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="flex flex-col gap-1">
                {nav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
                        isActive
                          ? 'bg-primary-container/15 text-on-surface'
                          : 'text-on-surface-variant hover:bg-surface-container',
                      ].join(' ')
                    }
                    end={item.to === homePath}
                  >
                    <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                >
                  <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                    logout
                  </span>
                  Salir
                </button>
              </nav>
            </div>
          </div>
        ) : null}

        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pb-12 md:pt-10">
          {children ?? <Outlet />}
        </main>

        {/* Toast region para alertas entrantes (no-críticas) */}
        <div
          role="status"
          aria-live="polite"
          aria-label="Alertas entrantes"
          className="pointer-events-none fixed bottom-24 right-4 z-40 flex max-w-sm flex-col gap-2 md:bottom-6"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={[
                'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-floating backdrop-blur-md animate-enter',
                toast.severity === 'critical'
                  ? 'border-error-container/60 bg-error-container/90 text-on-error-container'
                  : toast.severity === 'warn'
                    ? 'border-primary-container/60 bg-primary-container/90 text-on-primary-container'
                    : 'border-outline-ghost bg-surface-container-lowest text-on-surface',
              ].join(' ')}
            >
              <span aria-hidden className="material-symbols-outlined text-[1.2rem]">
                {toast.severity === 'critical' ? 'crisis_alert' : 'notifications_active'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-0.5 text-xs opacity-80">{toast.body}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar alerta"
                onClick={() => dismissToast(toast.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-on-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
              >
                <span aria-hidden className="material-symbols-outlined text-[1rem]">close</span>
              </button>
            </div>
          ))}
        </div>

        {/* Modal bloqueante para alertas críticas operaciones */}
        {critical ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="critical-alert-title"
            aria-describedby="critical-alert-body"
            className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 px-4 backdrop-blur-sm animate-enter"
          >
            <div className="w-full max-w-md rounded-2xl border border-error-container/60 bg-surface p-6 shadow-floating">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error-container/80 text-on-error-container"
                >
                  <span className="material-symbols-outlined text-[1.3rem]">crisis_alert</span>
                </span>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
                    Alerta crítica · {critical.geozone}
                  </p>
                  <h2
                    id="critical-alert-title"
                    className="mt-1 font-display text-xl font-bold text-on-surface"
                  >
                    {critical.plantName}
                  </h2>
                  <p id="critical-alert-body" className="mt-2 text-sm text-on-surface-variant">
                    {critical.summary}
                  </p>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Técnico sugerido: <strong>{critical.suggestedTechnicianName}</strong>
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearCritical}
                  className="inline-flex items-center gap-2 rounded-full border border-outline-ghost px-4 py-2 text-sm font-semibold text-on-surface-variant hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                >
                  Descartar
                </button>
                <Link
                  to={warRoomPath}
                  onClick={clearCritical}
                  className="btn-secondary inline-flex"
                >
                  <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
                    open_in_new
                  </span>
                  Ir al War Room
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Bottom nav mobile */}
        <nav
          aria-label="Accesos rápidos"
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-outline-ghost bg-surface-container-lowest/95 px-2 py-2 backdrop-blur-xl md:hidden"
        >
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
                  isActive ? 'text-on-surface' : 'text-on-surface-variant',
                ].join(' ')
              }
              end={item.to === homePath}
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className="material-symbols-outlined text-[1.3rem]"
                    style={{
                      fontVariationSettings: isActive
                        ? "'FILL' 1, 'wght' 500"
                        : "'FILL' 0, 'wght' 400",
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function labelFor(
  pathname: string,
  variant: 'cliente' | 'operaciones' | 'corporativo' | 'tecnico',
): string {
  if (variant === 'operaciones') {
    if (pathname.startsWith('/operaciones/dashboard')) return 'Fleet Overview'
    if (pathname.startsWith('/operaciones/war-room')) return 'War Room'
    if (pathname.startsWith('/operaciones/agenda')) return 'Panel de agenda'
    if (pathname.startsWith('/operaciones/analytics')) return 'Analitica regional'
    if (pathname.startsWith('/operaciones/tecnicos')) return 'Administracion de tecnicos'
    if (pathname.startsWith('/operaciones/profile')) return 'Perfil'
    if (pathname.startsWith('/operaciones/plants/')) return 'Detalle de planta'
    return 'Operaciones'
  }
  if (variant === 'corporativo') return 'Consola industrial'
  if (variant === 'tecnico') {
    if (pathname.includes('/ruta')) return 'Ruta por zona'
    if (pathname.includes('/telemetria')) return 'Telemetria + offline'
    if (pathname.includes('/salud')) return 'Salud preventiva'
    if (pathname.includes('/cierre')) return 'Cierre mantenimiento'
    return 'Tecnico de Campo'
  }
  if (pathname.startsWith('/dev/mock-hub')) return 'Mock hub'
  if (pathname.includes('/profile')) return 'Perfil'
  if (pathname.includes('/reports/pdf')) return 'Generación PDF'
  if (pathname.includes('/agenda')) return 'Agenda'
  if (pathname.startsWith('/analytics')) return 'Rendimiento'
  if (pathname.startsWith('/reports')) return 'Reportes'
  if (pathname.startsWith('/support')) return 'Soporte'
  return 'Inicio'
}
