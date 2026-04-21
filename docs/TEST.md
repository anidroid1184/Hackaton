# Tests — backend (pytest)

**Fuente de verdad operativa** junto con `docs/DEVELOPMENT.md` (entorno y comandos). Los snapshots HTTP están en `backend/tests/fixtures/`; este documento describe **qué** se prueba y **por qué**.

Los códigos HTTP esperados del **middleware** están descritos en [`docs/resources/technical_guide.md`](./resources/technical_guide.md) (tabla «Errores comunes de autenticación» y buenas prácticas). Los tests de integración comprueban el comportamiento real cuando es estable; **502/503/504** se validan con mocks porque dependen del proveedor y son intermitentes.

## Ubicación

- Paquete: `backend/tests/`
- Comando: `cd backend && uv sync --group dev && uv run pytest …`

## Marcadores y recolección

| Marcador | Cuándo se ejecuta |
|----------|-------------------|
| *(ninguno de los siguientes)* | Suite “local” sin integración Tinku en red. |
| `@pytest.mark.tinku` | Solo con `uv run pytest --tinku` (integración HTTP al middleware). |
| `@pytest.mark.http_contract` | En la suite normal **y** con `--tinku` (sin red; ver abajo). |
| `@pytest.mark.offline` | Lectura de JSON en disco (sin `--tinku` si no hay tests `tinku` seleccionados). |

La recolección en `conftest.py` hace que:

- Sin `--tinku`: se **excluyen** los tests `tinku`; se **incluyen** `http_contract` y el resto (health, soporte, offline).
- Con `--tinku`: se ejecutan tests `tinku` **y** `http_contract` (misma sesión que snapshots + errores HTTP reales).

## Cobertura vs guía técnica (`technical_guide.md`)

| Código | Causa (guía) | Cobertura en tests |
|--------|----------------|-------------------|
| **401** | Falta `Authorization` o key inválida | `test_401_when_*` (acepta 401 o 403 si el despliegue usa 403). |
| **404** | Slug de proveedor inexistente | `test_404_when_provider_slug_does_not_exist` |
| **405** | Método HTTP no permitido (p. ej. Growatt solo GET; POST extra en `/deye/*` y `/huawei/*`) | `test_405_when_http_method_not_allowed` (POST a `growatt`…, DELETE a `deye`…) |
| **400 / 500** | Payloads mal formados del lado del proveedor (guía sección 10) | Cuerpo no JSON con `Content-Type: application/json` → error (≥ 400; a veces 500 Deye). |
| **502 / 503** | Problema temporal del proveedor; reintentar con backoff (guía sección 10) | `test_http_upstream_error_contract.py` con `httpx.MockTransport` (502, 503, 504). |

## Tipos de prueba

### 1. Smoke FastAPI

- `tests/test_health.py` — `GET /health` vía `TestClient` (sin red).

### 2. Utilidades manifest Tinku

- `tests/test_tinku_support.py` — sustitución `${VAR}`, coerción numérica, `requires_env`.

### 3. Snapshots middleware (`--tinku`)

- `tests/tinku/test_fetch_snapshots.py` — parametrizado por `tinku_endpoints.yaml`; escribe JSON bajo `tests/fixtures/tinku_snapshots/` (gitignore).
- Casos especiales documentados en el código: 404 proveedor inexistente (stub), cuerpo no JSON (diagnóstico), `requires_env` faltante (stub + skip).

### 4. Errores HTTP contra el middleware real (`--tinku`)

Archivo: `tests/tinku/test_middleware_http_errors.py`

| Test | Comportamiento esperado |
|------|-------------------------|
| Sin header `Authorization` | `401` o `403` (según despliegue). |
| API key inválida fija (`tk_invalid_key_pytest_contract_only`) | `401` o `403`. |
| Slug de proveedor inexistente | `404`. |
| POST a ruta Growatt que la guía documenta como GET | `405`. |
| DELETE a ruta Deye que solo admite GET/POST según guía | `405`. |
| Cuerpo no JSON con `Content-Type: application/json` y key válida | `>= 400` (a veces `500` con cuerpo Deye `invalid param type`). |

**Decisión:** no exigir solo `401` literal: algunos despliegues responden `403` para no autorizado.

### 5. Contrato 502 / 503 / 504 (sin red)

Archivo: `tests/test_http_upstream_error_contract.py`, marcador `http_contract`.

- Usa `httpx.MockTransport` para simular respuestas aguas arriba.
- **Decisión:** no depender del middleware para reproducir 502/503 en CI (intermitente); los tests fijan que el **cliente** httpx expone el código correcto cuando ocurre, alineado con la recomendación de reintentos de la guía.

## Comandos resumidos

```bash
cd backend && uv run pytest -v
cd backend && uv run pytest --tinku -v
```

Variables: ver `docs/DEVELOPMENT.md` y `.env.example`.

## CI sin credencial Tinku

- Sin `TINKU_API_KEY`, los tests `tinku` que la requieren hacen **skip** o no se ejecutan en la recolección por defecto (según el caso).
- Los tests `http_contract` y smoke **no** requieren API key.
