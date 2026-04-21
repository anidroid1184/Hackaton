import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import type { PromiseVsReal } from '../lib/residentialMock'
import { lineChartDefaultOptions } from '../lib/chartjs/defaultOptions'
import { cssColorToRgba } from '../lib/chartjs/theme'
import { useChartTheme } from '../lib/chartjs/useChartTheme'

type Props = {
  data: PromiseVsReal
}

/**
 * Promesa vs real — Chart.js (líneas), tema MiTechoRentable desde tokens CSS.
 */
export function PromiseVsRealChart({ data }: Props) {
  const theme = useChartTheme()

  const gradientPlugin = useMemo<Plugin<'line'>>(
    () => ({
      id: 'pvrAreaGradient',
      beforeDatasetsDraw(chart) {
        const area = chart.chartArea
        if (!area || area.bottom <= area.top) return
        const ds = chart.data.datasets[1] as {
          fill?: boolean | number | string
          backgroundColor?: unknown
        }
        if (!ds?.fill) return
        const ctx = chart.ctx
        const g = ctx.createLinearGradient(0, area.top, 0, area.bottom)
        g.addColorStop(0, cssColorToRgba(theme.secondary, 0.24))
        g.addColorStop(1, cssColorToRgba(theme.secondary, 0.03))
        ds.backgroundColor = g
      },
    }),
    [theme],
  )

  const chartData: ChartData<'line'> = useMemo(
    () => ({
      labels: data.real.map((p) => p.ts),
      datasets: [
        {
          label: 'Nuestra promesa',
          data: data.promise.map((p) => p.value),
          borderColor: theme.brandSolar,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: theme.brandSolar,
          pointBorderColor: theme.brandSolar,
        },
        {
          label: 'Lo que generaste',
          data: data.real.map((p) => p.value),
          borderColor: theme.secondary,
          backgroundColor: cssColorToRgba(theme.secondary, 0.12),
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: theme.secondary,
          pointBorderColor: theme.surface,
        },
      ],
    }),
    [data, theme],
  )

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      ...lineChartDefaultOptions,
      plugins: {
        legend: {
          position: 'bottom',
          align: 'center',
          labels: {
            boxWidth: 32,
            usePointStyle: true,
            pointStyle: 'line',
            color: theme.tick,
            font: {
              family: theme.fontFamily,
              size: 12,
            },
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: theme.surface,
          titleColor: theme.text,
          bodyColor: theme.tick,
          borderColor: theme.grid,
          borderWidth: 1,
          padding: 12,
          titleFont: { family: theme.fontFamily, size: 13, weight: 600 },
          bodyFont: { family: theme.fontFamily, size: 12 },
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y
              const n = typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(1) : String(v)
              const label = ctx.dataset.label ?? ''
              return `${label}: ${n} kWh`
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: theme.tick,
            font: { family: theme.fontFamily, size: 10 },
            maxRotation: 45,
            minRotation: 0,
          },
          grid: {
            color: theme.grid,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Energía (kWh)',
            color: theme.tick,
            font: { family: theme.fontFamily, size: 11, weight: 600 },
          },
          ticks: {
            color: theme.tick,
            font: { family: theme.fontFamily, size: 10 },
            callback(value) {
              if (typeof value === 'number') return value.toFixed(1)
              return String(value)
            },
          },
          grid: {
            color: theme.grid,
          },
        },
      },
    }),
    [theme],
  )

  return (
    <figure
      className="relative w-full"
      aria-label="Comparación Nuestra promesa versus lo que generaste"
    >
      <p className="sr-only">
        Energía en kilovatios hora. Eje horizontal: meses del año. Dos series: promesa contractual y
        generación real.
      </p>
      <div className="w-full sm:min-h-[260px] md:min-h-[280px]">
        <div className="h-[240px] w-full sm:h-[260px] md:h-[280px]">
          <Line data={chartData} options={options} plugins={[gradientPlugin]} />
        </div>
      </div>
    </figure>
  )
}
