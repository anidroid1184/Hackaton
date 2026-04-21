import { useEffect, useState } from 'react'

/**
 * Contador entero de 0 → target al montar / cuando cambia target (ease-out cúbico).
 */
export function useAnimatedInteger(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let start: number | null = null
    let raf = 0
    const from = 0

    const step = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
