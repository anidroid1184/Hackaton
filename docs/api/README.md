# APIs de proveedores (índice raíz)

Este directorio centraliza la documentación de integración por proveedor para que el equipo implemente conectores sin mezclar contratos. Las guías describen **cómo leer** cada API y cómo convertir sus respuestas al pipeline agnóstico de magnitudes que termina en `POST /ingest`.

## Proveedores disponibles

| Proveedor | Guía | Qué cubre |
|---|---|---|
| Deye | [`deye/README.md`](./deye/README.md) | Auth por `tk_...`, endpoints `POST` por estación/dispositivo, reglas de ventanas y rate limits. |
| Huawei FusionSolar | [`huawei/README.md`](./huawei/README.md) | Auth vía middleware, endpoints `POST /thirdData/*`, `failCode`, timestamps en ms y quirks de sesión/rate limit. |
| Growatt OpenAPI | [`growatt/README.md`](./growatt/README.md) | Endpoints `GET /v1/*`, `error_code`, particularidades de compresión y límites upstream. |

## Comparativa rápida de envelope de respuesta

| Proveedor | Envelope base | Éxito de negocio | Campo de payload | Patrón de error frecuente |
|---|---|---|---|---|
| Deye | `{ code, msg, success, requestId, ... }` | `success: true` y `code == "1000000"` | Variable por endpoint (normalmente dentro de `result`/objetos específicos) | `HTTP 200` con `success: false` y `code` de negocio. |
| Huawei | `{ success, failCode, message, data, params }` | `success: true` y `failCode == 0` | `data` | `HTTP 200` con `success: false` + `failCode`; algunos errores de validación pueden ser `HTTP 400`. |
| Growatt | `{ error_code, error_msg, data }` | `error_code == 0` | `data` | `HTTP 200` con `error_code != 0` y `error_msg` descriptivo. |

> Nota operativa: los tres proveedores pueden devolver errores de negocio con `HTTP 200`, por lo que el conector debe evaluar primero el envelope y no solo el status HTTP.

## Relación con el pipeline agnóstico de magnitudes (`POST /ingest`)

Estas guías son la fuente para construir adaptadores por proveedor, pero la persistencia no se hace con los payloads crudos. El flujo esperado es:

1. Consumir API del proveedor según su contrato.
2. Extraer y mapear magnitudes (potencia, energía, estado, timestamps) al modelo canónico interno.
3. Enviar lote normalizado a `POST /ingest` para normalización final y persistencia.

La regla práctica es: **la especificidad vive en el adaptador del proveedor; el almacenamiento vive en el contrato agnóstico de ingestión**.

Implementación actual en backend:

- Adaptadores de contrato proveedor a `RawReading`:
  - `backend/providers/adapters.py` (`adapt_deye_device_latest`, `adapt_huawei_device_kpi`, `adapt_growatt_plant_data`)
- Inferencia/mapeo canónico:
  - `backend/domain/magnitudes.py`
  - `backend/domain/inference.py`
- Cobertura de contrato y mapeo multi-proveedor:
  - `backend/tests/unit/test_provider_adapters.py`
  - `backend/tests/unit/test_magnitude_mapper_multi_provider.py`

## Piezas distintas: proveedor real vs simulación

- **Modo proveedor (real):** usa `docs/api/deye`, `docs/api/huawei` y `docs/api/growatt` para integrar con fuentes externas reales.
- **Modo simulación (mock-hub):** usa [`../../mock-hub/README.md`](../../mock-hub/README.md) para generar datos sintéticos locales sin depender del proveedor ni de FastAPI productivo.

En modo simulación se mantienen envelopes y timestamps característicos por proveedor a través de:

- `GET /sim/providers`
- `GET /sim/providers/:provider/catalog`
- `GET /sim/providers/:provider/sample/:entity`

Ambos modos son complementarios: simulación para desarrollo/pruebas rápidas y proveedor real para validación end-to-end de integración.

## Rutas MVP por rol (Onda 5/6)

Además de la capa de proveedores, el backend expone rutas user-facing para tableros y operación:

- Operaciones: `/operations/fleet`, `/operations/plants/{plant_id}`, `/operations/war-room`, `/operations/schedule`, `/operations/technicians`, `/operations/telemetry-overview`.
- Técnico: `/technician/visits`, `/technician/telemetry`, `/technician/preventive-tasks`.
- Cliente corporativo: `/corporate/overview`, `/corporate/roi`, `/corporate/kpis`, `/corporate/tickets`.
- Agenda/ejecución de mantenimiento: `GET /maintenance/schedule`, `GET /maintenance/schedule.csv`, `POST /maintenance/complete`, `PATCH /maintenances/{maintenance_id}`, `POST /maintenances/{maintenance_id}/cancel`.
- Analítica operacional: `GET /analytics/faults-by-zone`, `GET /analytics/faults-by-zone.csv` (o `?format=csv`).

Estas rutas viven en `backend/routers/mvp.py` y usan JWT Supabase (`Authorization: Bearer <access_token>`) con restricciones por rol.

## Simulate contract (mock-hub)

En modo `uv run manage.py runserver --simulate`, `mock-hub` atiende rutas de datos multi-perfil y proveedor:

- Perfiles: `/stats/{client_id}`, `/operations/*`, `/technician/*`, `/corporate/*`, `/analytics/faults-by-zone`.
- Simulación proveedor: `/sim/providers`, `/sim/providers/:provider/catalog`, `/sim/providers/:provider/sample/:entity`, `/sim/meta`.
- Time Slider transversal: `/sim/time-meta` (ventana disponible + presets; misma forma que el backend FastAPI).
- Auto-refresh: `/sim/health` (con `seedTick` alineado a 5s, default de `VITE_SIMULATION_AUTO_REFRESH`).
- Control en vivo para pitch: panel HTML en `GET /` y API `GET /sim/params`, `POST /sim/params`, `POST /sim/params/reset`. Cuando el `overrideState` está activo, sobrescribe los query params (`provider`, `scenario`, `faultMode`, `noise`, `scale`, `phase`, `profile`) en cualquier request entrante. Detalle en [`../../mock-hub/README.md`](../../mock-hub/README.md#panel-de-control-override-pitchdemo).

`/sim/meta` publica `contractVersion` para control de cambios de contrato (actual: `2026-04-18.sim.v1`). `/sim/time-meta` reutiliza esa misma versión.

## Reportes PDF backend (Lote 5)

La generación de reportes cliente/corporativo en PDF/TEX vive en FastAPI:

- Endpoint: `GET /reports/generate`
- Documentación técnica: [`../REPORTS_PDF.md`](../REPORTS_PDF.md)
