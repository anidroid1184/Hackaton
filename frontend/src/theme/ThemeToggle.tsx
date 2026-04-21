import { useId } from 'react'
import { useTheme } from './ThemeContext'

type ThemeToggleProps = {
  compact?: boolean
}

/**
 * Toggle accesible: claro ⇄ oscuro. Ícono cambia, etiqueta para SR siempre presente.
 * `compact` lo hace cuadrado (icon-only) para header/sidebar.
 */
export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolved, toggle } = useTheme()
  const tooltipId = useId()
  const isDark = resolved === 'dark'
  const nextLabel = isDark ? 'Activar modo claro' : 'Activar modo oscuro'

  if (compact) {
    return (
      <button
        aria-label={nextLabel}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-outline-ghost bg-surface-container-lowest text-on-surface transition hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
        onClick={toggle}
        title={nextLabel}
        type="button"
      >
        <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
          {isDark ? 'light_mode' : 'dark_mode'}
        </span>
      </button>
    )
  }

  return (
    <button
      aria-describedby={tooltipId}
      aria-label={nextLabel}
      className="inline-flex items-center gap-2 rounded-full border border-outline-ghost bg-surface-container-lowest px-3 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
      onClick={toggle}
      type="button"
    >
      <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
      <span id={tooltipId}>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>
    </button>
  )
}
