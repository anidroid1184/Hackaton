/** Formateadores localizados (es-CO) para dashboard residencial. */

const currencyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const energyFmt = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
})

const integerFmt = new Intl.NumberFormat('es-CO')

export function formatCop(value: number): string {
  return currencyFmt.format(value)
}

export function formatEnergy(value: number, unit: 'kWh' | 'kg' | 'kgCO₂' = 'kWh'): string {
  return `${energyFmt.format(value)} ${unit}`
}

export function formatInteger(value: number): string {
  return integerFmt.format(value)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${integerFmt.format(value)}%`
}
