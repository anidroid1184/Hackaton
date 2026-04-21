# API Deye — Guía para equipos participantes

Esta carpeta documenta los endpoints de DeyeCloud disponibles para los equipos del hackathon. Cada archivo cubre un grupo de endpoints con su método, ruta, body esperado, ejemplo de `curl` y un ejemplo de respuesta con datos **mock** (solo para mostrar la forma del JSON; los valores reales cambian en cada llamada).

---

## 1. Autenticación

Todas las peticiones requieren el header `Authorization` con tu **API key de equipo** (`tk_…`):

```
Authorization: tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Si el header falta o la key es inválida, la respuesta será `401 Unauthorized`.

> Nunca publiques tu `tk_…` en repos, Discord, screenshots ni `.env` comiteados. Si se filtra, avisa a los organizadores para rotarla.

---

## 2. Base URL

```
https://techos.thetribu.dev/deye
```

Todas las rutas que aparecen en esta guía se concatenan a esa base. Ejemplo:

```
POST https://techos.thetribu.dev/deye/v1.0/station/list
```

---

## 3. Formato de peticiones y respuestas

- Todas las peticiones son `POST` con `Content-Type: application/json`, excepto `/v1.0/order/{id}` que es `GET`.
- Todas las respuestas son JSON con estos campos comunes:

  | Campo | Tipo | Descripción |
  |---|---|---|
  | `code` | string | Código de resultado. `"1000000"` = éxito. |
  | `msg` | string | Mensaje humano del resultado. |
  | `success` | boolean | `true` si `code == "1000000"`. |
  | `requestId` | string | ID de la petición (útil para reportar incidencias). |

- **Códigos no-`1000000` no necesariamente son errores HTTP**. Deye suele devolver `HTTP 200` con `success: false` y un `code` que indica el problema (por ejemplo, validación de parámetros).

Códigos de respuesta que verás con frecuencia:

| `code` | Significado |
|---|---|
| `1000000` | OK |
| `2101006` | Error de validación de parámetros (falta un campo, ventana de tiempo fuera de rango, etc.) |
| `2101016` | El dispositivo no ha subido datos todavía (SN desconocido o sin reportes) |
| `2101019` | Token inválido (ver nota en `03-device.md` sobre `/device/list`) |
| `2101023` | Acceso denegado (el recurso no pertenece a tu cuenta) |
| `2101043` | `orderId` no válido |
| `2106001` | El `config point` no está soportado por este inversor |

---

## 4. IDs de ejemplo para empezar

**No son secretos**, pero sí deben descubrirse dinámicamente en producción. Para arrancar rápido puedes usar estos mientras construyes tu integración:

| Recurso | Valor de ejemplo | ¿De dónde sale? |
|---|---|---|
| `stationId` | `40760`, `122825`, `155158` | Los retorna `POST /v1.0/station/list` (campo `stationList[].id`). |
| `deviceSn` (inversor) | `2402010117` | Lo retorna `POST /v1.0/station/listWithDevice` o `POST /v1.0/station/device` (campo `deviceListItems[].deviceSn` donde `deviceType == "INVERTER"`). |
| `companyId` | `10386610` | Lo retorna `POST /v1.0/account/info` (campo `orgInfoList[0].companyId`). |

> **Importante:** tu integración real **no debe hardcodear estos IDs**. Siempre descubre los `stationId` / `deviceSn` llamando a `/station/list` y `/station/listWithDevice` al inicio, y úsalos en las peticiones siguientes.

---

## 5. Formato de fechas y timestamps

Algunos endpoints piden fechas como **string** (`"YYYY-MM-DD"`) y otros como **timestamp numérico**. Presta atención porque se mezclan:

| Campo | Formato | Ejemplo | Notas |
|---|---|---|---|
| `startAt`, `endAt` | string `"YYYY-MM-DD"` | `"2026-04-17"` | Usado en `/station/history` y `/device/history`. |
| `startTimestamp`, `endTimestamp` | **segundos** desde epoch (Unix) | `1744156800` | Usado en `/station/history/power`, `/station/alertList`, `/device/historyRaw`, `/device/alertList`. |

> Si pasas milisegundos donde Deye espera segundos, verás errores como `"startTimestamp-endTimestamp should be <=12months"` o `"should not exceed 30 days"`. Siempre usa segundos para los campos `Timestamp`.

Ventanas máximas permitidas:

- `/station/history/power` → ≤ 12 meses
- `/station/alertList` → ≤ 180 días
- `/device/alertList` → ≤ 30 días
- `/device/historyRaw` → ≤ 5 días

---

## 6. Rate limiting

Cada API key tiene un límite de **60 peticiones por minuto** (ventana deslizante). Si lo superas, recibirás `HTTP 429` con:

```json
{
  "error": "rate_limited",
  "message": "Too many requests",
  "retry_after_seconds": 180,
  "blocked_until": "2026-04-18T05:45:00Z"
}
```

Además el header `Retry-After` indica cuántos segundos esperar antes de reintentar. Durante el bloqueo **todas** las peticiones con esa key devuelven 429.

Recomendaciones:

- Cachea los resultados de `/station/list` y `/station/listWithDevice` (cambian poco).
- Usa `sleep` o backoff exponencial ante un 429.
- Evita polling agresivo de `/station/latest` y `/device/latest` (< 1 llamada cada 30 s por estación suele ser suficiente).

---

## 7. Índice de endpoints

| Grupo | Archivo | Endpoints |
|---|---|---|
| Cuenta | [`01-account.md`](./01-account.md) | 1 |
| Plantas (station) | [`02-station.md`](./02-station.md) | 7 |
| Dispositivos (device) | [`03-device.md`](./03-device.md) | 6 |
| Configuración (config) | [`04-config.md`](./04-config.md) | 3 |
| Órdenes (order) | [`05-order.md`](./05-order.md) | 1 |

**Flujo sugerido para empezar:**

1. `POST /v1.0/account/info` → confirma que tu key funciona y obtén `companyId`.
2. `POST /v1.0/station/list` → descubre las `stationId` que tienes visibles.
3. `POST /v1.0/station/listWithDevice` → cruza cada estación con sus dispositivos (`deviceSn`).
4. A partir de ahí usa los endpoints de telemetría (`/station/latest`, `/station/history`, `/device/latest`, etc.) con los IDs que obtuviste.

---

## 8. Smoke-test rápido (script listo para correr)

### Estado observado (2026-04-18)

- `docs/api/deye/smoke_test.sh` ejecutado con key de equipo.
- Resultado observado: **5 OK · 9 WARN · 4 FAIL**.
- FAIL actuales: `POST /v1.0/station/latest`, `POST /v1.0/station/history`, `POST /v1.0/station/history/power`, `POST /v1.0/station/alertList` con `HTTP 502` y detalle `Provider 'deye' authentication failed after token refresh`.
- Esto apunta a incidencia upstream/middleware (no contrato local del script).
- Revalidado en corrida MVP de alineación backend/frontend: persiste el mismo patrón de 4 FAIL (incidencia externa).

Si quieres verificar en un solo comando que **los 18 endpoints de lectura** responden correctamente con tu API key, usa el script incluido en esta carpeta:

```bash
export TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
bash docs/api/deye/smoke_test.sh
```

O en una sola línea:

```bash
TEAM_KEY="tk_XXX..." bash docs/api/deye/smoke_test.sh
```

Lo que hace:

- Llama a los 18 endpoints de lectura (Account, Station, Device, Config, Order).
- Imprime por cada uno el `HTTP status`, el `code` upstream y los primeros 500 caracteres del body.
- Al final muestra un resumen `OK / WARN / FAIL`.

Opcionalmente puedes sobreescribir la planta/inversor de prueba:

```bash
TEAM_KEY="tk_XXX..." STATION_ID=122825 DEVICE_SN="2503293234" \
  bash docs/api/deye/smoke_test.sh
```

**Importante:** el script **no hardcodea la API key**. Si falta `TEAM_KEY` o no empieza con `tk_`, aborta antes de hacer cualquier petición para evitar fugas.
