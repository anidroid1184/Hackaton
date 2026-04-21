import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AuthHeroPanel } from './AuthHeroPanel'
import { ThemeToggle } from '../theme/ThemeToggle'
import { Logo } from './Logo'

type AuthLayoutProps = {
  children: ReactNode
}

/**
 * Shell de autenticación: split-screen, mismos tokens que landing y dashboard.
 * Light/dark se controla por ThemeProvider global (no hardcoded).
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="animate-enter relative flex min-h-svh w-full flex-col bg-surface text-on-surface lg:flex-row">
      {/* Topbar mínima en mobile, con logo + link a landing + toggle */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 lg:hidden">
        <Link
          to="/"
          aria-label="Ir a la página principal"
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
        >
          <Logo size="sm" />
        </Link>
        <ThemeToggle compact />
      </div>

      {/* Panel izquierdo (solo lg+) */}
      <div className="relative z-10 hidden min-h-svh lg:block lg:w-1/2">
        <AuthHeroPanel />
      </div>

      {/* Panel derecho — formulario */}
      <section className="relative z-10 flex w-full flex-1 flex-col justify-center bg-surface px-5 py-10 sm:px-10 sm:py-14 lg:w-1/2 lg:px-16 xl:px-24">
        {/* Controles top-right en lg */}
        <div className="pointer-events-auto absolute right-6 top-6 hidden items-center gap-2 lg:flex">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-outline-ghost bg-surface-container-lowest px-3 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          >
            <span aria-hidden className="material-symbols-outlined text-[1rem]">
              arrow_back
            </span>
            Volver
          </Link>
          <ThemeToggle compact />
        </div>

        <div className="animate-hero delay-1 mx-auto w-full max-w-md">{children}</div>

        <p className="pointer-events-none mt-10 text-center text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant sm:absolute sm:bottom-6 sm:left-0 sm:right-0 sm:mt-0">
          MiTechoRentable · energía clara
        </p>
      </section>
    </div>
  )
}
