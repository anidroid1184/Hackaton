import { useMemo } from 'react'
import { useTheme } from '../../theme/ThemeContext'
import { getChartThemeColors, type ChartThemeColors } from './theme'

/** Recalcula colores cuando cambia el tema resuelto (claro / oscuro). */
export function useChartTheme(): ChartThemeColors {
  const { resolved } = useTheme()
  return useMemo(() => {
    void resolved
    return getChartThemeColors()
  }, [resolved])
}
