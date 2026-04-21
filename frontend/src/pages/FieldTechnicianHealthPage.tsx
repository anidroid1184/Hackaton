import { useEffect, useState } from 'react'
import { OperationsPageHero } from '../components/operations/OperationsPageHero'
import { assetUrl } from '../lib/assetUrl'
import {
  fetchTechnicianPreventiveTasksData,
  getTechnicianCoreFallback,
} from '../lib/roleDashboardApi'

export function FieldTechnicianHealthPage() {
  const cards = [
    { title: 'Arco electrico', value: '2 eventos', tone: 'critical' },
    { title: 'Degradacion', value: '1.7% anual', tone: 'warn' },
    { title: 'Fatiga breaker', value: 'Medio', tone: 'warn' },
    { title: 'Temp inversor', value: '57 C', tone: 'ok' },
  ] as const
  const [tasks, setTasks] = useState(() => getTechnicianCoreFallback().preventiveTasks)

  useEffect(() => {
    let mounted = true
    void fetchTechnicianPreventiveTasksData().then((nextTasks) => {
      if (!mounted) return
      setTasks(nextTasks)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-enter">
      <OperationsPageHero
        eyebrow="Tecnico de Campo"
        title="Salud preventiva"
        mascotSrc={assetUrl('/MascotaConPanel.png')}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.title} className="card p-5">
            <p className="text-xs text-on-surface-variant">{card.title}</p>
            <p className="mt-2 font-display text-2xl font-bold text-on-surface">{card.value}</p>
            <span className={toneClass(card.tone)}>{toneLabel(card.tone)}</span>
          </article>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-xl font-bold text-on-surface">Checklist preventiva</h2>
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-xl bg-surface-container-low p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-on-surface">{task.title}</h3>
                <span
                  className={[
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    task.state === 'realizada'
                      ? 'bg-secondary-container/70 text-on-secondary-container'
                      : task.critical
                        ? 'bg-error-container/70 text-on-error-container'
                        : 'bg-primary-container/70 text-on-primary-container',
                  ].join(' ')}
                >
                  {task.state === 'realizada' ? 'REALIZADA' : 'PENDIENTE'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function toneClass(tone: 'ok' | 'warn' | 'critical') {
  if (tone === 'ok') return 'mt-3 inline-flex rounded-full bg-secondary-container/70 px-3 py-1 text-xs font-semibold text-on-secondary-container'
  if (tone === 'warn') return 'mt-3 inline-flex rounded-full bg-primary-container/70 px-3 py-1 text-xs font-semibold text-on-primary-container'
  return 'mt-3 inline-flex rounded-full bg-error-container/70 px-3 py-1 text-xs font-semibold text-on-error-container'
}

function toneLabel(tone: 'ok' | 'warn' | 'critical'): string {
  if (tone === 'ok') return 'Normal'
  if (tone === 'warn') return 'Atención'
  return 'Crítico'
}
