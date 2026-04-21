# API Huawei FusionSolar — Guía para equipos participantes

Esta carpeta documenta los endpoints de **Huawei FusionSolar Northbound API (`/thirdData/*`)** disponibles para los equipos del hackathon. Cada archivo cubre un grupo de endpoints con su método, ruta, body esperado, ejemplo de `curl` y un ejemplo de respuesta **anonimizada** (los `plantCode`, `devId`, nombres y coordenadas que verás son valores ilustrativos; la forma del JSON sí es la real).

---

## 1. Autenticación

Todas las peticiones requieren el header `Authorization` con tu **API key de equipo** (`tk_…`):

```
Authorization: tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Si el header falta o la key es inválida, la respuesta será `401 Unauthorized`.

> Nunca publiques tu `tk_…` en repos, Discord, screenshots ni `.env` comiteados. Si se filtra, avisa a los organizadores para rotarla.

El token real de Huawei (header `XSRF-TOKEN: …`) lo inyecta el middleware automáticamente. Tu equipo **nunca** ve el token upstream: el middleware hace login contra `/thirdData/login`, refresca cada 20 min para evitar el timeout de 30 min por inactividad, y reintenta de forma transparente si Huawei devuelve un `failCode=305` (token caducado).

---

## 2. Base URL

```
https://techos.thetribu.dev/huawei
```

Todas las rutas que aparecen en esta guía se concatenan a esa base. Ejemplo:

```
POST https://techos.thetribu.dev/huawei/thirdData/stations
```

> El middleware mapea `/huawei/<path>` a `https://la5.fusionsolar.huawei.com/<path>` (región Latam). Tú solo tienes que usar la ruta documentada de Huawei (que siempre empieza con `/thirdData/…`).

---

## 3. Formato de peticiones y respuestas

- **Todas** las peticiones documentadas aquí son `POST` con `Content-Type: application/json`. Huawei no acepta `GET` en `/thirdData/*`, y el middleware tampoco.
- Todas las respuestas son JSON con estos campos comunes:

  | Campo | Tipo | Descripción |
  |---|---|---|
  | `success` | boolean | `true` si la petición fue aceptada upstream. |
  | `failCode` | number | `0` = éxito. Valor ≠ 0 indica un error de negocio. |
  | `message` | string\|null | Mensaje humano del error (o `null` cuando `success:true`). |
  | `data` | object\|array | Payload de la respuesta. |
  | `params` | object | Echo de los parámetros enviados + `currentTime` del servidor. Útil para depurar. |

- **Un `failCode` distinto de `0` no suele ser un error HTTP**: Huawei casi siempre contesta `HTTP 200` con `success:false` y un `failCode` describiendo el problema.

Códigos de respuesta que verás con frecuencia:

| `failCode` | Significado |
|---|---|
| `0` | OK. |
| `305` | Token upstream caducado. **Transparente para tu equipo**: el middleware ya refresca y reintenta. Si lo ves, probablemente falló el refresh y el middleware devolverá `502` en su lugar. |
| `407` | `ACCESS_FREQUENCY_IS_TOO_HIGH` — rate limit **upstream** por cuenta. Huawei limita el endpoint de login y algunos reads a ~10 peticiones/hora. Espera 10 min antes de reintentar. |
| `20003` | Parámetro inválido (p. ej. `collectTime` fuera de rango o `devTypeId` incorrecto). |
| `20400` | Conflicto de sesión (otra sesión activa de la misma cuenta). Transparente — el middleware hace logout+retry. |
| `30005` | Error de validación (p. ej. `pageSize is null` en `getStationList`). |

Además, algunos errores de validación devuelven **`HTTP 400`** con un cuerpo distinto al envelope estándar:

```json
{
  "exceptionId": "framwork.remote.Paramerror",
  "exceptionType": "ROA_EXFRAME_EXCEPTION",
  "reasonArgs": ["pageSize must be greater than or equal to 50"]
}
```

---

## 4. IDs de ejemplo para empezar

**No son secretos**, pero sí deben descubrirse dinámicamente en producción. Para arrancar rápido puedes usar estos mientras construyes tu integración:

| Recurso | Valor de ejemplo | ¿De dónde sale? |
|---|---|---|
| `plantCode` / `stationCode` | `NE=33685734` | `POST /thirdData/stations` (campo `data.list[].plantCode`) o `POST /thirdData/getStationList` (campo `data.list[].stationCode`). Mismo valor, distinto nombre de campo. |
| `devId` (inversor) | `1000000033685719` | `POST /thirdData/getDevList` (campo `data[].id`). |
| `devTypeId` | `1` (inversor string) | `POST /thirdData/getDevList` (campo `data[].devTypeId`). |

