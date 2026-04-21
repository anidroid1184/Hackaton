# API Growatt — Guía para equipos participantes

Esta carpeta documenta los endpoints de **Growatt OpenAPI v1** disponibles para los equipos del hackathon. Cada archivo cubre un grupo de endpoints con su método, ruta, query params esperados, ejemplo de `curl` y un ejemplo de respuesta **anonimizada** (los `plant_id`, `device_sn`, nombres y coordenadas que verás son valores ficticios; la forma del payload sí es la real).

---

## 1. Autenticación

Todas las peticiones requieren el header `Authorization` con tu **API key de equipo** (`tk_…`):

```
Authorization: tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Si el header falta o la key es inválida, la respuesta será `401 Unauthorized`.

> Nunca publiques tu `tk_…` en repos, Discord, screenshots ni `.env` comiteados. Si se filtra, avisa a los organizadores para rotarla.

El token real de Growatt (header `token: …`) lo inyecta el middleware automáticamente: tu equipo nunca lo ve.

---

## 2. Base URL

```
https://techos.thetribu.dev/growatt
```

Todas las rutas que aparecen en esta guía se concatenan a esa base. Ejemplo:

```
GET https://techos.thetribu.dev/growatt/v1/plant/list
```

> El middleware mapea `/growatt/<path>` a `https://openapi.growatt.com/<path>`. Tú solo tienes que usar la ruta documentada de Growatt (que siempre empieza con `/v1/…`).

---

## 3. Formato de peticiones y respuestas

- Todas las peticiones documentadas aquí son **`GET`** con parámetros en la query string. Growatt OpenAPI v1 también tiene endpoints `POST` (telemetría detallada de MIN/SPH, escritura de parámetros), pero el middleware solo permite `GET` para `/growatt/*` — un `POST` devuelve `HTTP 405`.
- Todas las respuestas son JSON (aunque Growatt envíe `Content-Type: text/html;charset=UTF-8`, ver §6.2) con estos campos comunes:

  | Campo | Tipo | Descripción |
  |---|---|---|
  | `error_code` | number | `0` = éxito. Valor ≠ 0 indica un error de negocio. |
  | `error_msg` | string | Mensaje humano del error. Vacío cuando `error_code == 0`. |
  | `data` | object \| string | Payload de la respuesta. En error suele venir como string vacío `""`. |

- **Un `error_code` distinto de `0` no suele ser un error HTTP**: Growatt contesta `HTTP 200` con `error_code != 0` y un `error_msg` describiendo el problema (por ejemplo permisos, plant_id inexistente, rate limit upstream).

Códigos de respuesta que verás con frecuencia:

| `error_code` | Significado |
|---|---|
| `0` | OK |
| `10001` | Error de sistema (error genérico upstream). |
| `10002` | La planta no existe. |
| `10003` | `plant_id` está vacío o mal formado. |
| `10004` | Formato de fecha incorrecto o fuera de rango (`start_date`/`end_date`). |
| `10011` | Permiso denegado (el recurso no pertenece a la cuenta o el dispositivo no es del tipo esperado). |
| `10012` | `error_frequently_access` — rate limit **upstream** (Growatt). Espera unos minutos antes de reintentar. |

---

## 4. IDs de ejemplo para empezar

**No son secretos**, pero sí deben descubrirse dinámicamente en producción. Para arrancar rápido puedes usar estos mientras construyes tu integración:

| Recurso | Valor de ejemplo (ficticio) | ¿De dónde sale? |
|---|---|---|
| `plant_id` | `1234567` | Lo retorna `GET /v1/plant/list` (campo `data.plants[].plant_id`). |
| `plant_id` alterno | `7654321` | Ídem. |
| `device_sn` | `ABC1234567` | Lo retorna `GET /v1/device/list?plant_id=<plant_id>` (campo `data.devices[].device_sn`). |

