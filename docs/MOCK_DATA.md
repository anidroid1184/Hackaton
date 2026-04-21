# Datos mock y fixtures

## Regla de trabajo

Se mantiene una sola intención: desacoplar UI y backend con contrato estable mientras se integra proveedor real.

- Contrato objetivo: mismas formas de `docs/API_SPEC.yml` (o delta mínimo documentado).
- Transición esperada: cambiar fuente de datos sin reescribir componentes de presentación.

## Modos P1 (proveedor y simulación)

### Modo proveedor

- **Objetivo:** intentar tiempo real (`Tinku`/proveedor) y, si falla, degradar a fallback con mocks registrados + autogenerados/ampliados.
- **Estado hoy (evidencia en código):**
  - Frontend: `frontend/src/lib/naturalStatsApi.ts` y `frontend/src/lib/roleDashboardApi.ts` ya degradan a datos mock/locales cuando no hay respuesta remota.
  - Backend: existen `DeyeLiveProvider` y `DeyeMockProvider`, pero no se observa selección/fallback live→mock conectada en routers runtime; tratarlo como **gap**.

### Modo simulación

- **Objetivo:** experiencia enfocada en perfiles múltiples (`natural`, `operaciones/operario`, `técnico`, `jurídico-corporativo`) con app independiente y puerto dedicado.
- **Estado hoy (evidencia en código):**
  - Existe `mock-hub` opcional en puerto dedicado (`MOCK_HUB_PORT`, default `4010`) para payload multi-perfil.
  - `uv run manage.py runserver --simulate` orquesta backend+frontend+mock-hub y define `VITE_STATS_BASE_URL` al puerto de simulación.
  - `mock-hub` expone endpoints por perfil (`/operations/*`, `/technician/*`, `/corporate/*`) y no solo `/stats`.
  - Se añadieron endpoints de simulación por proveedor (`/sim/providers`, `/sim/providers/:provider/catalog`, `/sim/providers/:provider/sample/:entity`).
  - Contrato versionado de simulación en `GET /sim/meta` (`contractVersion: 2026-04-18.sim.v1`) y ventana temporal del Time Slider en `GET /sim/time-meta` (mismo contractVersion, paridad con backend).
  - Query params globales soportados en simulación: `provider`, `compareProvider`, `scenario`, `faultMode`, `noise`, `scale`, `phase`, `profile`.
  - **Override server-side (`overrideState`)** para pitch: panel HTML interactivo en `GET http://127.0.0.1:4010/` + API `GET /sim/params`, `POST /sim/params`, `POST /sim/params/reset`. Cuando `enabled=true`, los valores del override **sobrescriben los query params** de todos los requests, así cualquier frontend conectado (cliente, operaciones, corporativo, técnico) recibe data ajustada en vivo sin reload. Detalle en [`../mock-hub/README.md`](../mock-hub/README.md#panel-de-control-override-pitchdemo).
  - `GET /sim/health` publica `seedTick` alineado con el auto-refresh del frontend (5s, `VITE_SIMULATION_AUTO_REFRESH`).

## Frontend + mock-hub (estado actual)

- `frontend/src/lib/residentialGenerators.ts`: fuente de verdad del bundle `natural`.
- `frontend/src/lib/naturalStatsApi.ts`: usa `VITE_STATS_BASE_URL` para `GET /stats/{client_id}`; sin base remota o ante error/payload inválido, genera local.
- `frontend/src/lib/roleDashboardApi.ts`: intenta backend remoto y cae a fallback local para operaciones/corporativo/técnico; propaga contexto de simulación desde URL o almacenamiento persistido.
- `frontend/src/lib/roleDashboardApi.ts`: para corporativo incluye fallback local en comparativas eléctricas (`/corporate/electrical-comparison`) mientras ese endpoint no esté publicado en backend/mock-hub.
- `frontend/src/lib/simulationContext.ts`: estado global de simulación persistido en `localStorage` (`provider`, `compareProvider`, `scenario`, `faultMode`) + broadcast por evento para recarga transversal de vistas.
- `mock-hub/README.md`: servidor opcional para desarrollo con endpoints multi-perfil y muestras por proveedor.
- Panel de escenarios en `/dev/mock-hub` (solo desarrollo), alineado con `docs/ARCHITECTURE.md`.

## Rutas por rol: backend vs simulate

### Backend FastAPI (`backend/routers/mvp.py`)

- Operaciones: `/operations/fleet`, `/operations/plants/{plant_id}`, `/operations/war-room`, `/operations/schedule`, `/operations/technicians`, `/operations/telemetry-overview`.
- Técnico: `/technician/visits`, `/technician/telemetry`, `/technician/preventive-tasks`.
- Cliente corporativo: `/corporate/overview`, `/corporate/roi`, `/corporate/kpis`, `/corporate/tickets`.
- Mantenimiento/analítica operativa: `/maintenance/schedule(.csv)`, `/maintenance/complete`, `/maintenances/{maintenance_id}` (PATCH), `/maintenances/{maintenance_id}/cancel`, `/analytics/faults-by-zone(.csv)`.

### Simulación (`mock-hub`)

- Implementado: `/stats/{client_id}`, `/operations/fleet`, `/operations/plants/{plant_id}`, `/operations/war-room`, `/operations/schedule`, `/operations/technicians`, `/technician/*`, `/corporate/*`, `/analytics/faults-by-zone`, `/sim/providers*`, `/sim/meta`, `/sim/time-meta`, `/sim/health`, `/sim/params` (GET/POST), `/sim/params/reset`, panel HTML interactivo en `/`.
- No implementado en mock-hub (backend-only hoy): `/maintenance/complete`, `/maintenances/{maintenance_id}`, `/maintenances/{maintenance_id}/cancel`, exports CSV dedicados y `/operations/telemetry-overview`.

## Mapeador de magnitudes multi-proveedor

- Adaptadores `provider -> RawReading` en `backend/providers/adapters.py` para Deye/Huawei/Growatt.
- Mapeador extendido en `backend/domain/{magnitudes,inference}.py`:
  - aliases para `active_power`, `day_cap`, `current_power`, `today_energy`, `batteryvoltage`, `batterypower`, `cumulativegridfeedin`, etc.
  - normalización de temperatura con unidad `℃`.
- Cobertura de regresión añadida:
  - `backend/tests/unit/test_provider_adapters.py`
  - `backend/tests/unit/test_magnitude_mapper_multi_provider.py`

## Fixtures multi-proveedor y snapshots reales

### Inventario y fuente de verdad

- Manifest versionado: `backend/tests/fixtures/tinku_endpoints.yaml`.
- Proveedores definidos en manifest: `deye`, `huawei`, `growatt`.
- Snapshots JSON: `backend/tests/fixtures/tinku_snapshots/<provider>/` (gitignored por datos operativos).

### Relación con snapshots reales

- Generación desde middleware real: `cd backend && uv run pytest --tinku`.
- Requiere variables `TINKU_*` del `.env` de raíz.
- Los tests de snapshots materializan respuestas reales cuando hay soporte de proveedor; en casos sin soporte del middleware (ej. endpoints Huawei), el flujo deja stub para mantener el fixture reproducible (ver comentarios en `tinku_endpoints.yaml`).

### Qué entra en fallback mock

- **Registrado:** snapshots en disco (manifest + JSON generados).
- **Autogenerado/ampliado:** payload sintético de `residentialGenerators` y datasets fallback de dashboards por rol.
- Esta mezcla permite continuidad de demo sin bloquear por disponibilidad de proveedor externo.
