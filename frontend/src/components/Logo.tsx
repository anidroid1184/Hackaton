type LogoProps = {
  size?: 'sm' | 'md' | 'lg'
  withWordmark?: boolean
  className?: string
}

const sizeMap = {
  sm: { img: 'h-8', font: 'text-sm' },
  md: { img: 'h-10', font: 'text-base' },
  lg: { img: 'h-12', font: 'text-lg' },
} as const

/**
 * Marca global: logo Techos Rentables (PNG) + wordmark MiTechoRentable.
 */
export function Logo({ size = 'md', withWordmark = true, className = '' }: LogoProps) {
  const s = sizeMap[size]
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src="/LogoTechosRentables.png"
        alt="Logo MiTechoRentable"
        className={`${s.img} w-auto object-contain`}
        decoding="async"
      />
      {withWordmark ? (
        <span
          className={`font-display font-extrabold tracking-tight text-on-surface ${s.font}`}
        >
          MiTechoRentable
        </span>
      ) : null}
    </span>
  )
}
