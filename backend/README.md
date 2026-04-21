# MiTechoRentable API (FastAPI)

Servicio aislado: cálculo + borde de ingesta. Supabase concentra identidad y RLS; aquí vive la **inferencia de magnitud** y la **persistencia operativa** vía PostgREST con `service_role`. Ver `docs/ARCHITECTURE.md`.

## Estructura

```
backend/
├── main.py                    # FastAPI app + CORS + include_router(ingest, stats, mvp, reports)
├── jwt_auth.py                # Validación JWT Supabase (rutas user-facing)
├── settings.py                # pydantic-settings (env)
├── schemas/
│   ├── ingest.py              # IngestBatch, RawReading, IngestResult (Pydantic v2)
│   └── stats.py               # ClientStats + submodelos (window, roi, KPIs)
├── cache/
│   ├── ttl.py                 # MemoryTTLCache (TTL in-memory)
│   └── store.py               # cache keys + helper safe_cached_async
├── domain/
│   ├── magnitudes.py          # Canonical enum + ALIASES + rangos físicos
│   ├── inference.py           # infer_magnitude, normalize_batch (puro, sin I/O)
│   ├── stats.py               # aggregate_client_stats (compatibilidad slider from/to)
│   └── mvp_data.py            # datasets mock normalizados para endpoints MVP
├── security/
│   └── ingest_key.py          # verify_ingest_key (hmac.compare_digest)
├── persistence/
│   ├── supabase_rest.py       # SupabaseReadingsRepo (httpx async → PostgREST) + FakeReadingsRepo
│   └── stats_repo.py          # SupabaseStatsRepo (lecturas por client_id + ventana)
├── providers/
│   ├── base.py                # DataProvider Protocol
│   ├── deye_mock.py           # Lee snapshots locales (DATA_SOURCE=mock)
│   └── deye_live.py           # httpx POST a Tinku (DATA_SOURCE=live)
├── routers/
│   ├── ingest.py              # POST /ingest (202)
│   ├── stats.py               # GET /stats/{client_id} (200)
│   ├── mvp.py                 # /alerts, /analytics, /maintenance, /operations, /corporate, /technician
│   └── reports.py             # GET /reports/generate (PDF/TEX)
├── templates/
│   └── reports/
│       ├── simplified.tex     # Plantilla LaTeX simplificada (sin logo)
│       └── technical.tex      # Plantilla LaTeX técnica (sin logo)
└── tests/
    ├── unit/                  # Tests puros sin I/O (marker: unit)
    ├── integration/           # MockTransport + filesystem, sin red (marker: integration)
    └── tinku/                 # HTTP real contra middleware Tinku (solo con --tinku)
```

## Variables de entorno

En el `.env` **en la raíz del monorepo** (`backend/tests/conftest.py` lo carga):

| Variable | Uso |
|---|---|
| `SUPABASE_URL` | Base PostgREST (`{url}/rest/v1/readings`) |
| `SUPABASE_JWT_SECRET` | Validación firma JWT en rutas user-facing |
| `SUPABASE_SERVICE_ROLE_KEY` | Ingesta server-only. **Nunca al browser.** |
| `INGEST_API_KEY` | Secreto M2M para header `X-Ingest-Key` en `/ingest` |
| `DATA_SOURCE` | `mock` (default) \| `live` — variable prevista para selector de provider en runtime (`DeyeMockProvider`/`DeyeLiveProvider`) |
| `TINKU_BASE_URL`, `TINKU_API_KEY` | Middleware Tinku (live mode) |

## Endpoints

| Método | Ruta | Auth | Estado |
|---|---|---|---|
| GET | `/health` | — | Done |
| GET | `/me` | Supabase JWT | Done |
| POST | `/ingest` | `X-Ingest-Key` | Done (sprint 1) |
| GET | `/stats/{client_id}` | Supabase JWT | Done (sprint 2, `from/to` slider) |
| GET | `/alerts` | Supabase JWT | Done (MVP, con filtros) |
| GET | `/analytics/faults-by-zone` | Supabase JWT | Done (MVP + cache TTL) |
| GET | `/maintenance/schedule`, POST `/maintenance/complete` | Supabase JWT | Done (MVP) |
| GET | `/operations/*`, `/corporate/*`, `/technician/*` | Supabase JWT | Done (MVP adapters frontend) |
| GET | `/reports/generate` | Supabase JWT | Done (Lote 5 PDF/TEX) |
| GET | `/ws/alerts` | Supabase JWT | Pendiente |

## Cache (MVP)

- Cache in-memory TTL (sin Redis) para rutas costosas.
- Cobertura actual:
  - `/stats/{client_id}` (clave por `client_id + from + to`)
  - `/analytics/faults-by-zone` (clave por `from + to + organization_id`)
- Invalidación al ingerir (`POST /ingest`) para prefijos de stats/analytics.
- Header de observabilidad: `X-Cache: MISS|HIT`.

Contrato completo: [`docs/API_SPEC.yml`](../docs/API_SPEC.yml).

## Motor de inferencia de magnitud

Agnóstico de hardware (`.cursorrules` #2): dos fases en `domain/inference.py`:

1. **Alias conocidos** (`Pac`, `GridFrequency`, `SOC`, `DCVoltagePV1`, ...) → `Canonical`.
2. **Fallback por rango físico + unidad**: si el nombre no matchea, se deduce por valor (`Hz ∈ [45,65]` → `freq_hz`, `% ∈ [0,100]` → `soc_pct`, etc.).

Convención Deye asumida cuando falta unidad: potencia → `W`, energía → `kWh`. Los pares no inferibles quedan en `readings.raw`, jamás en `canonical`.

## Arranque

**Entorno, variables y pytest (incl. snapshots Tinku):** [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md). **Tests (marcadores, 401/502/503/504):** [`docs/TEST.md`](../docs/TEST.md). Plantilla: [`.env.example`](../.env.example).

```bash
cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Tests

```bash
cd backend
uv run pytest -q                       # suite backend completa
uv run pytest -m unit -q               # solo unit (rápido, sin I/O)
uv run pytest -m integration -q        # integration (MockTransport + snapshots)
uv run pytest --tinku -q               # integración HTTP real al middleware
```

- `pytest-asyncio` en modo `auto`.
- Snapshots Deye en `tests/fixtures/tinku_snapshots/deye/` (gitignored; generar con `--tinku`).

## Lint + formato

```bash
uv run ruff check . && uv run ruff format .
```
