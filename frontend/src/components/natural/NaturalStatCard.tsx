type NaturalStatCardProps = {
  icon: string
  label: string
  value: string
  hint?: string
  tone?: 'solar' | 'green' | 'neutral'
}

export function NaturalStatCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: NaturalStatCardProps) {
  const toneClass =
    tone === 'solar'
      ? 'bg-primary-container/15 text-primary-container'
      : tone === 'green'
        ? 'bg-secondary-container/55 text-on-secondary-container'
        : 'bg-surface-container text-on-surface-variant'

  return (
    <article className="card flex flex-col gap-3 p-5">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${toneClass}`}>
        <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
          {icon}
        </span>
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </p>
      <p className="font-display text-2xl font-extrabold tracking-tight text-on-surface">{value}</p>
      {hint ? <p className="text-xs text-on-surface-variant">{hint}</p> : null}
    </article>
  )
}
