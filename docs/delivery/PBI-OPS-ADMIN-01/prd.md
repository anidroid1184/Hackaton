# PRD mini - PBI-OPS-ADMIN-01

## Contexto
Se requiere habilitar la experiencia del rol **Operaciones Techos Rentables** en frontend, separada del flujo de **Tecnico de Campo**, con autenticacion mock temporal para desarrollo.

## Problema
Hoy solo existe el flujo del cliente residencial. No hay acceso ni vistas operativas para supervisar plantas, agenda y alertas criticas del rol Operaciones TR.

## Objetivo
Entregar un flujo funcional de Operaciones TR con:
- login mock por `.env` y `.env.example`,
- redireccion por rol a `/operaciones/dashboard`,
- vistas A1-A5 (Fleet, Detalle planta, Agenda, War Room, Analitica regional),
- base preparada para migrar auth a Supabase sin rehacer rutas ni componentes.

## Alcance
### Incluye
- Frontend React para rutas y vistas del rol Operaciones TR.
- Datos mock tipados alineados a `docs/API_SPEC.yml`.
- Actualizacion documental en `docs/USER_FLOWS.md` y `docs/TASKS.md`.

### No incluye
- Integracion real de endpoints FastAPI pendientes.
- Realtime WebSocket de alertas productivo.
- Implementacion del rol Tecnico de Campo.

## Criterios de aceptacion
1. Con credenciales mock validas, login redirige a `/operaciones/dashboard`.
2. Sin sesion, rutas `/operaciones/*` redirigen a `/login`.
3. Operaciones TR puede navegar entre A1-A5 sin errores.
4. Logout invalida sesion mock y bloquea acceso posterior a rutas protegidas.
5. El flujo actual de cliente residencial no se rompe.
