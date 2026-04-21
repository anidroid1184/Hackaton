import { isAuthMockMode } from './authEnv'

export type AppRole = 'cliente' | 'operaciones' | 'corporativo' | 'tecnico'

export type AppAuthSource = 'supabase' | 'mock'

export type MockRoleSession = {
  role: AppRole
  email: string
  displayName: string
  signedAt: string
}

const MOCK_SESSION_STORAGE_KEY = 'solarpulse.mockAuthSession.v1'
const MOCK_SESSION_CHANGE_EVENT = 'solarpulse:mock-auth-changed'

type MockRoleCredentials = {
  role: AppRole
  email: string
  password: string
  displayName: string
}

/** Credenciales demo cuando no hay Supabase o VITE_ENABLE_OPERATIONS_MOCK_AUTH. */
const DEV_DEFAULT_MOCK_CREDENTIALS: MockRoleCredentials[] = [
  {
    role: 'cliente',
    email: 'cliente@demo.local',
    password: 'demo',
    displayName: 'Usuario residencial',
  },
  {
    role: 'operaciones',
    email: 'operaciones@demo.local',
    password: 'demo',
    displayName: 'Operaciones TR',
  },
  {
    role: 'corporativo',
    email: 'corporativo@demo.local',
    password: 'demo',
    displayName: 'Cliente corporativo',
  },
  {
    role: 'tecnico',
    email: 'tecnico@demo.local',
    password: 'demo',
    displayName: 'Tecnico de campo',
  },
]

export function isRoleMockAuthEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_OPERATIONS_MOCK_AUTH === 'true') return true
  return isAuthMockMode()
}

export function getDefaultRouteForRole(role: AppRole): string {
  if (role === 'operaciones') return '/operaciones/dashboard'
  if (role === 'corporativo') return '/corporativo/dashboard'
  if (role === 'tecnico') return '/tecnico/ruta'
  return '/dashboard'
}

function readMockRoleCredentials(): MockRoleCredentials[] {
  if (!isRoleMockAuthEnabled()) return []

  const roles: Array<{
    role: AppRole
    email?: string
    password?: string
    displayName?: string
    fallbackName: string
  }> = [
    {
      role: 'cliente',
      email: import.meta.env.VITE_CLIENT_MOCK_EMAIL,
      password: import.meta.env.VITE_CLIENT_MOCK_PASSWORD,
      displayName: import.meta.env.VITE_CLIENT_MOCK_NAME,
      fallbackName: 'Usuario residencial',
    },
    {
      role: 'operaciones',
      email: import.meta.env.VITE_OPERATIONS_MOCK_EMAIL,
      password: import.meta.env.VITE_OPERATIONS_MOCK_PASSWORD,
      displayName: import.meta.env.VITE_OPERATIONS_MOCK_NAME,
      fallbackName: 'Operaciones TR',
    },
    {
      role: 'corporativo',
      email: import.meta.env.VITE_CORPORATE_MOCK_EMAIL,
      password: import.meta.env.VITE_CORPORATE_MOCK_PASSWORD,
      displayName: import.meta.env.VITE_CORPORATE_MOCK_NAME,
      fallbackName: 'Cliente corporativo',
    },
    {
      role: 'tecnico',
      email: import.meta.env.VITE_TECHNICIAN_MOCK_EMAIL,
      password: import.meta.env.VITE_TECHNICIAN_MOCK_PASSWORD,
      displayName: import.meta.env.VITE_TECHNICIAN_MOCK_NAME,
      fallbackName: 'Tecnico de Campo',
    },
  ]

  const fromEnv = roles
    .map((entry) => ({
      role: entry.role,
      email: entry.email?.trim().toLowerCase() ?? '',
      password: entry.password?.trim() ?? '',
      displayName: entry.displayName?.trim() || entry.fallbackName,
    }))
    .filter((entry) => entry.email && entry.password)

  if (fromEnv.length > 0) return fromEnv

  if (isAuthMockMode()) {
    return DEV_DEFAULT_MOCK_CREDENTIALS.map((c) => ({
      ...c,
      email: c.email.toLowerCase(),
    }))
  }

  return []
}

function notifyMockSessionChanged() {
  window.dispatchEvent(new Event(MOCK_SESSION_CHANGE_EVENT))
}

export function onMockSessionChange(listener: () => void): () => void {
  window.addEventListener(MOCK_SESSION_CHANGE_EVENT, listener)
  return () => window.removeEventListener(MOCK_SESSION_CHANGE_EVENT, listener)
}

export function getMockRoleSession(): MockRoleSession | null {
  if (!isRoleMockAuthEnabled()) return null
  const raw = localStorage.getItem(MOCK_SESSION_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as MockRoleSession
    if (!parsed.role || !parsed.email) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveMockRoleSession(session: MockRoleSession) {
  localStorage.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(session))
  notifyMockSessionChanged()
}

export function clearMockRoleSession() {
  localStorage.removeItem(MOCK_SESSION_STORAGE_KEY)
  notifyMockSessionChanged()
}

export function tryAuthenticateMockRole(email: string, password: string): MockRoleSession | null {
  const credentials = readMockRoleCredentials()
  if (!credentials.length) return null
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPassword = password.trim()
  const matched = credentials.find(
    (entry) => normalizedEmail === entry.email && normalizedPassword === entry.password,
  )
  if (!matched) return null

  const session: MockRoleSession = {
    role: matched.role,
    email: matched.email,
    displayName: matched.displayName,
    signedAt: new Date().toISOString(),
  }
  saveMockRoleSession(session)
  return session
}

// Backward-compatible aliases for existing imports
export const isOperationsMockAuthEnabled = isRoleMockAuthEnabled
export const getMockOperationsSession = getMockRoleSession
export const saveMockOperationsSession = saveMockRoleSession
export const clearMockOperationsSession = clearMockRoleSession
export const tryAuthenticateOperationsMock = tryAuthenticateMockRole
