import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../theme/ThemeToggle'

/**
 * Landing pública. Usa los mismos tokens (primary-container ámbar, secondary verde,
 * surface cálido) que el dashboard y el login, adaptables a light/dark.
 *
 * Si hay sesión activa, `RedirectIfAuthed` en App.tsx ya envía al /dashboard, así que
 * aquí no necesitamos condicionales sobre `user`.
 */
const LANDING_HERO_BG = '/ImagenFondoPagPrincipal.png'

export function LandingPage() {
  return (
    <div className="relative flex min-h-svh flex-col text-on-surface">
      {/*
        Marca de agua: capas z-0 (no negativo: evita quedar detrás del bg del root en algunos navegadores).
        opacity + blur solo en el div de la imagen (sin hijos de UI).
        Imagen ~78% opacidad (marca de agua fuerte) + velo surface/10–12 para legibilidad.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 min-h-svh overflow-hidden"
      >
        <div className="absolute inset-0 bg-surface" />
        <div
          className="absolute inset-0 min-h-full scale-[1.08] bg-cover bg-center bg-no-repeat opacity-[0.78] blur-md motion-reduce:blur-sm sm:blur-lg"
          style={{ backgroundImage: `url('${LANDING_HERO_BG}')` }}
        />
        <div className="absolute inset-0 bg-surface/10 dark:bg-surface/12" />
      </div>

      <header className="sticky top-0 z-20 border-b border-outline-ghost bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            to="/"
            className="transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container"
            aria-label="MiTechoRentable inicio"
          >
            <Logo />
          </Link>
          <nav aria-label="Accesos" className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle compact />
            <Link
              className="btn-ghost inline-flex"
              to="/login"
            >
              Entrar
            </Link>
            <Link
              className="btn-primary px-5 py-2.5 text-sm"
              to="/register"
            >
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-1/4 top-0 h-[min(70vh,520px)] w-[150%] opacity-60 md:left-0 md:w-full"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 0%, var(--color-scrim-solar), transparent 65%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/4 translate-y-1/4 rounded-full opacity-50 blur-3xl"
          style={{ background: 'var(--color-scrim-green)' }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 md:pb-28 md:pt-16 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_min(440px,44%)] lg:gap-16">
            <div className="text-left">
              <p className="animate-hero delay-1 text-xs font-semibold uppercase tracking-[0.22em] text-secondary">
                MiTechoRentable · Cliente residencial
              </p>
              <h1 className="animate-hero delay-2 font-display mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-on-surface sm:text-5xl lg:text-[3.5rem]">
                Tu energía solar,{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">clara y honesta</span>
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-0 -z-0 h-3 w-full rounded bg-primary-container/35"
                  />
                </span>
                .
              </h1>
              <p className="animate-hero delay-3 mt-5 max-w-lg text-pretty text-lg leading-relaxed text-on-surface-variant md:text-xl">
                Monitoriza tu instalación, compara lo prometido contra lo real y entiende
                cuánto estás ahorrando —sin portales de fabricante ni gráficas que solo
                entiende un ingeniero.
              </p>

              <div className="animate-hero delay-4 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link className="btn-primary px-7 py-3.5 text-base" to="/login">
                  <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                    login
                  </span>
                  Iniciar sesión
                </Link>
                <Link className="btn-secondary px-7 py-3.5 text-base" to="/register">
                  <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                    person_add
                  </span>
                  Crear cuenta
                </Link>
                <Link className="btn-ghost px-7 py-3.5 text-base" to="/preview/cliente/dashboard">
                  <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
                    visibility
                  </span>
                  Ver demo
                </Link>
              </div>

              <p className="animate-hero delay-5 mt-10 max-w-md text-sm leading-relaxed text-on-surface-variant">
                ¿Primera vez? Usa{' '}
                <strong className="font-semibold text-on-surface">Crear cuenta</strong>.
                Si ya estás registrado, elige{' '}
                <strong className="font-semibold text-on-surface">Iniciar sesión</strong>.
              </p>
            </div>

            <div className="animate-hero delay-3 relative mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none">
              <div className="animate-glow card relative aspect-[4/5] overflow-hidden md:aspect-[5/6] md:rounded-[2rem]">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 20%, var(--color-scrim-solar), transparent 55%), radial-gradient(circle at 80% 70%, var(--color-scrim-green), transparent 50%)',
                  }}
                />
                <div className="absolute inset-0 flex min-h-0 flex-col justify-between gap-4 p-7 md:p-10">
                  <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                    <img
                      src="/MascotaConPanel.png"
                      alt="Dashboard Masconta"
                      className="h-[90%] w-[90%] max-h-full max-w-full object-contain object-center"
                      decoding="async"
                      loading="lazy"
                    />
                  </div>

                  <div className="shrink-0 space-y-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-on-surface-variant">Producción hoy</p>
                        <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight text-on-surface md:text-5xl">
                          18,6
                          <span className="ml-1 text-2xl font-semibold text-on-surface-variant md:text-3xl">
                            kWh
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/70 px-3 py-1 text-xs font-bold text-on-secondary-container">
                          <span aria-hidden className="material-symbols-outlined text-[0.95rem]">
                            trending_up
                          </span>
                          +12%
                        </span>
                        <span className="text-xs uppercase tracking-widest text-on-surface-variant">
                          vs. promesa
                        </span>
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                      <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-secondary to-primary-container" />
                    </div>

                    <p className="text-xs text-on-surface-variant">
                      Datos de ejemplo — conecta tu planta para ver lo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
