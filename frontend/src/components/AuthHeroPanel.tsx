import { Logo } from './Logo'

/**
 * Hero visual del auth split-screen. Usa los mismos tokens de marca que la landing y el dashboard
 * (primary-container ámbar + secondary verde) para que el login se sienta como la misma app.
 *
 * No carga imágenes remotas (evita CLS / dependencia de red).
 */
export function AuthHeroPanel() {
  return (
    <section
      aria-label="MiTechoRentable — bienvenida"
      className="relative flex h-full min-h-svh w-full flex-col justify-between overflow-hidden bg-surface-container-lowest p-10 xl:p-14"
    >
      {/* Glows cálidos (no bloquean interacción) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full blur-[130px]"
        style={{ background: 'var(--color-scrim-solar)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-10 h-[420px] w-[420px] rounded-full blur-[140px]"
        style={{ background: 'var(--color-scrim-green)' }}
      />

      <div className="relative z-10">
        <Logo size="lg" />
      </div>

      <div className="relative z-10 max-w-lg">
        {/* Preview card: misma narrativa que el dashboard real */}
        <div className="card animate-hero delay-1 relative overflow-hidden bg-surface-container-low/85 p-6 backdrop-blur-md md:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary-container/20 blur-3xl"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
            Hoy en tu techo
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            18,6{' '}
            <span className="text-xl font-semibold text-on-surface-variant md:text-2xl">kWh</span>
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            112% de la promesa contractual. Un día por encima del contrato.
          </p>

          <div className="mt-6 h-28 w-full">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              role="img"
              aria-label="Miniatura Promesa vs Real"
            >
              <defs>
                <linearGradient id="auth-preview" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary-container)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-primary-container)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,40 Q15,25 30,32 T60,20 T100,12 L100,60 L0,60 Z"
                fill="url(#auth-preview)"
              />
              <path
                d="M0,45 Q15,42 30,36 T60,30 T100,22"
                fill="none"
                stroke="var(--color-brand-solar)"
                strokeWidth="1"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <path
                d="M0,40 Q15,25 30,32 T60,20 T100,12"
                fill="none"
                stroke="var(--color-secondary)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="animate-hero delay-3 mt-10 space-y-4">
          <h2 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-on-surface md:text-4xl xl:text-5xl">
            Tu energía,{' '}
            <span className="text-primary-container">clara y honesta.</span>
          </h2>
          <p className="max-w-md text-base leading-relaxed text-on-surface-variant">
            Comparamos cada kWh que genera tu techo contra el contrato. Sin portales de
            fabricante, sin datos que no entiendes.
          </p>
        </div>
      </div>

      <p className="relative z-10 text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
        MiTechoRentable · energía clara
      </p>
    </section>
  )
}
