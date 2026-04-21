import { Link } from 'react-router-dom'

type NaturalActionCardTone = 'solar' | 'green' | 'info'

type NaturalActionCardProps = {
  icon: string
  title: string
  description: string
  actionLabel: string
  to: string
  tone?: NaturalActionCardTone
}

const TONE_CLASSES: Record<NaturalActionCardTone, string> = {
  solar: 'bg-brand-solar/15 text-brand-solar-deep',
  green: 'bg-brand-green/10 text-brand-green',
  info: 'bg-tertiary-container text-on-tertiary-container',
}

const DEFAULT_TONE_CLASS = 'bg-surface-container text-on-surface'

export function NaturalActionCard({
  icon,
  title,
  description,
  actionLabel,
  to,
  tone,
}: NaturalActionCardProps) {
  const iconToneClass = tone ? TONE_CLASSES[tone] : DEFAULT_TONE_CLASS
  return (
    <article className="card flex h-full flex-col gap-4 p-6">
      <span
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${iconToneClass}`}
      >
        <span aria-hidden className="material-symbols-outlined text-[1.15rem]">
          {icon}
        </span>
      </span>
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight text-on-surface">{title}</h3>
        <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
      </div>
      <Link to={to} className="btn-secondary mt-auto w-fit">
        <span aria-hidden className="material-symbols-outlined text-[1.05rem]">
          arrow_forward
        </span>
        {actionLabel}
      </Link>
    </article>
  )
}
