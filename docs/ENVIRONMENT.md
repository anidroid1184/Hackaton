# Entornos y variables (P1)

Documento operativo para cerrar P1 de documentación sobre dos modos: **proveedor** y **simulación**.
No incluir valores sensibles; usar placeholders como en `.env.example`.

## Modos de ejecución

| Modo | Objetivo | Estado hoy | Gap / siguiente objetivo |
|---|---|---|---|
| Proveedor | Priorizar tiempo real (`Tinku`/proveedor) y degradar a fallback con mocks registrados + autogenerados/ampliados | Frontend degrada remoto→mock/local; backend MVP tiene fallback en endpoints críticos (`/analytics/faults-by-zone`, `/maintenance/complete`) cuando falla persistencia | Extender fallback live→mock a más rutas de proveedor en runtime no-MVP |
| Simulación | Probar perfiles `natural`, `operaciones/operario`, `técnico`, `jurídico-corporativo` en app independiente con puerto dedicado | `uv run manage.py runserver --simulate` levanta backend+frontend+`mock-hub` y separa tráfico: stats al mock-hub y reportes al backend | Mantener paridad del contrato multi-proveedor con backend productivo |

## Arranque con `manage.py`

Desde la raíz del repo:

- `uv run manage.py runserver`: backend (`:8000`) + frontend (`:5173`) en modo normal.
- `uv run manage.py runserver --simulate`: backend (`:8000`) + frontend (`:5173`) + `mock-hub` (`:4010` por default).
- `uv run manage.py runserver --simulate --mock-hub-port 4510`: mismo modo simulación, puerto dedicado custom.

Notas:

- En `--simulate`, el frontend usa:
  - `VITE_STATS_BASE_URL=http://127.0.0.1:<mock_hub_port>` para `/stats/*`.
  - `VITE_REPORTS_BASE_URL=http://127.0.0.1:8000` para `/reports/generate` (PDF backend).
- Si usas `runserver` sin `--simulate`, no se sobreescriben `VITE_STATS_BASE_URL` ni `VITE_REPORTS_BASE_URL` (toman `.env` o fallback de cada módulo).

## Tabla de variables por consumidor

| Variable | Consumidor | Uso principal | Estado actual |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend/build | URL Supabase para `supabase-js` en navegador | Existe en `.env.example` |
| `VITE_SUPABASE_ANON_KEY` | Frontend/build | Clave anon para auth/lectura cliente | Existe en `.env.example` |
| `VITE_STATS_BASE_URL` | Frontend/build | Base URL de `/stats/*` (mock-hub o backend según entorno) | Opcional para stats (hay fallback local en perfil natural) |
| `VITE_REPORTS_BASE_URL` | Frontend/build | Base URL de `/reports/generate` (backend FastAPI) | Opcional (no está fija en `.env.example`); en `--simulate` `manage.py` la inyecta a `http://127.0.0.1:8000` |
| `VITE_SUPPORT_WHATSAPP` | Frontend/build | Número WhatsApp usado en botón directo de soporte (`wa.me`) | Opcional; si no existe usa fallback local |
| `VITE_ENABLE_OPERATIONS_MOCK_AUTH` | Frontend/build | Habilita bypass auth mock por rol (demo sin Supabase) | Existe en `.env.example` |
| `VITE_CLIENT_MOCK_EMAIL` | Frontend/build + seed | Credencial rol cliente residencial (seed Supabase real + mock-auth) | Existe en `.env.example` |
| `VITE_CLIENT_MOCK_PASSWORD` | Frontend/build + seed | Credencial rol cliente residencial | Existe en `.env.example` |
| `VITE_CLIENT_MOCK_NAME` | Frontend/build + seed | Nombre visible rol cliente residencial | Existe en `.env.example` |
| `VITE_OPERATIONS_MOCK_EMAIL` | Frontend/build + seed | Credencial rol operaciones/operario (seed Supabase real + mock-auth) | Existe en `.env.example` |
| `VITE_OPERATIONS_MOCK_PASSWORD` | Frontend/build + seed | Credencial rol operaciones/operario | Existe en `.env.example` |
| `VITE_OPERATIONS_MOCK_NAME` | Frontend/build + seed | Nombre visible rol operaciones/operario | Existe en `.env.example` |
| `VITE_CORPORATE_MOCK_EMAIL` | Frontend/build + seed | Credencial rol jurídico-corporativo (seed Supabase real + mock-auth) | Existe en `.env.example` |
| `VITE_CORPORATE_MOCK_PASSWORD` | Frontend/build + seed | Credencial rol jurídico-corporativo | Existe en `.env.example` |
| `VITE_CORPORATE_MOCK_NAME` | Frontend/build + seed | Nombre visible rol jurídico-corporativo | Existe en `.env.example` |
| `VITE_TECHNICIAN_MOCK_EMAIL` | Frontend/build + seed | Credencial rol técnico (seed Supabase real + mock-auth) | Existe en `.env.example` |
| `VITE_TECHNICIAN_MOCK_PASSWORD` | Frontend/build + seed | Credencial rol técnico | Existe en `.env.example` |
| `VITE_TECHNICIAN_MOCK_NAME` | Frontend/build + seed | Nombre visible rol técnico | Existe en `.env.example` |
| `SUPABASE_URL` | Backend runtime | Base PostgREST (`/rest/v1`) | Existe en `.env.example` |
| `SUPABASE_JWT_SECRET` | Backend runtime | Validación de JWT Supabase en rutas protegidas | Existe en `.env.example` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend runtime | Escrituras server-only (no browser) | Existe en `.env.example` |
| `INGEST_API_KEY` | Backend runtime | Auth M2M (`X-Ingest-Key`) para `/ingest` | Existe en `.env.example` |
| `DATA_SOURCE` | Backend runtime | Selección de fuente (`mock`/`live`) | Existe en `.env.example`, default `mock` |
| `TINKU_BASE_URL` | Backend runtime + tests/scripts | Base del middleware Tinku | Existe en `.env.example` |
| `TINKU_API_KEY` | Backend runtime + tests/scripts | API key para llamadas proveedor vía Tinku | Existe en `.env.example` |
| `TINKU_DEYE_STATION_ID` | Tests/scripts | Parámetro snapshot Deye (station/device list/history) | Existe en `.env.example` |
| `TINKU_DEYE_SN` | Tests/scripts | Parámetro snapshot Deye latest device | Existe en `.env.example` |
| `TINKU_DEYE_HISTORY_START` | Tests/scripts | Ventana inicio para snapshot Deye history | Existe en `.env.example` |
| `TINKU_DEYE_HISTORY_END` | Tests/scripts | Ventana fin para snapshot Deye history | Existe en `.env.example` |
| `TINKU_GROWATT_PLANT_ID` | Tests/scripts | Parámetro snapshot Growatt device list | Existe en `.env.example` |
| `MOCK_HUB_PORT` | Scripts runtime (`manage.py`, `mock-hub`) | Puerto de `mock-hub` en modo `runserver --simulate` | Default `4010`; configurable por CLI/env |