> Los valores de arriba son **ilustrativos**. Sustitúyelos por los IDs reales que obtengas de las peticiones de descubrimiento antes de integrarlos en tu app.

> **Importante:** tu integración real **no debe hardcodear estos IDs**. Siempre descubre los `plant_id` / `device_sn` llamando a `/v1/plant/list` y `/v1/device/list` al inicio, y úsalos en las peticiones siguientes.

---

## 5. Formato de fechas

Growatt OpenAPI v1 solo usa fechas en string `"YYYY-MM-DD"` para los campos `date`, `start_date` y `end_date`. No hay timestamps en segundos en esta API.

Ventanas permitidas en `/v1/plant/energy` según `time_unit`:

| `time_unit` | Ventana máxima | Ejemplo |
|---|---|---|
| `day` | 7 días | `start_date=2026-04-12 end_date=2026-04-18 time_unit=day` |
| `month` | dentro del mismo año o el anterior | `start_date=2026-01-01 end_date=2026-04-01 time_unit=month` |
| `year` | 20 años | `start_date=2020-01-01 end_date=2026-01-01 time_unit=year` |

Si te pasas del rango, Growatt responde `error_code: 10004 Time format is incorrect`.

---

## 6. Quirks importantes de Growatt

### 6.1 Respuestas comprimidas con Brotli

Growatt devuelve algunas respuestas (notablemente **`/v1/plant/list`**) con `Content-Encoding: br` (Brotli). El middleware hoy no hace la descompresión por ti, así que **tu cliente debe saber manejar Brotli** o puedes forzar que no venga comprimido:

```bash
# Opción A — curl con soporte brotli (macOS/Linux modernos):
curl --compressed -H "Authorization: tk_XXX..." \
  "https://techos.thetribu.dev/growatt/v1/plant/list"

# Opción B — Python decodificando a mano si el body no parsea como JSON:
```

```python
import httpx, brotli, json

r = httpx.get(
    "https://techos.thetribu.dev/growatt/v1/plant/list",
    headers={"Authorization": "tk_XXX..."},
)
try:
    data = r.json()
except ValueError:
    data = json.loads(brotli.decompress(r.content))
```

Los navegadores y librerías modernas (`fetch`, `axios`, `requests` con `brotli` instalado) lo manejan transparentemente.

### 6.2 `Content-Type: text/html;charset=UTF-8`

Aunque la respuesta sea JSON, Growatt la etiqueta como `text/html`. Si tu cliente decide cómo parsear según el `Content-Type`, fuérzalo a JSON manualmente (`response.json()`, `JSON.parse(await r.text())`, etc.).

### 6.3 Rate limit upstream (`error_code: 10012`)

Además del rate limit **del middleware** (60 req/min por tu API key, ver §7), Growatt tiene su propio rate limit por cuenta/token. Cuando lo superas, **cualquier** endpoint responde:

```json
{"error_msg":"error_frequently_access","data":"","error_code":10012}
```

Observado en nuestras pruebas: puede bloquear la cuenta por **varios minutos** tras una ráfaga de peticiones. Buenas prácticas:

- Cachea resultados que cambian lento (`plant/list`, `plant/details`, `device/list`).
- Respeta >30 s entre polls de un mismo plant (`plant/data`, `plant/power`). Los datos upstream solo refrescan cada ~5 min.
- Si ves `10012`, espera 60 s antes de reintentar.

### 6.4 `status` de plantas y dispositivos

- Planta (`plants[].status`): normalmente `1` (operando) o `4` (offline / dato viejo).
- Dispositivo (`devices[].status`): `0` offline, `1` normal, `2` esperando/otro, `3` fallo.

---

## 7. Rate limiting del middleware

Cada API key de equipo tiene un límite de **60 peticiones por minuto** (ventana deslizante). Si lo superas, recibirás `HTTP 429` con:

```json
{
  "error": "rate_limited",
  "message": "Rate limit exceeded. This API key is blocked for 180 seconds.",
  "retry_after_seconds": 180,
  "blocked_until": "2026-04-18T05:45:00Z"
}
```

