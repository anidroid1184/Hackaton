import type { ReactNode } from 'react'
import { assetUrl } from '../../lib/assetUrl'

type Props = {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  /** Variante visual (p. ej. técnico de campo con panel). Por defecto `/mascota.png`. */
  mascotSrc?: string
}

/**
 * Cabecera tipo card: texto a la izquierda, mascota a la derecha.
 * Uso habitual: operaciones; también perfil u otras secciones que compartan el mismo patrón.
 */
export function OperationsPageHero({
  eyebrow,
  title,
  description,
  mascotSrc = assetUrl('/mascota.png'),
}: Props) {
  return (
    <header className="card overflow-hidden p-6 sm:p-8">
      <div className="flex flex-row items-center justify-between gap-4 sm:gap-8">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-on-surface">
            {title}
          </h1>
          {description !== undefined && description !== null ? (
            <div className="mt-2 max-w-3xl text-sm text-on-surface-variant">{description}</div>
          ) : null}
        </div>
        <img
          src={mascotSrc}
          alt=""
          width={160}
          height={160}
          aria-hidden
          className="h-20 w-auto shrink-0 object-contain object-bottom sm:h-28 md:h-32"
        />
      </div>
    </header>
  )
}
