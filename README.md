[Tinku Hackathon](https://hackathon.thetribu.dev/)

# MiTechoRentable · Plataforma unificada de operación solar

Equipo **RootWave** · TINKU Hackathon 2026 · [Sitio del evento](https://hackathon.thetribu.dev/) · [Problema](./docs/problem/problema.md) · [Guía técnica](./docs/resources/technical_guide.md) · [Rúbrica](./docs/resources/rubrica_participantes.md)

> Producto listo para correr en local con **un solo comando**. Esta copia viva del README está enfocada en **cómo funciona**, **qué requiere** y **cómo ponerla a funcionar**. Los créditos del evento y el texto original del template están al final, y quedan versionados en [`README.md.bk`](./README.md.bk).

---

## 1. ¿Qué hace la plataforma?

**MiTechoRentable** unifica la operación de +200 proyectos solares con inversores de múltiples proveedores (Growatt, Huawei, Deye, Hoymiles, SRNE) detrás de **una sola consola** con cuatro experiencias por rol. El objetivo es cumplir contrato, detectar fallas en **menos de 5 minutos** y eliminar **+130 h/mes** de trabajo manual.

### Cuatro roles, una misma verdad

| Rol | Landing post-login | Qué resuelve |
|---|---|---|
| **Cliente residencial** (`cliente`) | `/dashboard` | Ahorro en COP, energía generada, CO₂ evitado, agenda de visitas, reportes PDF on-demand. |
| **Operaciones TR** (`operaciones`) | `/operaciones/dashboard` | War Room de flota, fallas por zona, agenda de mantenimientos, comparativo multi-planta, analítica regional, gestión de técnicos. |
| **Cliente corporativo** (`corporativo`) | `/corporativo/dashboard` | ROI solar vs objetivo contractual, registro KPI (Vo, Io, fp, Hz), tickets con SLA, riesgo financiero. |
| **Técnico de Campo** (`tecnico`) | `/tecnico/ruta` | Ruta del día, telemetría en sitio, checklist de salud eléctrica, cierre con evidencias (buffer local para conectividad intermitente). |

### Módulos de producto

- **A · Intelligence Core (FastAPI):** ingesta enriquecida con inferencia de magnitud, KPIs, generación de PDF y alertas HTTP/WS.
- **B · Mission Control (React SPA):** dashboards ejecutivos, War Room y consolas corporativa/residencial.
- **C · Field Ops (React móvil / PWA):** vistas técnico en sitio con sincronización idempotente.

Detalle de arquitectura, contrato Supabase ↔ FastAPI y flujo end-to-end: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 2. Arquitectura en 30 segundos

```
Inversores (Growatt, Huawei, Deye…)
        │
        ▼
Middleware Tinku  ──►  FastAPI (uvicorn :8000)        Mock-hub (tsx :4010)
  (polling / APIs       • POST /ingest                  • /stats/*
   proveedor)           • GET  /stats, /alerts          • /operations, /corporate, /technician/*
                        • GET  /reports/generate (PDF)  • panel override para demo
                        │                                    │
                        ▼                                    │
                   Supabase (Postgres + Auth + RLS)          │
                        ▲                                    │
                        │  supabase-js (JWT)                 │
                        ▼                                    │
                 React SPA (Vite :5173) ◄─────────────────────┘
                 Roles: cliente · operaciones · corporativo · tecnico
```

- **Supabase = identidad + datos + RLS.** Login/refresh/JWT/Realtime viven aquí; nunca en FastAPI.
- **FastAPI = calculadora aislada.** Valida JWT de Supabase, no reimplementa auth.
- **Mock-hub = opcional para demo/pitch.** Expone stats sintéticos y tiene un panel con sliders para "manipular data en vivo" sin recargar los frontends.

---

## 3. Requisitos

### Herramientas obligatorias

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| **Python** | 3.13 | Backend FastAPI (`uv` lo gestiona). |
| **[uv](https://docs.astral.sh/uv/)** | 0.5+ | Gestor Python y orquestador `manage.py`. |
| **Node.js** | 22 LTS | Frontend Vite y mock-hub. |
| **pnpm** | 10+ | Gestor de paquetes del frontend y mock-hub. |
| **[Supabase CLI](https://supabase.com/docs/guides/cli)** | 2.0+ | Postgres + Auth locales (`supabase start`). |
| **Docker Desktop / Engine** | corriendo | Requerido por Supabase CLI para levantar Postgres local. |
| **bash + curl** | — | `scripts/demo_smoke.sh`. |

### Variables de entorno

1. Copia la plantilla: `cp .env.example .env` (raíz del repo — Vite la lee vía `envDir` desde `frontend/vite.config.ts`).
2. Reemplaza los placeholders `change-me` por passwords reales para los 4 usuarios demo (`VITE_*_MOCK_PASSWORD`).
3. Tras `supabase start`, corre `supabase status` y copia `API URL` y `anon key` a `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` y `SUPABASE_URL` / `SUPABASE_JWT_SECRET`.

Matriz completa de variables, consumidores y defaults: [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md).

### Fuente de datos

- **`DATA_SOURCE=mock`** (default): snapshots locales + mock-hub. Ideal para demo/offline.
- **`DATA_SOURCE=live`**: requiere `TINKU_BASE_URL` + `TINKU_API_KEY` (entregados por el staff de la hackathon).

---

## 4. Cómo ponerla a funcionar

### 4.1. Demo en 2 comandos (camino feliz)

```bash
supabase start          # una sola vez; levanta Postgres + Auth locales
./scripts/demo_smoke.sh # aplica migraciones + seed + arranca todo + valida logins
```

El script:

1. Arranca Supabase local si no está corriendo.
2. `supabase db reset` → aplica [`supabase/migrations/*`](./supabase/migrations/) y [`supabase/seed.sql`](./supabase/seed.sql).
3. Corre [`scripts/seed_demo_users.py`](./scripts/seed_demo_users.py) que crea los 4 usuarios demo (idempotente).
4. Levanta **backend (8000) + frontend (5173) + mock-hub (4010)** en background con `uv run manage.py runserver --simulate`.
5. Hace `POST /auth/v1/token?grant_type=password` con cada rol — exit 0 ⇒ los 4 logins respondieron **HTTP 200**.

Al terminar, abre **http://127.0.0.1:5173** e inicia sesión con cualquiera de los usuarios demo (ver §4.4). Para detener el stack:

```bash
kill $(cat /tmp/demo_smoke_runserver.pid)
```

### 4.2. Arranque manual (desarrollo)

Desde la raíz del repo:

| Objetivo | Comando |
|---|---|
| **Stack completo** (API + UI) | `uv run manage.py runserver` |
| **Stack completo + mock-hub** (recomendado para demo) | `uv run manage.py runserver --simulate` |
| Solo FastAPI (`/health`, `/me`, `/stats`, `/reports/generate`…) | `uv run manage.py backend` → http://127.0.0.1:8000 |
| Solo Vite (React) | `uv run manage.py frontend` → http://localhost:5173 |
| Mock-hub dedicado | `pnpm --dir mock-hub run mock-hub` → http://127.0.0.1:4010 |
| Supabase (Auth + DB) | `supabase start` · estado: `supabase status` · reset: `supabase db reset` |
| Puerto custom del mock-hub | `uv run manage.py runserver --simulate --mock-hub-port 4510` |

> `--simulate` inyecta automáticamente `VITE_STATS_BASE_URL=http://127.0.0.1:<port>` (mock-hub) y `VITE_REPORTS_BASE_URL=http://127.0.0.1:8000` (PDF backend) al proceso de Vite.

### 4.3. Puertos por default

| Servicio | URL | Healthcheck |
|---|---|---|
| Frontend (Vite) | http://localhost:5173 | `/` |
| Backend (FastAPI) | http://127.0.0.1:8000 | `/health` |
| Mock-hub | http://127.0.0.1:4010 | `/health` |
| Supabase (Kong) | http://127.0.0.1:54321 | `/auth/v1/health` |
| Supabase Studio | http://127.0.0.1:54323 | panel web |

### 4.4. Usuarios demo (4 roles reales en Supabase local)

| Rol app | Rol DB (`profiles.role`) | Org (`slug`) | Email (`VITE_*_MOCK_EMAIL`) | Entrada |
|---|---|---|---|---|
| `cliente` | `client` | `default` | `cliente@solarpulse.local` | `/dashboard` |
| `operaciones` | `operations` | `tr-demo` | `ops@techorentable.local` | `/operaciones/dashboard` |
| `corporativo` | `corporate` | `tr-demo` | `corp@techorentable.local` | `/corporativo/dashboard` |
| `tecnico` | `technician` | `tr-demo` | `tech@techorentable.local` | `/tecnico/ruta` |

> Los passwords viven únicamente en tu `.env` local (no committeado). `scripts/seed_demo_users.py` es idempotente: re-ejecutarlo actualiza hashes, rol y organización sin duplicar filas.

### 4.5. Manipular data en vivo durante el pitch

Con el stack arriba, abre **http://127.0.0.1:4010/** (preferentemente en modo incógnito). Es un panel HTML con sliders y selects que activa un `overrideState` server-side: cualquier request al mock-hub adopta los valores del panel en vez de sus query params, y los 4 frontends logueados reflejan los cambios **sin recargar**.

Scripteable desde terminal:

```bash
curl -X POST http://127.0.0.1:4010/sim/params \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true,"params":{"scenario":"stress","faultMode":"degraded"}}'

curl -X POST http://127.0.0.1:4010/sim/params/reset   # volver al baseline
```

Más detalle: [`mock-hub/README.md`](./mock-hub/README.md#panel-de-control-override-pitchdemo).

---

## 5. Estructura del repo

```
tinku_team_root_wave/
├── backend/            # FastAPI (Python 3.13) — ingest, stats, reports, mvp
│   ├── main.py         # app FastAPI + CORS + routers
│   ├── routers/        # ingest.py · stats.py · mvp.py · reports.py
│   ├── domain/         # inferencia magnitud, stats, plantillas PDF
│   ├── providers/      # Deye/Huawei/Growatt (mock + live Tinku)
│   ├── persistence/    # Supabase REST + stats_repo
│   └── tests/          # unit + integration + snapshots reales
├── frontend/           # React 19 + Vite 8 + TS + Tailwind v4
│   ├── src/pages/      # 28 vistas (cliente/operaciones/corporativo/técnico)
│   ├── src/components/ # AppShell, charts, shared, role-specific
│   ├── src/lib/        # API clients, Chart.js theming, fallbacks
│   └── src/auth/       # ProtectedRoute + ThemeContext
├── mock-hub/           # Node tsx — stats sintéticos + panel override
├── supabase/
│   ├── migrations/     # 4 migraciones P0 (organizations/profiles/RLS/seed roles)
│   └── seed.sql        # datos de arranque
├── scripts/
│   ├── demo_smoke.sh   # bootstrap + login smoke de los 4 roles
│   └── seed_demo_users.py  # crea usuarios demo en Supabase local (idempotente)
├── docs/               # ARCHITECTURE · API_SPEC · ENVIRONMENT · REPORTS_PDF · …
├── manage.py           # orquestador (backend + frontend + mock-hub)
├── pyproject.toml      # ruff + mypy + bandit + uv workspace
└── .env.example        # plantilla de variables (VITE_*, SUPABASE_*, TINKU_*)
```

Documentación profunda por tema:

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — monolito modular Supabase-first, flujo end-to-end.
- [`docs/API_SPEC.yml`](./docs/API_SPEC.yml) — OpenAPI de FastAPI.
- [`docs/DATABASE.md`](./docs/DATABASE.md) — esquema Postgres + RLS.
- [`docs/MOCK_DATA.md`](./docs/MOCK_DATA.md) — contratos del mock-hub.
- [`docs/REPORTS_PDF.md`](./docs/REPORTS_PDF.md) — pipeline de generación PDF.
- [`docs/USER_FLOWS.md`](./docs/USER_FLOWS.md) — flujos por rol.
- [`docs/TEST.md`](./docs/TEST.md) — estrategia de testing.

---

## 6. Verificación y calidad

### Backend

```bash
cd backend
uv run pytest                       # 80+ tests (unit + integration + E2E snapshot)
uv run ruff check .                 # lint
uv run mypy .                       # type check
```

### Frontend

```bash
cd frontend
pnpm install
pnpm exec tsc --noEmit              # type check
pnpm exec eslint . --max-warnings=0 # lint
pnpm test                           # vitest (58 tests)
pnpm run build                      # build producción
```

### Smoke end-to-end

```bash
./scripts/demo_smoke.sh             # valida login HTTP 200 de los 4 roles
```

---

## 7. Deploy (MVP)

- **Frontend:** estático (`pnpm run build` → `dist/`). Sirve desde cualquier CDN.
- **FastAPI:** un contenedor; requiere `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `SUPABASE_JWT_SECRET`, `INGEST_API_KEY`.
- **Supabase:** proyecto cloud con migraciones de `supabase/migrations/` aplicadas.
- **Ingesta:** middleware Tinku (o cron propio) que hace `POST /ingest` con `X-Ingest-Key`.

Detalle en [`docs/ARCHITECTURE.md#despliegue-mvp`](./docs/ARCHITECTURE.md).

---

## 8. Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---|---|---|
| `supabase start` queda colgado | Docker no está corriendo | Arrancar Docker Desktop / `systemctl start docker`. |
| Login devuelve `invalid_credentials` | Passwords en `.env` desactualizados | `uv run python scripts/seed_demo_users.py` re-siembra in-place. |
| Frontend no ve datos del mock-hub | `VITE_STATS_BASE_URL` sin definir | Correr con `--simulate` o exportar la variable. |
| PDF `/reports/generate` devuelve 404 | Mock-hub no implementa reports | Backend debe estar arriba en `:8000`; verificar `VITE_REPORTS_BASE_URL`. |
| Puerto 4010 ocupado | Mock-hub previo colgado | `--mock-hub-port 4510` o `kill $(lsof -ti:4010)`. |
| JWT inválido en FastAPI | `SUPABASE_JWT_SECRET` no coincide | Copiar de `supabase status` al `.env` y reiniciar backend. |

---

## 9. Licencia

Distribuido bajo **MIT** (ver [`LICENSE`](./LICENSE)). Durante la hackathon el repositorio es privado; al cierre pasa a público para que la comunidad pueda aprender, reutilizar y construir sobre lo que hicimos. 🌱

---

## 10. Créditos del evento

**TINKU Hackathon 2026** · 18 horas · organizada por [The Tribu](https://thetribu.dev) y la [Universidad Cooperativa de Colombia](https://www.ucc.edu.co) (sede Cartago), con [Techos Rentables](https://techosrentables.com), [Celsia Internet](https://www.celsiainternet.com/), [Cursor](https://cursor.com) y [MiniMax](https://www.minimax.io/).

**Aliados:** [Persano](https://www.instagram.com/persano.co) · [Flavors](https://www.instagram.com/coffe_flavors) · [La 7 Incluyente](https://www.instagram.com/la7incluyentegf) · [Vinola](https://www.instagram.com/vinolabar/).

**Equipo RootWave:** Juan Sebastian Valencia Londoño · Isabel Allssia Palacio Parra · Santiago Vera Loaiza.

El texto completo del template original del hackathon (bienvenida, línea de meta, principios, pasos sugeridos) se preserva en [`README.md.bk`](./README.md.bk).

---

Hecho con 💛 por **[TINKU Hackathon 2026](https://hackathon.thetribu.dev/)**.