> **Importante:** tu integración real **no debe hardcodear estos IDs**. Siempre descubre los `plantCode` / `devId` llamando a `/stations` y `/getDevList` al inicio, y úsalos en las peticiones siguientes.

### Tabla resumida de `devTypeId`

`devTypeId` identifica el tipo de dispositivo dentro de una planta. Los más comunes que verás en las cuentas de este hackathon:

| `devTypeId` | Tipo de dispositivo | Notas |
|---:|---|---|
| `1` | Inversor string (SUN2000-…KTL) | El que interesa para telemetría de energía. |
| `38` | Batería residencial (LUNA2000) | Solo si la planta tiene almacenamiento. |
| `39` | Medidor (Smart Power Sensor / DTSU666) | Para consumo/exportación. |
| `46` | Optimizador (MERC-…) | Nivel de panel individual. |
| `47` | EMI (sensor medioambiental) | Irradiancia, temperatura. |
| `62` | Dongle de comunicaciones (SDongleA-…) | No tiene telemetría energética. |
| `63` | PID (Potential Induced Degradation) | Solo plantas comerciales grandes. |

Para `getDevRealKpi`, `getDevKpi*` y `getDevHistoryKpi` **debes** pasar un `devTypeId` consistente con el `devId`. Mezclar IDs de inversor con `devTypeId=62` devolverá `failCode=20003`.

---

## 5. Formato de fechas y timestamps

> **Importante:** Huawei usa **milisegundos** desde epoch en todos los campos temporales (a diferencia de Deye que usa segundos). Pasar segundos hará que `collectTime` caiga en 1970 y obtengas `success:true` pero `data: []`.

| Campo | Formato | Ejemplo |
|---|---|---|
| `collectTime` | ms epoch | `1776503706197` |
| `startTime`, `endTime` | ms epoch | `1776417305000` |
| `beginTime`, `endTime` (alarmas) | ms epoch | `1775898905000` |
| `raiseTime` (en la respuesta) | ms epoch | `1776297439042` |

En bash:

```bash
NOW_MS=$(($(date +%s) * 1000))
DAY_AGO_MS=$(( NOW_MS - 86400000 ))
WEEK_AGO_MS=$(( NOW_MS - 7*86400000 ))
```

En Python:

```python
import time
now_ms = int(time.time() * 1000)
```

Ventanas máximas permitidas por endpoint:

| Endpoint | Ventana | Bucket |
|---|---|---|
| `getKpiStationHour` / `getDevKpiHour` | día en curso (hasta 24 puntos) | 1 hora |
| `getKpiStationDay` / `getDevKpiDay` | mes en curso (hasta 31 puntos) | 1 día |
| `getKpiStationMonth` / `getDevKpiMonth` | año en curso (hasta 12 puntos) | 1 mes |
| `getKpiStationYear` / `getDevKpiYear` | histórico (desde `gridConnectionDate`) | 1 año |
| `getDevHistoryKpi` | ≤ **3 días** | 5 minutos |
| `getAlarmList` | ≤ **7 días** por petición | — |

Si pasas una ventana mayor a `getDevHistoryKpi`, Huawei recorta silenciosamente y te devuelve sólo los últimos 3 días (sin error).

---

## 6. Quirks importantes de Huawei

### 6.1 `collectTime` en milisegundos

Ya mencionado arriba pero merece su propia sección: el síntoma de pasar segundos en lugar de milisegundos es **no recibir error**, solo `data: []` vacío. Si ves un `dataItemMap` lleno de `null`s, revisa primero tu unidad temporal.

### 6.2 `getStationList` exige `pageSize >= 50`

El endpoint legado `getStationList` devuelve `HTTP 400` con el exceptionId `framwork.remote.Paramerror` si mandas `pageSize < 50` o si omites `pageSize`. Siempre pasa un `pageSize` explícito:

```json
{ "pageNo": 1, "pageSize": 50 }
```

El endpoint moderno `stations` (v2) no tiene esta restricción.

### 6.3 Dos endpoints para listar plantas con formato distinto

| Endpoint | Campo ID | Campo nombre | Unidad capacidad |
|---|---|---|---|
| `/thirdData/stations` (v2) | `plantCode` | `plantName` | kW |
| `/thirdData/getStationList` (v1) | `stationCode` | `stationName` | MW (¡distinto!) |

El valor identificador (`NE=…`) es el mismo, pero los nombres de campo y la unidad de capacidad **cambian**. Recomendación: usa `/stations` por defecto; usa `/getStationList` solo si necesitas campos extra del envelope viejo (`aidType`, `combineType`, `linkmanPho`).

### 6.4 Rate limit upstream (`failCode=407`)