## Notas de consistencia

- Fuente de referencia de variables: `.env.example`.
- `VITE_REPORTS_BASE_URL` se considera variable opcional de entorno local/CI; en desarrollo con `uv run manage.py runserver --simulate` se define automáticamente.
- `VITE_CLIENT_MOCK_*` ya forma parte del contrato canónico: lo consume `scripts/seed_demo_users.py` para sembrar el usuario cliente residencial en Supabase local y el frontend lo usa como cuenta preconfigurada del rol `client`.
- `mock-hub` mantiene puerto dedicado configurable (`MOCK_HUB_PORT`, default `4010`) y se documenta en `mock-hub/README.md`.
- Arquitectura oficial del flujo y límites de FastAPI/Supabase: `docs/ARCHITECTURE.md`.
- Snapshots multi-proveedor y manifiesto: `backend/tests/fixtures/tinku_snapshots/` + `backend/tests/fixtures/tinku_endpoints.yaml`.

## Seed de usuarios demo (4 roles reales en Supabase local)

Una vez `supabase start` esté corriendo y las migraciones aplicadas:

```bash
uv run python scripts/seed_demo_users.py
```

Crea usuarios reales para los 4 roles usando las credenciales `VITE_*_MOCK_*` del `.env`. Es idempotente: si el usuario ya existe, lo reutiliza y solo actualiza `profiles.role`, `organization_id` y el link `client_users`.

### Usuarios demo canónicos

| Rol app (`AppRole`) | Rol DB (`profiles.role`) | Organización (`slug`) | Variables `.env` | Ruta de entrada post-login |
|---|---|---|---|---|
| `cliente` | `client` | `default` | `VITE_CLIENT_MOCK_EMAIL` / `VITE_CLIENT_MOCK_PASSWORD` / `VITE_CLIENT_MOCK_NAME` | `/dashboard` |
| `operaciones` | `operations` | `tr-demo` | `VITE_OPERATIONS_MOCK_EMAIL` / `VITE_OPERATIONS_MOCK_PASSWORD` / `VITE_OPERATIONS_MOCK_NAME` | `/operaciones/dashboard` |
| `corporativo` | `corporate` | `tr-demo` | `VITE_CORPORATE_MOCK_EMAIL` / `VITE_CORPORATE_MOCK_PASSWORD` / `VITE_CORPORATE_MOCK_NAME` | `/corporativo/dashboard` |
| `tecnico` | `technician` | `tr-demo` | `VITE_TECHNICIAN_MOCK_EMAIL` / `VITE_TECHNICIAN_MOCK_PASSWORD` / `VITE_TECHNICIAN_MOCK_NAME` | `/tecnico/ruta` |

> Valores por default en `.env.example` son placeholders `change-me`. Para demo local cada credencial ya está personalizada en el `.env` del repo (no committeado). Si rotas passwords, vuelve a correr `scripts/seed_demo_users.py` — Supabase actualiza el hash in-place.

Para validar login end-to-end de los 4 roles vía HTTP:

```bash
./scripts/demo_smoke.sh
```

Corre `supabase start` + `db reset` + seed + `runserver --simulate` en background + `POST /auth/v1/token?grant_type=password` con cada email/password. Exit 0 ⇒ los 4 logins devolvieron HTTP 200.
