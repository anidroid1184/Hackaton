# Arquitectura — MiTechoRentable

## Patrón

**Monolito modular Supabase-first.** Supabase es el **único** sistema de identidad y autorización de negocio: **Auth (GoTrue), JWT, refresh, RLS, Realtime** sobre Postgres. **FastAPI no compite con Supabase**: es un **servicio HTTP aislado** que solo **sirve respuestas calculadas** y **persistencia operativa** usando credenciales de servidor; valida JWT de Supabase donde haga falta, **sin reimplementar login**.

> Principio: si Supabase lo resuelve con tabla + vista + RPC + RLS + cliente JS, **no pasa por FastAPI**.

Referencias de entorno y mocks: `docs/ENVIRONMENT.md` (matriz de variables y modos) y `docs/MOCK_DATA.md` (flujo de simulacion/mocks).

## Contrato entre Supabase y FastAPI

| Tema | Dónde vive | Notas |
|------|------------|--------|
| Login / registro / refresh / MFA | **Supabase Auth** | React usa `@supabase/supabase-js` **≥ 2.70** (sesión + `getSession()` + JWT `access_token`). |
| Forma del JWT | **Supabase** (`iss`, `sub`, `role`, `exp`, `aud`) | FastAPI valida firma con el **JWT secret** del proyecto (Settings → API) o flujo documentado en Supabase; mismo emisor que el JS client. |
| RLS / quién ve qué fila | **Postgres + Supabase** | Por defecto el **frontend** lee con `anon` + JWT; FastAPI usa **`service_role` solo en servidor** para escrituras/cálculos que lo requieran, nunca en el browser. |
| FastAPI | **Proceso aparte** | No sustituye a PostgREST; expone rutas de **ingesta enriquecida**, **KPIs**, **PDF**, **WS** si hace falta lógica que no conviene en SQL/RPC. |

**Regla mental:** Supabase = plataforma de datos + identidad. FastAPI = calculadora + borde de ingesta con **clave de máquina** (ver `docs/API_SPEC.yml`).

## Flujo end-to-end

```
Inversores/medidores (Growatt, Huawei, …)
        ▼
[ Middleware Tinku ]  — polling/APIs proveedor, reintentos, API key equipo
        │  (payload crudo, nombres heterogéneos)
        ▼
[ FastAPI — servicio aislado ]
   • POST /ingest     → Inferencia de Magnitud → escribe en Supabase (`readings`)
     autenticación: **clave ingesta máquina** (no JWT usuario)
   • GET /stats/…     → KPIs derivados; auth: **Bearer = access_token Supabase**
   • GET /reports/…   → PDF; idem JWT
   • GET/WS /alerts   → alertas enriquecidas; idem JWT
   • GET /analytics/faults-by-zone → barras por sector (Operaciones TR)
   • GET /maintenance/schedule, POST /maintenance/complete → agenda y cierre (TR / técnico)
        │  (service_role solo server-side para escribir/leer sin duplicar RLS del browser)
        ▼
[ Supabase — verdad histórica ]
   Postgres · Auth · RLS · Realtime
        ▲
        │  supabase-js (JWT en cada request PostgREST)
        ▼
[ React + Vite + TS + Tailwind ]
   Listados, Time Slider, War Room (lectura directa cuando basta)
```

## Mapa producto ↔ stack

Narrativa completa (problema, valor, módulos A/B/C): [`context.md`](../context.md) en la raíz del repo.

| Módulo (producto) | Stack / responsabilidad |
|-------------------|-------------------------|
| **A — Intelligence Core** | **FastAPI:** ingesta (`POST /ingest`), inferencia de magnitud, KPIs, PDF, alertas HTTP/WS según `docs/API_SPEC.yml`. **Supabase** (`service_role` solo servidor): persistencia `readings`, alertas, cálculos que no convengan en el browser. **Jobs** (cron, GitHub Actions, workers): polling al middleware Tinku y/o SLA-Guardian cuando existan en el despliegue. |
| **B — Mission Control** | **React** (Vite, TS, Tailwind): SPA ejecutiva — War Room, cliente corporativo/residencial, informes PDF on-demand; **Supabase JS** + JWT para lecturas RLS y sesión. |
| **C — Field Ops** | **React** orientado a móvil (**PWA** cuando se configure): vistas técnico en sitio; mismas reglas de auth y datos que arriba. |

