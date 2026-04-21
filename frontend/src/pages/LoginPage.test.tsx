import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { ThemeProvider } from '../theme/ThemeContext'
import { clearMockOperationsSession } from '../auth/mockOperationsAuth'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null } as never),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null } as never),
    },
  },
}))

import { supabase } from '../lib/supabaseClient'

function renderLogin(initialPath = '/login') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>DASHBOARD_OK</div>} />
          <Route path="/cliente" element={<div>CLIENTE_OK</div>} />
          <Route path="/operaciones/dashboard" element={<div>OPERACIONES_OK</div>} />
          <Route path="/corporativo/dashboard" element={<div>CORPORATIVO_OK</div>} />
          <Route path="/tecnico/ruta" element={<div>TECNICO_OK</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key-for-vitest')
    vi.stubEnv('VITE_AUTH_MODE', 'supabase')
    vi.mocked(supabase.auth.signInWithPassword).mockClear()
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ error: null } as never)
    clearMockOperationsSession()
  })

  it('llama a signInWithPassword con email y contraseña al enviar', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secret123',
    })
  })

  it('redirige a /dashboard tras autenticación exitosa', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'cam@solarpulse.test')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'super-secret')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    await waitFor(() => expect(screen.getByText('DASHBOARD_OK')).toBeInTheDocument())
  })

  it('muestra el mensaje de error de Supabase cuando falla', async () => {
    const user = userEvent.setup()
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    } as never)

    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'no@existe.test')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'mal')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid login credentials|credenciales invalidas/i,
    )
  })

  it('redirige a operaciones cuando coincide con credenciales mock', async () => {
    vi.stubEnv('VITE_ENABLE_OPERATIONS_MOCK_AUTH', 'true')
    vi.stubEnv('VITE_OPERATIONS_MOCK_EMAIL', 'ops@techorentable.local')
    vi.stubEnv('VITE_OPERATIONS_MOCK_PASSWORD', 'ops-demo-2026')
    vi.stubEnv('VITE_OPERATIONS_MOCK_NAME', 'Operaciones TR')

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'ops@techorentable.local')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'ops-demo-2026')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    await waitFor(() => expect(screen.getByText('OPERACIONES_OK')).toBeInTheDocument())
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('redirige a corporativo cuando coincide con credenciales mock corporativas', async () => {
    vi.stubEnv('VITE_ENABLE_OPERATIONS_MOCK_AUTH', 'true')
    vi.stubEnv('VITE_CORPORATE_MOCK_EMAIL', 'corp@techorentable.local')
    vi.stubEnv('VITE_CORPORATE_MOCK_PASSWORD', 'corp-demo-2026')
    vi.stubEnv('VITE_CORPORATE_MOCK_NAME', 'Cliente Corporativo')

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'corp@techorentable.local')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'corp-demo-2026')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    await waitFor(() => expect(screen.getByText('CORPORATIVO_OK')).toBeInTheDocument())
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('redirige a dashboard cuando coincide con credenciales mock de cliente', async () => {
    vi.stubEnv('VITE_ENABLE_OPERATIONS_MOCK_AUTH', 'true')
    vi.stubEnv('VITE_CLIENT_MOCK_EMAIL', 'cliente@solarpulse.local')
    vi.stubEnv('VITE_CLIENT_MOCK_PASSWORD', 'cliente-demo-2026')
    vi.stubEnv('VITE_CLIENT_MOCK_NAME', 'Usuario residencial')

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'cliente@solarpulse.local')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'cliente-demo-2026')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    await waitFor(() => expect(screen.getByText('DASHBOARD_OK')).toBeInTheDocument())
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('redirige a tecnico cuando coincide con credenciales mock tecnicas', async () => {
    vi.stubEnv('VITE_ENABLE_OPERATIONS_MOCK_AUTH', 'true')
    vi.stubEnv('VITE_TECHNICIAN_MOCK_EMAIL', 'tech@techorentable.local')
    vi.stubEnv('VITE_TECHNICIAN_MOCK_PASSWORD', 'tech-demo-2026')
    vi.stubEnv('VITE_TECHNICIAN_MOCK_NAME', 'Tecnico de Campo')

    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText(/correo electrónico/i), 'tech@techorentable.local')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'tech-demo-2026')
    await user.click(screen.getByRole('button', { name: /^iniciar sesión$/i }))

    await waitFor(() => expect(screen.getByText('TECNICO_OK')).toBeInTheDocument())
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})