Huawei tiene un rate limit agresivo por cuenta, sobre todo en `/thirdData/login` (~10 intentos/hora). En endpoints de lectura el límite es más amplio pero también existe. Cuando lo superas:

```json
{"success":false,"failCode":407,"message":"ACCESS_FREQUENCY_IS_TOO_HIGH"}
```

**Cómo evitarlo:**
- Entre peticiones del mismo tipo, deja al menos 1 s de pausa (mira `PAUSE=1` en [`smoke_test.sh`](./smoke_test.sh)).
- Cachea localmente los resultados que cambian lento (`/stations`, `/getDevList`, `getStationRealKpi`) durante 30-60 s.
- Evita reiniciar tu integración en bucle: cada arranque hace login y consume la cuota.

### 6.5 `currentTime` en la respuesta (no en el request)

Muchas guías oficiales dicen que el request debe incluir `currentTime`. En la práctica el middleware y la cuenta Northbound actual lo **ignoran** en el request y lo devuelven en `params.currentTime` como echo del reloj del servidor. Solo lo necesitas para los endpoints de KPI histórico donde `collectTime` **sí** es obligatorio.

### 6.6 Valores `null` en `dataItemMap`

Los KPI en tiempo real (`getDevRealKpi`) devuelven ~150 campos por inversor. Muchos serán `null` cuando:
- Es de noche y el inversor está en `run_state=0`.
- El modelo no tiene ese sensor (p. ej. un SUN2000-20KTL-M3 no reporta `pv28_i`).

No asumas que un campo estará presente. Siempre comprueba `null` antes de usarlo.

### 6.7 Planta sin datos vs planta con `capacity=0`

Algunas plantas del portal tienen `capacity: 0.0` en `/stations`: son demos, plantas en construcción, o clientes sin telemetría aún. Para elegir una planta de prueba, filtra `capacity > 0`.

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

- Cachea los resultados de `/stations`, `/getStationList` y `/getDevList` (cambian poco).
- Usa `sleep` o backoff exponencial ante un 429 (middleware) o `failCode=407` (upstream Huawei).
- Evita polling agresivo de `getStationRealKpi` (cada 30-60 s es suficiente; los datos upstream refrescan cada ~5 min).

---

## 8. Índice de endpoints

| Grupo | Archivo | Endpoints |
|---|---|---|
| Plantas (station) | [`01-station.md`](./01-station.md) | 3 |
| Dispositivos (device) | [`02-device.md`](./02-device.md) | 2 |
| KPI histórico (station + device) | [`03-kpi.md`](./03-kpi.md) | 8 |
| Alarmas (alarm) | [`04-alarm.md`](./04-alarm.md) | 1 |

**Total: 14 endpoints de lectura.**

**Flujo sugerido para empezar:**

1. `POST /thirdData/stations` → confirma que tu key funciona y obtén la lista de `plantCode`.
2. `POST /thirdData/getDevList` con un `stationCode` → descubre `devId` y `devTypeId` de cada inversor.
3. `POST /thirdData/getStationRealKpi` → snapshot instantáneo (potencia actual, energía del día).
4. A partir de ahí, usa `getKpiStationHour` (curva intradía) y `getKpiStationDay` (histórico mensual) para dashboards.
5. Si necesitas granularidad de 5 min a nivel de inversor, usa `getDevHistoryKpi` (ventana ≤ 3 días).

---

## 9. Smoke-test rápido (script listo para correr)

Si quieres verificar en un solo comando que **los 14 endpoints de lectura** responden correctamente con tu API key, usa el script incluido en esta carpeta:

```bash
export TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
bash docs/api/huawei/smoke_test.sh
```

O en una sola línea:

```bash
TEAM_KEY="tk_XXX..." bash docs/api/huawei/smoke_test.sh
```

Lo que hace:

- Llama a `/stations` y elige automáticamente una planta con `capacity > 0`.
- Llama a `/getDevList` y elige automáticamente el primer inversor (`devTypeId=1`).
- Itera los 14 endpoints con `sleep 1` entre llamadas (configurable via `PAUSE=2`) para no disparar el rate limit `failCode=407`.
- Imprime por cada uno el `HTTP status`, `success`, `failCode` y los primeros 80 caracteres del `message`.
- Al final muestra un resumen `OK / WARN / FAIL`.

Opcionalmente puedes sobreescribir la planta/inversor de prueba:

```bash
TEAM_KEY="tk_XXX..." STATION_CODE="NE=33685734" DEV_ID=1000000033685719 DEV_TYPE_ID=1 \
  bash docs/api/huawei/smoke_test.sh
```

**Importante:** el script **no hardcodea la API key**. Si falta `TEAM_KEY` o no empieza con `tk_`, aborta antes de hacer cualquier petición para evitar fugas.