Además el header `Retry-After` indica cuántos segundos esperar antes de reintentar. Durante el bloqueo **todas** las peticiones con esa key devuelven 429.

Recomendaciones:

- Cachea los resultados de `/v1/plant/list`, `/v1/plant/details` y `/v1/device/list` (cambian poco).
- Usa `sleep` o backoff exponencial ante un 429 (middleware) o `10012` (upstream Growatt).
- Evita polling agresivo de `plant/power` (cada 5 min es el refresh real upstream).

---

## 8. Índice de endpoints

| Grupo | Archivo | Endpoints |
|---|---|---|
| Plantas (plant) | [`01-plant.md`](./01-plant.md) | 5 |
| Dispositivos (device) | [`02-device.md`](./02-device.md) | 1 |
| Inversor específico (MIN/TLX, SPH/MIX) | [`03-inverter.md`](./03-inverter.md) | 3 |

**Flujo sugerido para empezar:**

1. `GET /v1/plant/list` → descubre los `plant_id` visibles con tu token.
2. `GET /v1/plant/details?plant_id=…` → metadata (ubicación, potencia pico, dataloggers).
3. `GET /v1/plant/data?plant_id=…` → métricas agregadas en vivo (potencia actual, energía del día/mes/año).
4. `GET /v1/device/list?plant_id=…` → cruza la planta con sus dispositivos (`device_sn`, `type`, `status`).
5. A partir de ahí, usa `plant/power` (288 puntos de 5 min / día) y `plant/energy` (resumen por `day|month|year`) para telemetría histórica. Si un dispositivo es `type=7` (MIN/TLX) o `type=5` (SPH/MIX), también tienes los endpoints de [`03-inverter.md`](./03-inverter.md).

---

## 9. Smoke-test rápido (script listo para correr)

### Estado observado (2026-04-18)

- `docs/api/growatt/smoke_test.sh` ejecutado con key de equipo.
- Resultado observado: **7 OK · 2 WARN · 0 FAIL**.
- WARN esperados en `tlx_data_info` y `mix_data_info` con `error_code=10011` cuando el `device_sn` seleccionado no corresponde al tipo requerido.
- Revalidado en corrida MVP de alineación backend/frontend: mismo resultado (**estable**).

Si quieres verificar en un solo comando que **los 9 endpoints GET documentados** responden correctamente con tu API key, usa el script incluido en esta carpeta:

```bash
export TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
bash docs/api/growatt/smoke_test.sh
```

O en una sola línea:

```bash
TEAM_KEY="tk_XXX..." bash docs/api/growatt/smoke_test.sh
```

Lo que hace:

- Llama a `plant/list` y elige automáticamente una planta (la de mayor `peak_power` con `status=1`) y un `device_sn` para las llamadas subsiguientes.
- Itera los 9 endpoints GET (Plant, Device, Inverter) con pausas entre llamadas para no pegarle al rate limit de Growatt.
- Imprime por cada uno el `HTTP status`, el `error_code` upstream y los primeros 500 caracteres del body.
- Al final muestra un resumen `OK / WARN / FAIL`.

Opcionalmente puedes sobreescribir la planta/inversor de prueba:

```bash
TEAM_KEY="tk_XXX..." PLANT_ID=1234567 DEVICE_SN="ABC1234567" \
  bash docs/api/growatt/smoke_test.sh
```

**Importante:**

- El script **no hardcodea la API key**. Si falta `TEAM_KEY` o no empieza con `tk_`, aborta antes de hacer cualquier petición para evitar fugas.
- El script decomprime Brotli automáticamente si tu `python3` tiene el módulo `brotli`; si no, cae a `curl --compressed` para intentar que curl lo haga. Si ninguna de las dos cosas funciona, verás el body crudo en la salida — en ese caso consulta §6.1.
