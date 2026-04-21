# Desarrollo — entorno y pruebas

**Fuente de verdad** para comandos de backend, variables de entorno y tests contra el middleware Tinku.
Las tareas de implementación en `sdd/*/tasks.md` son seguimiento; la memoria operativa entre sesiones se persiste en **Engram**; este archivo define el contrato para humanos y CI.

## Variables de entorno (raíz del monorepo)

1. Copiar la plantilla: `cp .env.example .env`
2. Rellenar secretos localmente. `.env` está en `.gitignore`.

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `TINKU_API_KEY` | Para ejecutar `pytest --tinku` contra el middleware | Header `Authorization: <key>` tal cual (`tk_...`), sin `Bearer`. Ver `docs/resources/technical_guide.md`. |
| `TINKU_BASE_URL` | No (default) | Base del middleware; por defecto `https://techos.thetribu.dev`. |

**Requeridas por el manifest** (`requires_env` en `tinku_endpoints.yaml`) para snapshots Deye/Growatt completos:

| Variable | Uso |
|----------|-----|
| `TINKU_DEYE_STATION_ID` | `deye-device-list` (`POST .../station/device` con `stationIds`), `deye-station-history`. |
| `TINKU_DEYE_SN` | `deye-device-latest` (campo `deviceList` en el body; serial de inversor, p. ej. desde `station/device`). |
| `TINKU_DEYE_HISTORY_START` | Inicio rango `yyyy-MM-dd` para `deye-station-history` (`granularity: 2`). |
| `TINKU_DEYE_HISTORY_END` | Fin (exclusivo según doc Deye; mismo formato). |
| `TINKU_GROWATT_PLANT_ID` | Query `plant_id` en `growatt-device-list`. |

**Huawei:** si el middleware no expone el slug `huawei`, los tests siguen **PASSED** y guardan un JSON con `_skipped` y `_reason: middleware_sin_proveedor`. No hace falta variable de entorno.

Los tests convierten a entero `stationId`, `plantId`, `plant_id`, `devId`, `page`, `size` y los elementos de `stationIds` cuando el valor es solo dígitos.

**FastAPI / Supabase** (cuando el código las consuma; nombres alineados con `docs/API_SPEC.yml`):

- `INGEST_API_KEY` — ingesta máquina-a-máquina (`X-Ingest-Key`).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` — según despliegue.

`backend/tests/conftest.py` carga `.env` desde la **raíz del repositorio** (no solo `backend/`).

## Backend (uv)

```bash
cd backend && uv sync --group dev
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Pytest

Detalle de marcadores, tests de errores HTTP y CI: **`docs/TEST.md`**.

Suite por defecto (sin llamadas al middleware Tinku en la recolección de tests `tinku`):

```bash
cd backend && uv run pytest -v
```

Solo tests de integración HTTP al middleware (snapshots JSON bajo `backend/tests/fixtures/tinku_snapshots/`; archivos `*.json` en gitignore):

```bash
cd backend && uv run pytest --tinku -v
```

Desde la raíz del monorepo: `uv run --directory backend pytest -v` (u opción `--tinku`).

## Contratos y archivos relacionados

| Artefacto | Rol |
|-----------|-----|
| `docs/TINKU_MIDDLEWARE_API.yml` | OpenAPI del middleware (no es el FastAPI local). |
| `backend/tests/fixtures/tinku_endpoints.yaml` | Manifest ejecutable para pytest (sincronizar paths con el OpenAPI anterior). |
| `docs/API_SPEC.yml` | Contrato SolarPulse (FastAPI + pipeline hacia ingesta). |
| `docs/ARCHITECTURE.md` | Flujo end-to-end incl. middleware. |

Si falta una variable listada en `requires_env`, el test escribe un JSON con `_skipped` / `_reason: missing_env` y hace **skip** controlado. Si el proveedor no existe en el middleware (404), se escribe stub y el test **pasa** para no bloquear CI.

Si la respuesta HTTP es 200 pero el cuerpo **no es JSON** (p. ej. Growatt devolviendo bytes con `Content-Type` incorrecto), se guarda un snapshot de diagnóstico con `_reason: cuerpo_no_json` y el test **pasa**; conviene re-ejecutar más tarde o revisar el middleware.