## Obtención de datos (fuera del browser)

1. **Techos / Tribu middleware** (`techos.thetribu.dev`, ver `docs/resources/technical_guide.md`): el equipo obtiene series por proveedor con **API key de hackathon**. Registro de endpoints y alineación con pytest: **`docs/TINKU_MIDDLEWARE_API.yml`** y manifest `backend/tests/fixtures/tinku_endpoints.yaml`.
2. **Normalización mínima en Tinku** (o script): empaqueta lecturas en `IngestBatch` y **POST** a `POST /ingest` con header de servicio (ver OpenAPI).
3. **FastAPI** aplica inferencia de magnitud y persiste en `readings` / dispara alertas.
4. **Opcional:** jobs programados (cron/GitHub Actions) que llaman al middleware y reenvían a `/ingest` — mismo contrato.

Detalle de headers, esquemas de seguridad y rutas: **`docs/API_SPEC.yml`** (`info.description` + `components.securitySchemes`).

## Mock hub (desarrollo)

Proceso HTTP **opcional** en `mock-hub/`, puerto por defecto **4010** (`MOCK_HUB_PORT`). Sirve:

- `GET /stats/{client_id}` con objeto `natural` y `raw_alias_demo`.
- Endpoints por perfil para consola `operaciones`, `corporativo` y `tecnico`.
- Endpoints de simulación por proveedor (`deye`, `huawei`, `growatt`) para validar envelopes/timestamps y mapping.

- **Arranque:** `pnpm --dir mock-hub install` y `pnpm --dir mock-hub run mock-hub`.
- **Frontend:** definir `VITE_STATS_BASE_URL=http://127.0.0.1:4010` en `.env` (raíz del repo; Vite usa `envDir` en `frontend/vite.config.ts`). Sin esa variable, la UI usa generación local en el navegador.
- **Panel de escenarios (solo dev):** ruta `/dev/mock-hub` — sliders que persisten en `sessionStorage` y disparan recarga de datos vía evento interno.
- **Parámetros de escenario soportados:** `provider`, `scenario`, `faultMode`, `noise`, `scale`, `phase`.

Detalle: [`mock-hub/README.md`](../mock-hub/README.md).

## FastAPI — qué sí y qué no

**Sí:** validar JWT de Supabase en rutas user-facing; cálculo degradación, KPIs, PDF; WS; ingesta con API key de máquina.

**No:** endpoints de login/signup; duplicar políticas RLS en Python; exponer `service_role` al cliente; confiar en JWT sin validar `iss`/`aud`/`exp`.

**Capas internas (cuando el código crezca):** Routers → Domain → cliente Supabase (service_role) / SQL. Sin “auth propia”.

### Estado implementado (sprint 1/2/3 — `/ingest` + `/stats` + endpoints MVP)

| Capa | Archivo | Responsabilidad |
|---|---|---|
| Router | [`backend/routers/ingest.py`](../backend/routers/ingest.py) | `POST /ingest` → 202, depende de `verify_ingest_key` |
| Router | [`backend/routers/stats.py`](../backend/routers/stats.py) | `GET /stats/{client_id}` con JWT Supabase + ventana `from/to` para slider |
| Router | [`backend/routers/mvp.py`](../backend/routers/mvp.py) | Endpoints MVP user-facing: `/alerts`, `/analytics/faults-by-zone`, `/maintenance/*`, `/operations/*`, `/corporate/*`, `/technician/*` |
| Seguridad | [`backend/security/ingest_key.py`](../backend/security/ingest_key.py) | `X-Ingest-Key` con `hmac.compare_digest` |
| Schemas | [`backend/schemas/ingest.py`](../backend/schemas/ingest.py), [`backend/schemas/stats.py`](../backend/schemas/stats.py) | Contratos `/ingest` y `/stats` (window, financial/environmental/technical) |
| Dominio | [`backend/domain/inference.py`](../backend/domain/inference.py), [`magnitudes.py`](../backend/domain/magnitudes.py) | `infer_magnitude`, `normalize_batch`, `Canonical` enum + alias + rangos |
| Dominio | [`backend/domain/stats.py`](../backend/domain/stats.py) | `aggregate_client_stats` (energía, ROI, CO2, pf medio) en ventana temporal |
| Dominio | [`backend/domain/mvp_data.py`](../backend/domain/mvp_data.py) | Datasets normalizados de soporte MVP (operaciones/corporativo/técnico) |
| Persistencia | [`backend/persistence/supabase_rest.py`](../backend/persistence/supabase_rest.py), [`backend/persistence/stats_repo.py`](../backend/persistence/stats_repo.py) | Inserción de lecturas + consulta por `client_id` y rango `ts` |
| Cache | [`backend/cache/ttl.py`](../backend/cache/ttl.py), [`backend/cache/store.py`](../backend/cache/store.py) | Cache in-memory TTL para `/stats` y `/analytics/faults-by-zone` + invalidación tras `/ingest` |
| Providers | [`backend/providers/`](../backend/providers/) | `DataProvider` Protocol + `DeyeMockProvider` (snapshots) + `DeyeLiveProvider` (Tinku) |
| Providers | [`backend/providers/adapters.py`](../backend/providers/adapters.py) | Adaptadores provider payload -> `RawReading` para Deye/Huawei/Growatt |

