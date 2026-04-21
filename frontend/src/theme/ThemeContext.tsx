import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

type ThemeContextValue = {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

const STORAGE_KEY = 'solarpulse:theme'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  // `matchMedia` puede no existir en entornos de test (jsdom sin polyfill).
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return mode
}

function applyToHtml(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark())

  const resolved: ResolvedTheme =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    applyToHtml(resolved)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode)
    }
  }, [mode, resolved])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])
  const toggle = useCallback(
    () => setModeState((prev) => (resolve(prev) === 'dark' ? 'light' : 'dark')),
    [],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook companion in the same module
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
