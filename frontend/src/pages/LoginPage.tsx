import { useId, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import logoImg from '/LogoTechosRentables.png'
import { supabase } from '../lib/supabaseClient'
import { isAuthMockMode } from '../auth/authEnv'
import {
  getDefaultRouteForRole,
  isOperationsMockAuthEnabled,
  tryAuthenticateOperationsMock,
} from '../auth/mockOperationsAuth'

type LocationState = { from?: string } | null

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const rememberLabelId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberSession, setRememberSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setResetMessage(null)
    setSubmitting(true)
    const mockOpsSession = tryAuthenticateOperationsMock(email, password)
    if (mockOpsSession) {
      setSubmitting(false)
      const state = (location.state as LocationState) ?? null
      const fallbackPath = getDefaultRouteForRole(mockOpsSession.role)
      const redirectTo = state?.from && state.from.startsWith('/') ? state.from : fallbackPath
      navigate(redirectTo, { replace: true })
      return
    }

    if (isAuthMockMode()) {
      setSubmitting(false)
      setError(
        'Credenciales invalidas. Usuarios demo: cliente@demo.local / demo, operaciones@demo.local / demo, corporativo@demo.local / demo, tecnico@demo.local / demo.',
      )
      return
    }

    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)
    if (signError) {
      setError(signError.message)
      if (isOperationsMockAuthEnabled()) {
        setError(
          'Credenciales invalidas. Verifica usuario/clave mock (Cliente, Operaciones, Corporativo o Tecnico) o tu cuenta Supabase.',
        )
      }
      return
    }
    const state = (location.state as LocationState) ?? null
    const redirectTo = state?.from && state.from.startsWith('/') ? state.from : getDefaultRouteForRole('cliente')
    navigate(redirectTo, { replace: true })
  }

  async function onForgotPassword() {
    setError(null)
    setResetMessage(null)
    if (isAuthMockMode()) {
      setError('Recuperacion de contraseña no aplica en modo demo sin Supabase.')
      return
    }
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Introduce tu correo y vuelve a pulsar «¿Olvidaste tu contraseña?».')
      return
    }
    setResetting(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/login`,
    })
    setResetting(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setResetMessage('Si existe una cuenta, recibirás un enlace para restablecer la contraseña.')
  }

  const invalid = Boolean(error)

  return (
    <AuthLayout>
      <div className="card relative z-10 p-6 sm:p-8 md:p-10">
        <div className="mb-8 flex flex-col items-center space-y-3 text-center">
          <img
            src={logoImg}
            alt="Techos Rentables"
            width={220}
            height={120}
            className="h-auto max-h-28 w-auto max-w-[13rem] object-contain object-center"
          />
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
              Bienvenido a MiTechoRentable
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Accede al panel de monitorización de tu energía.
            </p>
          </div>
        </div>

        <form className="space-y-5" noValidate onSubmit={onSubmit}>
          <div className="space-y-2 text-left">
            <label className="block text-sm font-medium text-on-surface-variant" htmlFor={emailId}>
              Correo electrónico
            </label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[1.15rem]">mail</span>
              </span>
              <input
                aria-describedby={invalid ? errorId : undefined}
                aria-invalid={invalid}
                autoComplete="email"
                className="input"
                id={emailId}
                name="email"
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="tu@empresa.com"
                required
                type="email"
                value={email}
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <label
                className="block text-sm font-medium text-on-surface-variant"
                htmlFor={passwordId}
              >
                Contraseña
              </label>
              <button
                className="shrink-0 rounded-sm text-xs font-semibold text-primary-container transition hover:text-primary disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                disabled={resetting}
                onClick={(ev) => {
                  ev.preventDefault()
                  void onForgotPassword()
                }}
                type="button"
              >
                {resetting ? 'Enviando…' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[1.15rem]">lock</span>
              </span>
              <input
                aria-describedby={invalid ? errorId : undefined}
                aria-invalid={invalid}
                autoComplete="current-password"
                className="input pr-12"
                id={passwordId}
                name="password"
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="••••••••"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex items-center rounded-sm pr-3 text-on-surface-variant transition hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                onClick={() => setShowPassword((v) => !v)}
                type="button"
              >
                <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
              <button
                aria-checked={rememberSession}
                aria-labelledby={rememberLabelId}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container',
                  rememberSession ? 'bg-secondary' : 'bg-surface-container-high',
                ].join(' ')}
              onClick={() => setRememberSession((v) => !v)}
              role="switch"
              type="button"
            >
              <span
                className={[
                  'h-5 w-5 rounded-full bg-surface-container-lowest shadow transition-transform duration-200 ease-out',
                  rememberSession ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <span className="text-sm text-on-surface-variant" id={rememberLabelId}>
              Mantener sesión activa
            </span>
          </div>

          {error ? (
            <p
              className="rounded-xl bg-error-container/80 px-3 py-2 text-left text-sm text-on-error-container"
              id={errorId}
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {resetMessage ? (
            <p
              className="rounded-xl bg-secondary-container/70 px-3 py-2 text-left text-sm text-on-secondary-container"
              role="status"
            >
              {resetMessage}
            </p>
          ) : null}

          <button className="btn-primary group w-full" disabled={submitting} type="submit">
            <span>{submitting ? 'Entrando…' : 'Iniciar sesión'}</span>
            <span
              aria-hidden
              className="material-symbols-outlined text-lg transition-transform duration-200 group-hover:translate-x-0.5"
            >
              arrow_forward
            </span>
          </button>
        </form>

        <div className="my-8 flex items-center justify-center gap-4">
          <div className="h-px w-full bg-outline-ghost" />
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Acceso
          </span>
          <div className="h-px w-full bg-outline-ghost" />
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm text-on-surface-variant">¿Aún no tienes cuenta en MiTechoRentable?</p>
          <Link className="btn-secondary w-full" to="/register">
            <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
              person_add
            </span>
            Crear cuenta
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
