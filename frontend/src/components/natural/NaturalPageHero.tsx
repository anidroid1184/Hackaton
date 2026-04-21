import type { ReactNode } from 'react'

type NaturalPageHeroProps = {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}

export function NaturalPageHero({
  eyebrow,
  title,
  description,
  actions,
}: NaturalPageHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-outline-ghost bg-gradient-to-br from-surface-container-lowest via-surface-container-lowest to-surface-container-low p-6 shadow-ambient sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[120px]"
        style={{ background: 'var(--color-scrim-solar)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full blur-[100px]"
        style={{ background: 'var(--color-scrim-green)' }}
      />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  )
}