Cobertura: 80 tests (unit + integration + E2E snapshot Deye real → `/ingest` + `/stats` + contratos endpoints MVP + cache TTL). Ver [`backend/README.md`](../backend/README.md).

## Frontend

- **Auth:** solo `supabase.auth.*` + sesión; el `access_token` se envía a FastAPI como `Authorization: Bearer` cuando se consumen rutas protegidas.
- **Datos:** preferir **lectura directa** a Supabase (RLS) para tablas/vistas; FastAPI para agregados pesados o PDF.

## Persistencia y sincronización (Técnico de Campo)

En techo, **la conectividad es intermitente**. El cliente móvil del **Técnico de Campo** debe asumir pérdida de red:

- **Buffer local:** cola de lecturas tomadas en sitio, borradores de checklist y marcas de tiempo; persistencia en almacenamiento del dispositivo (p. ej. IndexedDB o SQLite embebido en la app) hasta confirmar ACK del servidor.
- **Sincronización:** al volver online, envío ordenado con **idempotencia** (ids de evento / `client_mutation_id`) para no duplicar filas en `readings` ni cerrar dos veces el mismo mantenimiento.
- **Conflicto mínimo:** el servidor gana en timestamps de cierre de ticket; el técnico ve estado “pendiente de sync” / “enviado” en UI.

FastAPI y Supabase reciben la verdad final; el buffer es **solo capa de borde** en el dispositivo (ver `POST /maintenance/complete` en `docs/API_SPEC.yml`).

## Motor de analítica (fallas por zona — Operaciones TR)

Para el gráfico de barras **frecuencia de falla vs. sector** en **Operaciones Techos Rentables**:

- Cada planta (o cliente) tiene un **`geozone`** (string o FK a tabla de zonas): región administrativa, cluster urbano o polígono simplificado acordado en datos.
- Las alertas y tickets cerrados se **agregan por `geozone`** en ventana temporal (`from`/`to`): conteo de eventos, o tasa normalizada por MW instalado si se define en el modelo.
- La API expone **`GET /analytics/faults-by-zone`** para que el frontend no reconstruya agregaciones pesadas en el browser; la lógica puede vivir en SQL (vista materializada) o en FastAPI leyendo con `service_role`.

Esta agregación es independiente del **mapeo geográfico de errores** descrito en `context.md` (distinguir falla de red vs. equipo): el motor de zona responde “dónde pica”; las reglas de clasificación de tipo de falla viven en dominio de alertas / correlación con telemetría.

## Despliegue (MVP)

- Frontend: estático (Vite build).
- FastAPI: un contenedor; env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `SUPABASE_JWT_SECRET` (validación JWT), `INGEST_API_KEY` (o nombre acordado).
- Supabase: proyecto cloud **2.70.x** cliente JS documentado; revisar changelog JWT si upgrade de minor.

## Stack resumen

| Capa | Tecnología |
|------|------------|
| Identidad + datos + RLS | Supabase (Postgres, Auth **JWT**, Realtime) |
| Ingesta / cálculo / PDF | FastAPI (Python 3.13), aislado |
| Frontend | React + Vite + TS + Tailwind · **npm** |
| Backend tooling | **uv** |
| Middleware datos | Tinku / APIs proveedor (guía en `docs/resources/`) |
