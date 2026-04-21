import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, RedirectIfAuthed } from './ProtectedRoute'
import type { AuthState } from './AuthContext'

const authStateMock = vi.hoisted(() => ({
  current: { user: null, session: null, role: null, source: null, loading: false } as AuthState,
}))

vi.mock('./AuthContext', async () => {
  const actual = await vi.importActual<typeof import('./AuthContext')>('./AuthContext')
  return {
    ...actual,
    useAuth: () => authStateMock.current,
  }
})

function renderRoutes(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>DASHBOARD_OK</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operaciones/dashboard"
          element={
            <ProtectedRoute requiredRole="operaciones">
              <div>OPERACIONES_OK</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/corporativo/dashboard"
          element={
            <ProtectedRoute requiredRole="corporativo">
              <div>CORPORATIVO_OK</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tecnico/ruta"
          element={
            <ProtectedRoute requiredRole="tecnico">
              <div>TECNICO_OK</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <RedirectIfAuthed>
              <div>LANDING_OK</div>
            </RedirectIfAuthed>
          }
        />
        <Route path="/login" element={<div>LOGIN_OK</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('renderiza el hijo cuando hay usuario en sesión', () => {
    authStateMock.current = {
      user: {
        id: 'u1',
        email: 'x@y.z',
        role: 'cliente',
        displayName: 'x',
        source: 'supabase',
      },
      session: { access_token: 'x' } as AuthState['session'],
      role: 'cliente',
      source: 'supabase',
      loading: false,
    }
    renderRoutes('/dashboard')
    expect(screen.getByText('DASHBOARD_OK')).toBeInTheDocument()
  })

  it('redirige a /login cuando no hay sesión', () => {
    authStateMock.current = { user: null, session: null, role: null, source: null, loading: false }
    renderRoutes('/dashboard')
    expect(screen.getByText('LOGIN_OK')).toBeInTheDocument()
  })

  it('muestra loader mientras el auth está cargando', () => {
    authStateMock.current = { user: null, session: null, role: null, source: null, loading: true }
    renderRoutes('/dashboard')
    expect(screen.getByText(/comprobando sesión/i)).toBeInTheDocument()
  })

  it('permite ruta de operaciones cuando el rol es operaciones', () => {
    authStateMock.current = {
      user: {
        id: 'ops-1',
        email: 'ops@techorentable.local',
        role: 'operaciones',
        displayName: 'Operaciones TR',
        source: 'mock',
      },
      session: null,
      role: 'operaciones',
      source: 'mock',
      loading: false,
    }
    renderRoutes('/operaciones/dashboard')
    expect(screen.getByText('OPERACIONES_OK')).toBeInTheDocument()
  })

  it('bloquea ruta corporativa para rol cliente', () => {
    authStateMock.current = {
      user: {
        id: 'client-1',
        email: 'client@solarpulse.local',
        role: 'cliente',
        displayName: 'Cliente',
        source: 'supabase',
      },
      session: { access_token: 'x' } as AuthState['session'],
      role: 'cliente',
      source: 'supabase',
      loading: false,
    }
    renderRoutes('/corporativo/dashboard')
    expect(screen.getByText('DASHBOARD_OK')).toBeInTheDocument()
  })

  it('permite ruta de tecnico cuando el rol es tecnico', () => {
    authStateMock.current = {
      user: {
        id: 'tech-1',
        email: 'tech@solarpulse.local',
        role: 'tecnico',
        displayName: 'Tecnico',
        source: 'mock',
      },
      session: null,
      role: 'tecnico',
      source: 'mock',
      loading: false,
    }
    renderRoutes('/tecnico/ruta')
    expect(screen.getByText('TECNICO_OK')).toBeInTheDocument()
  })
})

describe('RedirectIfAuthed', () => {
  it('muestra la landing cuando no hay sesión', () => {
    authStateMock.current = { user: null, session: null, role: null, source: null, loading: false }
    renderRoutes('/')
    expect(screen.getByText('LANDING_OK')).toBeInTheDocument()
  })

  it('redirige al dashboard cuando ya hay sesión', () => {
    authStateMock.current = {
      user: {
        id: 'u1',
        email: 'x@y.z',
        role: 'cliente',
        displayName: 'x',
        source: 'supabase',
      },
      session: { access_token: 'x' } as AuthState['session'],
      role: 'cliente',
      source: 'supabase',
      loading: false,
    }
    renderRoutes('/')
    expect(screen.getByText('DASHBOARD_OK')).toBeInTheDocument()
  })

  it('redirige a operaciones si ya existe sesión de operaciones', () => {
    authStateMock.current = {
      user: {
        id: 'ops-1',
        email: 'ops@techorentable.local',
        role: 'operaciones',
        displayName: 'Operaciones TR',
        source: 'mock',
      },
      session: null,
      role: 'operaciones',
      source: 'mock',
      loading: false,
    }
    renderRoutes('/')
    expect(screen.getByText('OPERACIONES_OK')).toBeInTheDocument()
  })
})
