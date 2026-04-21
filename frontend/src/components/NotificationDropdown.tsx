import type { RoleNotification } from '../lib/roleNotifications'

type NotificationDropdownProps = {
  id: string
  open: boolean
  notifications: RoleNotification[]
  onNotificationRead: (id: string) => void
  onMarkAllRead: () => void
}

/**
 * Panel desplegable de notificaciones bajo el icono (padre `relative`).
 * Cierre por clic fuera y Escape lo gestiona AppShell.
 */
export function NotificationDropdown({
  id,
  open,
  notifications,
  onNotificationRead,
  onMarkAllRead,
}: NotificationDropdownProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label="Notificaciones"
      aria-hidden={!open}
      className={
        open
          ? 'absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[min(24rem,70vh)] overflow-hidden rounded-2xl border border-outline-ghost bg-surface-container-lowest shadow-floating'
          : 'hidden'
      }
    >
      <div className="flex max-h-[min(24rem,70vh)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-ghost px-4 py-3">
          <h2 className="font-display text-base font-bold text-on-surface sm:text-lg">Notificaciones</h2>
          <button
            type="button"
            className="shrink-0 text-sm font-semibold text-on-surface-variant transition hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            onClick={onMarkAllRead}
          >
            Marcar todo leido
          </button>
        </div>
        <ul className="overflow-y-auto p-2">
          {notifications.map((notification) => (
            <li key={notification.id} className="mb-2 last:mb-0">
              <button
                type="button"
                onClick={() => onNotificationRead(notification.id)}
                className={[
                  'w-full rounded-xl border px-3 py-3 text-left transition',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
                  notification.read
                    ? 'border-outline-ghost bg-surface'
                    : 'border-primary-container/30 bg-primary-container/10',
                ].join(' ')}
              >
                <p className="text-sm font-semibold text-on-surface">{notification.title}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{notification.detail}</p>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  {new Date(notification.ts).toLocaleString('es-CO')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
