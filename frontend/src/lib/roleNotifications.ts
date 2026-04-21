import type { AppRole } from '../auth/mockOperationsAuth'

export type RoleNotification = {
  id: string
  title: string
  detail: string
  ts: string
  read: boolean
}

export function buildNotificationsByRole(role: AppRole): RoleNotification[] {
  if (role === 'operaciones') {
    return [
      {
        id: 'n-ops-1',
        title: 'Alerta critica en Zona Norte',
        detail: 'Arco electrico detectado. Requiere asignacion inmediata.',
        ts: '2026-04-18T09:20:00Z',
        read: false,
      },
      {
        id: 'n-ops-2',
        title: 'Agenda reprogramada',
        detail: 'La visita de Parque Solar Sur se movio a las 14:00.',
        ts: '2026-04-18T08:10:00Z',
        read: false,
      },
    ]
  }

  if (role === 'corporativo') {
    return [
      {
        id: 'n-corp-1',
        title: 'KPI fuera de umbral',
        detail: 'Factor de potencia bajo 0.9 en Planta Centro.',
        ts: '2026-04-18T10:00:00Z',
        read: false,
      },
      {
        id: 'n-corp-2',
        title: 'Ticket en progreso',
        detail: 'Soporte tecnico acepto el caso tk-9001.',
        ts: '2026-04-18T07:40:00Z',
        read: true,
      },
    ]
  }

  if (role === 'tecnico') {
    return [
      {
        id: 'n-tech-1',
        title: 'Nueva visita asignada',
        detail: 'Parque Solar Sur, ventana 11:30 - 13:00.',
        ts: '2026-04-18T06:50:00Z',
        read: false,
      },
      {
        id: 'n-tech-2',
        title: 'Sincronizacion pendiente',
        detail: 'Hay 3 lecturas en buffer offline por enviar.',
        ts: '2026-04-18T06:30:00Z',
        read: false,
      },
    ]
  }

  return [
    {
      id: 'n-client-1',
      title: 'Reporte mensual listo',
      detail: 'Puedes descargar el consolidado de abril.',
      ts: '2026-04-18T08:00:00Z',
      read: false,
    },
    {
      id: 'n-client-2',
      title: 'PQRS en seguimiento',
      detail: 'Soporte actualizó tu caso TK-2841. Revisa la bandeja de soporte.',
      ts: '2026-04-18T11:10:00Z',
      read: false,
    },
  ]
}
