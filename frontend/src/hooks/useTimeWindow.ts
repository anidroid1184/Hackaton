import { useCallback, useEffect, useRef, useState } from 'react'

export type TimePreset = '24h' | '7d' | '30d' | 'custom'

export type TimeWindow = {
  from: string
  to: string
  t: string
  preset: TimePreset
}

export const TIME_WINDOW_STORAGE_KEY = 'solarpulse.timeWindow.v1'
export const TIME_WINDOW_CHANGE_EVENT = 'solarpulse:time-window'

const PRESET_DURATIONS_MS: Record<Exclude<TimePreset, 'custom'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

const SET_T_DEBOUNCE_MS = 150

function isTimePreset(value: unknown): value is TimePreset {
  return value === '24h' || value === '7d' || value === '30d' || value === 'custom'
}

function isIsoString(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  return Number.isFinite(Date.parse(value))
}

function clampIso(iso: string, from: string, to: string): string {
  const tMs = Date.parse(iso)
  const fromMs = Date.parse(from)
  const toMs = Date.parse(to)
  if (!Number.isFinite(tMs)) return to
  if (tMs < fromMs) return from
  if (tMs > toMs) return to
  return iso
}

/**
 * Calcula un rango `[from, to]` relativo al `anchor` (default = ahora).
 * - `24h` / `7d` / `30d`: rango hacia atrás desde `anchor`.
 * - `custom`: retorna el último rango persistido en localStorage; si no hay,
 *   cae en `24h` para ofrecer un fallback seguro.
 */
export function computeRange(
  preset: TimePreset,
  anchor: Date = new Date(),
): { from: string; to: string } {
  if (preset === 'custom') {
    const stored = readStoredTimeWindow()
    if (stored) return { from: stored.from, to: stored.to }
    const toMs = anchor.getTime()
    return {
      from: new Date(toMs - PRESET_DURATIONS_MS['24h']).toISOString(),
      to: new Date(toMs).toISOString(),
    }
  }
  const toMs = anchor.getTime()
  const fromMs = toMs - PRESET_DURATIONS_MS[preset]
  return { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() }
}

function defaultTimeWindow(): TimeWindow {
  const { from, to } = computeRange('24h')
  return { from, to, t: to, preset: '24h' }
}

function normalizeTimeWindow(raw: Partial<TimeWindow> | null): TimeWindow {
  if (!raw) return defaultTimeWindow()
  const preset: TimePreset = isTimePreset(raw.preset) ? raw.preset : '24h'
  const from = isIsoString(raw.from) ? raw.from : null
  const to = isIsoString(raw.to) ? raw.to : null
  if (!from || !to || Date.parse(from) >= Date.parse(to)) {
    return defaultTimeWindow()
  }
  const rawT = isIsoString(raw.t) ? raw.t : to
  return { from, to, t: clampIso(rawT, from, to), preset }
}

export function readStoredTimeWindow(): TimeWindow | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(TIME_WINDOW_STORAGE_KEY)
    if (!raw) return null
    return normalizeTimeWindow(JSON.parse(raw) as Partial<TimeWindow>)
  } catch {
    return null
  }
}

function writeStoredTimeWindow(value: TimeWindow): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TIME_WINDOW_STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* localStorage puede fallar en modo privado; ignoramos silenciosamente. */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TIME_WINDOW_CHANGE_EVENT))
  }
}

function sameWindow(a: TimeWindow, b: TimeWindow): boolean {
  return a.from === b.from && a.to === b.to && a.t === b.t && a.preset === b.preset
}

export type UseTimeWindowReturn = {
  window: TimeWindow
  setPreset: (preset: TimePreset) => void
  setT: (iso: string) => void
  setCustomRange: (from: string, to: string) => void
}

export function useTimeWindow(): UseTimeWindowReturn {
  const [state, setState] = useState<TimeWindow>(
    () => readStoredTimeWindow() ?? defaultTimeWindow(),
  )

  const stateRef = useRef<TimeWindow>(state)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const sync = () => {
      const latest = readStoredTimeWindow()
      if (!latest) return
      setState((prev) => (sameWindow(prev, latest) ? prev : latest))
    }
    window.addEventListener(TIME_WINDOW_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(TIME_WINDOW_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [])

  const setPreset = useCallback((preset: TimePreset) => {
    setState((prev) => {
      if (preset === 'custom') {
        const next: TimeWindow = { ...prev, preset: 'custom' }
        writeStoredTimeWindow(next)
        return next
      }
      const { from, to } = computeRange(preset)
      const next: TimeWindow = { from, to, t: to, preset }
      writeStoredTimeWindow(next)
      return next
    })
  }, [])

  const setCustomRange = useCallback((from: string, to: string) => {
    if (!isIsoString(from) || !isIsoString(to)) return
    if (Date.parse(from) >= Date.parse(to)) return
    setState((prev) => {
      const next: TimeWindow = { from, to, t: clampIso(prev.t, from, to), preset: 'custom' }
      writeStoredTimeWindow(next)
      return next
    })
  }, [])

  const setT = useCallback((iso: string) => {
    if (!isIsoString(iso)) return
    setState((prev) => {
      const nextT = clampIso(iso, prev.from, prev.to)
      return prev.t === nextT ? prev : { ...prev, t: nextT }
    })
    if (typeof window === 'undefined') return
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      writeStoredTimeWindow(stateRef.current)
      debounceRef.current = null
    }, SET_T_DEBOUNCE_MS)
  }, [])

  return { window: state, setPreset, setT, setCustomRange }
}
