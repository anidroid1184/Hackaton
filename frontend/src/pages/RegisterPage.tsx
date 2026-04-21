import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import logoImg from '/LogoTechosRentables.png'
import { isAuthMockMode } from '../auth/authEnv'
import { supabase } from '../lib/supabaseClient'

export function RegisterPage() {
  const navigate = useNavigate()
  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (isAuthMockMode()) {
      setError('El registro con Supabase no está disponible en modo demo. Usa el login con usuarios demo o configura VITE_SUPABASE_* y VITE_AUTH_MODE=supabase.')
      return
    }
    setSubmitting(true)
    const { error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    setSubmitting(false)
    if (signError) {
      setError(signError.message)
      return
    }
    navigate('/dashboard', { replace: true })
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
              Crear cuenta
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Únete a MiTechoRentable y sigue tu producción solar.
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
            <label className="block text-sm font-medium text-on-surface-variant" htmlFor={passwordId}>
              Contraseña
            </label>
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[1.15rem]">lock</span>
              </span>
              <input
                aria-describedby={invalid ? errorId : undefined}
                aria-invalid={invalid}
                autoComplete="new-password"
                className="input pr-12"
                id={passwordId}
                minLength={6}
                name="password"
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="Mínimo 6 caracteres"
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

          {error ? (
            <p
              className="rounded-xl bg-error-container/80 px-3 py-2 text-left text-sm text-on-error-container"
              id={errorId}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button className="btn-primary w-full" disabled={submitting} type="submit">
            <span>{submitting ? 'Creando…' : 'Registrarme'}</span>
            <span aria-hidden className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </button>
        </form>

        <div className="my-8 flex items-center justify-center gap-4">
          <div className="h-px w-full bg-outline-ghost" />
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Cuenta
          </span>
          <div className="h-px w-full bg-outline-ghost" />
        </div>

        <p className="text-center text-sm text-on-surface-variant">
          ¿Ya tienes cuenta?{' '}
          <Link
            className="rounded-sm font-semibold text-primary-container underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            to="/login"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
