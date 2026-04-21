/**
 * Datos mock tipados para el perfil residencial (cliente natural).
 * Forma alineada con docs/DATABASE.md + docs/USER_FLOWS.md (perfil 1 — Cliente natural).
 *
 * Sustituir por supabase-js + GET /stats/{client_id} en backend real cuando no uses mock-hub.
 */

import { assetUrl } from './assetUrl'

export type {
  PerformanceSummary,
  PromiseVsReal,
  ResidentialSnapshot,
  SeriesPoint,
} from './residentialGenerators'

export {
  buildNaturalBundle,
  buildPromiseVsReal,
  getDefaultScenario,
  type NaturalBundle,
  type ScenarioParams,
} from './residentialGenerators'

import {
  buildNaturalBundle,
  buildPromiseVsReal,
  buildResidentialSnapshot,
  getDefaultScenario,
  type PerformanceSummary,
  type PromiseVsReal,
  type ResidentialSnapshot,
} from './residentialGenerators'

export function getResidentialSnapshotMock(): ResidentialSnapshot {
  return buildResidentialSnapshot(getDefaultScenario())
}

export function getPromiseVsRealMock(): PromiseVsReal {
  return buildPromiseVsReal(getDefaultScenario())
}

export function getPerformanceSummaryMock(): PerformanceSummary {
  const b = buildNaturalBundle(getDefaultScenario())
  return b.performanceSummary
}

export type ReportItem = {
  id: string
  period: string
  kind: 'simplificado' | 'tecnico'
  status: 'ready' | 'generating'
}

export type SupportTicket = {
  id: string
  subject: string
  status: 'abierto' | 'en-proceso' | 'resuelto'
  updatedAt: string
}

export type SupportSnapshot = {
  channels: Array<{ icon: string; title: string; detail: string; iconSrc?: string }>
  tickets: SupportTicket[]
  faqs: Array<{ q: string; a: string }>
}

export type ProfileSnapshot = {
  name: string
  email: string
  phone: string
  address: string
  plan: string
  installedPowerKw: number
  commissioningDate: string
}

export function getReportsMock(): ReportItem[] {
  return [
    { id: 'rep-2026-04-simple', period: 'Abr 2026', kind: 'simplificado', status: 'ready' },
    { id: 'rep-2026-04-tech', period: 'Abr 2026', kind: 'tecnico', status: 'ready' },
    { id: 'rep-2026-03-simple', period: 'Mar 2026', kind: 'simplificado', status: 'ready' },
    { id: 'rep-2026-03-tech', period: 'Mar 2026', kind: 'tecnico', status: 'generating' },
  ]
}

export function getSupportSnapshotMock(): SupportSnapshot {
  return {
    channels: [
      {
        icon: 'chat',
        title: 'Chat de soporte',
        detail: 'Respuesta estimada: 5 a 10 minutos.',
        iconSrc: assetUrl('/whatsapp.png.png'),
      },
      { icon: 'call', title: 'Línea directa', detail: 'Disponible lunes a sábado de 7:00 a 20:00.' },
      { icon: 'event_available', title: 'Visita técnica', detail: 'Agenda mantenimiento o revisión.' },
    ],
    tickets: [
      {
        id: 'TK-2841',
        subject: 'Revisión preventiva del inversor',
        status: 'en-proceso',
        updatedAt: 'Actualizado hace 2 horas',
      },
      {
        id: 'TK-2812',
        subject: 'Consulta sobre lectura de ahorro mensual',
        status: 'resuelto',
        updatedAt: 'Cerrado ayer',
      },
    ],
    faqs: [
      {
        q: '¿Qué pasa si un día llueve y genero menos energía?',
        a: 'Es normal. El rendimiento se evalúa por periodos amplios y no por un único día.',
      },
      {
        q: '¿Cada cuánto debo pedir mantenimiento?',
        a: 'Recomendamos inspección preventiva cada 6 meses para mantener eficiencia y seguridad.',
      },
      {
        q: '¿Cómo descargo mi reporte para enviarlo al banco?',
        a: 'En la sección Reportes elige "simplificado" y descárgalo en PDF.',
      },
    ],
  }
}

export function getProfileSnapshotMock(): ProfileSnapshot {
  return {
    name: 'Camila Rodríguez',
    email: 'camila@solarpulse.test',
    phone: '+57 312 000 1122',
    address: 'Chapinero, Bogotá',
    plan: 'Residencial Plus',
    installedPowerKw: 4.5,
    commissioningDate: '12 mar 2025',
  }
}
