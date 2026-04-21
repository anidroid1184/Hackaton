# mock-hub

Mini-servidor HTTP de simulación para MiTechoRentable. Ejecuta en un solo puerto y entrega datos para
`natural`, `operaciones`, `corporativo` y `tecnico`, además de muestras por proveedor (`deye`,
`huawei`, `growatt`) alineadas con `docs/api/*`.

> Alcance Onda 2: `mock-hub` solo simula datos (`/stats` y endpoints de perfil). No genera PDF ni resuelve `/reports/generate`; los reportes salen por backend.

## Requisitos

- Node 20+
- `pnpm`

## Uso

```bash
pnpm install
MOCK_HUB_PORT=4010 pnpm run mock-hub
```

Variables:

| Variable        | Default | Descripción        |
|----------------|---------|--------------------|
| `MOCK_HUB_PORT` | `4010`  | Puerto de escucha |

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Panel HTML interactivo con sliders y selects para manipular el `overrideState` en vivo. Pensado para pitch/demo. |
| GET | `/health` | Estado del servicio |
| GET | `/sim/health` | Señal liviana con `seedTick` alineado al intervalo de auto-refresh del frontend (5s) |
| GET | `/stats/:client_id` | KPIs mock del perfil natural + `raw_alias_demo` con envelope por proveedor |
| GET | `/operations/fleet` | Plantas para consola Operaciones |
| GET | `/operations/war-room` | Alertas priorizadas |
| GET | `/operations/schedule` | Agenda de mantenimientos |
| GET | `/analytics/faults-by-zone` | Serie de fallas agregadas por zona |
| GET | `/operations/technicians` | Técnicos sugeridos/asignados |
| GET | `/technician/visits` | Ruta/visitas del técnico |
| GET | `/technician/telemetry` | Variables en vivo para técnico |
| GET | `/technician/preventive-tasks` | Checklist preventivo |
| GET | `/corporate/overview` | KPIs corporativos agregados |
| GET | `/corporate/roi` | Serie ROI corporativo |
| GET | `/corporate/kpis` | Tabla KPI corporativa |
| GET | `/corporate/tickets` | Tickets corporativos |
| GET | `/sim/providers` | Catálogo de proveedores soportados |
| GET | `/sim/meta` | Metadata de contrato y versión de simulación |
| GET | `/sim/time-meta` | Ventana temporal (`earliest`/`latest`/`now`) y presets para el Time Slider (paridad con backend) |
| GET | `/sim/params` | Estado actual del override server-side (`{ enabled, params, effective }`) |
| POST | `/sim/params` | Actualiza el override global (`{ enabled?: boolean, params?: Partial<SimulationParams> }`) |
| POST | `/sim/params/reset` | Limpia el `overrideState` y vuelve a respetar los query params de cada request |
| GET | `/sim/providers/:provider/catalog` | Catálogo de entidades/rutas del proveedor |
| GET | `/sim/providers/:provider/sample/:entity` | Muestra sintética por entidad del proveedor |

### Query parameters de simulación

| Parámetro | Rango | Efecto |
|-----------|-------|--------|
| `noise` | 0–1 | Ruido en la serie «real» |
| `scale` | 0.3–3 | Escala de amplitud y kWh |
| `phase` | 0–1 | Desfase de la campana diaria |
| `profile` | `canonical` \| `pac` \| `active_power` \| `p_total` | Alias de magnitud para `raw_alias_demo` |
| `provider` | `deye` \| `huawei` \| `growatt` | Activa envelope y muestras del proveedor |
| `compareProvider` | `deye` \| `huawei` \| `growatt` | Sistema secundario para comparativas A/B en UI |
| `scenario` | string (`baseline`, `stress`, `recovery`, `night`, ...) | Contexto narrativo de simulación |
| `faultMode` | `none` \| `degraded` \| `offline` \| `spikes` | Modifica severidad/estados y alertas |

Ejemplo:

```http
GET /stats/00000000-0000-4000-8000-000000000001?provider=huawei&scenario=stress&faultMode=degraded&noise=0.35&scale=1.2&profile=pac
```

Ejemplo proveedor:

```http
GET /sim/providers/deye/sample/device-kpi?scenario=stress&faultMode=offline
```

### Contrato versionado

`GET /sim/meta` retorna `contractVersion` y la lista de query params soportados para evitar breaking changes involuntarios.

```http
GET /sim/meta?provider=huawei&compareProvider=growatt&scenario=stress&faultMode=offline
```

## Panel de control override (pitch/demo)

El mock-hub expone un panel HTML en `http://127.0.0.1:4010/` pensado para manipular la data en vivo durante el pitch, sin necesidad de abrir el frontend. Desde ahí se activa `overrideState`: cuando está habilitado, los valores del panel **sobrescriben los query params** de cada request entrante, así cualquier frontend conectado (cliente, operaciones, corporativo, técnico) ve los cambios sin reload.

Flujo equivalente por API:

```bash
# estado actual (enabled + params + effective)
curl http://127.0.0.1:4010/sim/params

# activar override con escenario stress y falla degradada
curl -X POST http://127.0.0.1:4010/sim/params \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true,"params":{"scenario":"stress","faultMode":"degraded","noise":0.3}}'

# limpiar override y volver al comportamiento por query params
curl -X POST http://127.0.0.1:4010/sim/params/reset
```

Consejo de pitch: usar Chrome en modo incógnito para evitar cache del panel HTML.

## Integración con el frontend

1. En la raíz del repo, añade a `.env`:

   `VITE_STATS_BASE_URL=http://127.0.0.1:4010`

2. Arranca Vite (`frontend`) y este servidor en paralelo.

3. (Opcional) En desarrollo, abre `/dev/mock-hub` en la app para ajustar parámetros con sliders desde el frontend (sessionStorage local por pestaña). Para efecto global y cross-frontend, usar el panel `http://127.0.0.1:4010/`.

Los generadores base viven en `frontend/src/lib/residentialGenerators.ts`; este paquete los combina con
datasets de `fieldAndCorporateMockData` y `operationsMockData` para mantener una sola fuente de verdad.

## Pruebas

```bash
pnpm test
```

Valida rutas clave multi-perfil y compatibilidad de `/stats/:client_id`.

## Estado multi-perfil

| Objetivo funcional | Estado | Notas |
|---|---|---|
| Simular perfil natural (`/stats`) | Implementado | Incluye envelope por proveedor en `raw_alias_demo.provider_envelope`. |
| Simular perfiles operaciones/corporativo/técnico | Implementado | Endpoints `GET /operations/*`, `/technician/*`, `/corporate/*`. |
| Simular contratos por proveedor (`deye/huawei/growatt`) | Implementado | Endpoints `/sim/providers/*` con timestamps/envelopes realistas. |
