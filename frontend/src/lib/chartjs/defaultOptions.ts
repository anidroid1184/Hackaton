import type { ChartOptions } from 'chart.js'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Opciones base compartidas por gráficos de línea (responsive, interacción, animación). */
export const lineChartDefaultOptions: Partial<ChartOptions<'line'>> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  animation: {
    duration: prefersReducedMotion() ? 0 : 1200,
  },
  layout: {
    padding: { top: 4, right: 8, bottom: 4, left: 4 },
  },
}
