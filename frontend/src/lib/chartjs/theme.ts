/**
 * Lee tokens MiTechoRentable desde `:root` (incluye overrides en `html.dark`).
 * Usado para alinear Chart.js con `index.css`.
 */
export type ChartThemeColors = {
  tick: string
  grid: string
  text: string
  brandSolar: string
  secondary: string
  primaryContainer: string
  surface: string
  fontFamily: string
}

export function getChartThemeColors(): ChartThemeColors {
  const root = document.documentElement
  const s = getComputedStyle(root)
  const font = s.getPropertyValue('--font-sans').trim()
  return {
    tick: s.getPropertyValue('--color-on-surface-variant').trim(),
    grid: s.getPropertyValue('--color-outline-ghost').trim(),
    text: s.getPropertyValue('--color-on-surface').trim(),
    brandSolar: s.getPropertyValue('--color-brand-solar').trim(),
    secondary: s.getPropertyValue('--color-secondary').trim(),
    primaryContainer: s.getPropertyValue('--color-primary-container').trim(),
    surface:
      s.getPropertyValue('--color-surface-container-lowest').trim() ||
      s.getPropertyValue('--color-surface').trim(),
    fontFamily: font || "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  }
}

/** Convierte un color CSS (hex, rgb, nombre…) a `rgba(…, alpha)` vía el motor de estilos. */
export function cssColorToRgba(color: string, alpha: number): string {
  if (typeof document === 'undefined') {
    return color
  }
  const el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.visibility = 'hidden'
  el.style.color = color.trim()
  document.body.appendChild(el)
  const rgb = getComputedStyle(el).color
  document.body.removeChild(el)
  const nums = rgb.match(/[\d.]+/g)
  if (!nums || nums.length < 3) {
    return `rgba(0, 0, 0, ${alpha})`
  }
  const [r, g, b] = nums.map(Number)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
