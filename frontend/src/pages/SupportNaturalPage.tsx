import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { NaturalPageHero } from '../components/natural/NaturalPageHero'
import { getSupportSnapshotMock } from '../lib/residentialMock'
import { buildSupportWhatsappLink } from '../lib/supportContact'

export function SupportNaturalPage() {
  const { user } = useAuth()
  const support = useMemo(() => getSupportSnapshotMock(), [])
  const whatsappLink = useMemo(
    () =>
      buildSupportWhatsappLink(
        `Hola, soy ${user?.displayName ?? 'cliente'} y necesito soporte para mi sistema solar.`,
      ),
    [user?.displayName],
  )
  const [pqrsType, setPqrsType] = useState('peticion')
  const [pqrsMessage, setPqrsMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function onPqrsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pqrsMessage.trim()) return
    setSubmitted(true)
    setPqrsMessage('')
    window.setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 animate-enter">
      <NaturalPageHero
        eyebrow="Cliente residencial · Soporte"
        title="Centro de ayuda"
        description="Gestiona tus solicitudes, agenda visitas técnicas y resuelve dudas frecuentes desde una sola vista."
      />

      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            Soporte inmediato
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-on-surface">
            Canal directo por WhatsApp
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Chatea con soporte para resolver bloqueos rápidos sin abrir ticket.
          </p>
        </div>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="btn-primary w-fit"
          aria-label="Abrir soporte por WhatsApp"
        >
          <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
            forum
          </span>
          Abrir WhatsApp
        </a>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {support.channels.map((channel) => (
          <article key={channel.title} className="card flex flex-col gap-3 p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
              {channel.iconSrc ? (
                <img
                  src={channel.iconSrc}
                  alt=""
                  className="h-6 w-6 object-contain"
                  decoding="async"
                />
              ) : (
                <span aria-hidden className="material-symbols-outlined text-[1.1rem]">
                  {channel.icon}
                </span>
              )}
            </span>
            <h2 className="font-display text-lg font-bold text-on-surface">{channel.title}</h2>
            <p className="text-sm text-on-surface-variant">{channel.detail}</p>
            <button
              type="button"
              className="btn-secondary mt-auto w-fit"
              onClick={() =>
                document.getElementById('pqrs-form')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Abrir
            </button>
          </article>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="font-display text-xl font-bold text-on-surface">Guía rápida por rol</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Elige tu rol para ver el camino recomendado dentro de la plataforma.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {ROLE_SUPPORT_GUIDES.map((guide) => {
            const isCurrentRole = guide.role === (user?.role ?? 'cliente')
            return (
              <article
                key={guide.role}
                className={[
                  'rounded-xl border p-4',
                  isCurrentRole
                    ? 'border-secondary bg-secondary-container/40'
                    : 'border-outline-ghost bg-surface-container-lowest',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-on-surface">{guide.title}</h3>
                  {isCurrentRole ? (
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold uppercase tracking-wide text-on-secondary">
                      Tu rol
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">{guide.summary}</p>
                <p className="mt-2 text-xs text-on-surface-variant">{guide.steps}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="card overflow-hidden">
          <header className="border-b border-outline-ghost px-6 py-4">
            <h2 className="font-display text-xl font-bold text-on-surface">Tus tickets</h2>
          </header>
          <div className="divide-y divide-outline-ghost">
            {support.tickets.map((ticket) => (
              <article key={ticket.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-on-surface">{ticket.subject}</p>
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {ticket.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {ticket.id} · {ticket.updatedAt}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold text-on-surface">Preguntas frecuentes</h2>
            <div className="mt-4 space-y-3">
              {support.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="rounded-xl border border-outline-ghost bg-surface-container-lowest p-4"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-on-surface">{faq.q}</summary>
                  <p className="mt-2 text-sm text-on-surface-variant">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>

          <form id="pqrs-form" className="card flex flex-col gap-4 p-6" onSubmit={onPqrsSubmit}>
            <h2 className="font-display text-xl font-bold text-on-surface">Radicar PQRS</h2>
            <label className="text-sm text-on-surface-variant">
              Tipo
              <select
                className="input mt-1"
                value={pqrsType}
                onChange={(event) => setPqrsType(event.target.value)}
              >
                <option value="peticion">Petición</option>
                <option value="queja">Queja</option>
                <option value="reclamo">Reclamo</option>
                <option value="sugerencia">Sugerencia</option>
              </select>
            </label>
            <label className="text-sm text-on-surface-variant">
              Mensaje
              <textarea
                className="input mt-1 min-h-28"
                value={pqrsMessage}
                onChange={(event) => setPqrsMessage(event.target.value)}
                placeholder="Describe el caso y la planta asociada."
              />
            </label>
            <button type="submit" className="btn-primary w-fit">
              Enviar PQRS
            </button>
            {submitted ? (
              <p className="rounded-xl bg-secondary-container/70 px-3 py-2 text-sm text-on-secondary-container">
                PQRS registrada en bandeja de soporte. SLA inicial: 24 horas hábiles.
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  )
}

const ROLE_SUPPORT_GUIDES = [
  {
    role: 'cliente',
    title: 'Cliente residencial',
    summary: 'Monitorea ahorro, revisa reportes y abre PQRS desde este módulo.',
    steps: '1) Dashboard  2) Reportes PDF  3) Soporte/PQRS',
  },
  {
    role: 'operaciones',
    title: 'Operaciones',
    summary: 'Prioriza alertas de plantas, asigna técnico y haz seguimiento de SLA.',
    steps: '1) Alertas  2) Plantas  3) Coordinación de visitas',
  },
  {
    role: 'tecnico',
    title: 'Técnico de campo',
    summary: 'Consulta ruta diaria, bitácora de tareas y cierre técnico por visita.',
    steps: '1) Ruta  2) Checklist  3) Cierre y evidencia',
  },
  {
    role: 'corporativo',
    title: 'Corporativo',
    summary: 'Audita rendimiento agregado y descarga reportes ejecutivos por sitio.',
    steps: '1) KPI globales  2) Comparativos  3) Exportables',
  },
] as const
