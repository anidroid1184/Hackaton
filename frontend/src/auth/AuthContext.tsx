import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isAuthMockMode } from './authEnv'
import { supabase } from '../lib/supabaseClient'
import {
  type AppAuthSource,
  type AppRole,
  getMockRoleSession,
  onMockSessionChange,
} from './mockOperationsAuth'

export type AppUser = {
  id: string
  email: string
  role: AppRole
  displayName: string
  source: AppAuthSource
}

export type AuthState = {
  session: Session | null
  user: AppUser | null
  role: AppRole | null
  source: AppAuthSource | null
  loading: boolean
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [mockUser, setMockUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsubscribeAuth: (() => void) | undefined
    const syncMockSession = () => {
      const mockSession = getMockRoleSession()
      if (mockSession) {
        setMockUser({
          id: `${mockSession.role}-mock-user`,
          email: mockSession.email,
          role: mockSession.role,
          displayName: mockSession.displayName,
          source: 'mock',
        })
        return
      }
      setMockUser(null)
    }

    syncMockSession()

    if (isAuthMockMode()) {
      queueMicrotask(() => {
        setLoading(false)
      })
    } else {
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (cancelled) return
          setSession(data.session)
          setSupabaseUser(data.session?.user ?? null)
          setLoading(false)
        })
        .catch(() => {
          if (cancelled) return
          setSession(null)
          setSupabaseUser(null)
          setLoading(false)
        })

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, nextSession) => {
          if (getMockRoleSession()) return
          setSession(nextSession)
          setSupabaseUser(nextSession?.user ?? null)
        },
      )
      unsubscribeAuth = () => authListener.subscription.unsubscribe()
    }

    const offMock = onMockSessionChange(() => {
      syncMockSession()
      if (getMockRoleSession()) {
        setSession(null)
        setSupabaseUser(null)
      }
    })

    const onStorage = (event: StorageEvent) => {
      if (event.key?.includes('solarpulse.mockAuthSession.v1')) {
        syncMockSession()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      unsubscribeAuth?.()
      offMock()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const resolvedUser = useMemo(() => {
    if (mockUser) return mockUser
    if (!supabaseUser) return null
    return {
      id: supabaseUser.id,
      email: supabaseUser.email ?? '',
      role: 'cliente' as const,
      displayName: supabaseUser.email?.split('@')[0] || 'Cuenta',
      source: 'supabase' as const,
    }
  }, [mockUser, supabaseUser])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: resolvedUser,
      role: resolvedUser?.role ?? null,
      source: resolvedUser?.source ?? null,
      loading,
    }),
    [session, resolvedUser, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook companion in the same module
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return ctx
}
