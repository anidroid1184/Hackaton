# 04 · Alarmas (`alarm`)

Consulta del histórico de alarmas generadas por los dispositivos de una o varias plantas.

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/huawei"
STATION_CODE="NE=12345678"

NOW_MS=$(($(date +%s) * 1000))
WEEK_AGO_MS=$(( NOW_MS - 7*86400000 ))
```

Índice:

1. [`POST /thirdData/getAlarmList`](#1-post-thirddatagetalarmlist) — histórico de alarmas por planta y ventana

---

## 1. `POST /thirdData/getAlarmList`

Devuelve las alarmas activas e históricas de una o varias plantas en una ventana temporal. Cubre todo tipo de dispositivo (inversor, batería, dongle, medidor, etc.).

### Request

```json
{
  "stationCodes": "NE=12345678",
  "beginTime": 1775898905000,
  "endTime":   1776503705000
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `stationCodes` | string | sí | Uno o varios `plantCode` separados por coma. |
| `beginTime` | number | sí | Inicio de la ventana, en **ms** epoch. |
| `endTime` | number | sí | Fin de la ventana, en **ms** epoch. |

**Restricciones:**

- `endTime - beginTime` **debe ser ≤ 7 días** (604 800 000 ms). Si pides más, Huawei recorta a los últimos 7 días.
- El orden de las alarmas no está garantizado; ordena por `raiseTime` en tu cliente si lo necesitas.

### Ejemplo (últimos 7 días)

```bash
curl -X POST "$BASE/thirdData/getAlarmList" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\",\"beginTime\":$WEEK_AGO_MS,\"endTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "message": null,
  "params": {
    "currentTime": 1776503730502,
    "beginTime": 1775898905000,
    "endTime": 1776503705000,
    "stationCodes": "NE=12345678"
  },
  "data": [
    {
      "alarmId": 999999999,
      "alarmName": "Network Connection Error",
      "alarmCause": "The server has not received the network connection request from the device.",
      "alarmType": 0,
      "causeId": -1,
      "devName": "Dongle-1",
      "devTypeId": 62,
      "esnCode": "BT21ZZZZZZZZ",
      "lev": 2,
      "raiseTime": 1776297439042,
      "repairSuggestion": "1. Check whether the device is powered on and running properly.\n2. Check whether the network connection configuration has been modified on the device.\n3. If the device is running properly and the network connection configuration has not been modified, wait for 15 minutes, and then log in to the app to check whether the network connection is restored.",
      "stationCode": "NE=12345678",
      "stationName": "Planta Demo 1",
      "status": 1
    }
  ]
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `alarmId` | number | Identificador único de la alarma dentro de Huawei. |
| `alarmName` | string | Nombre corto de la alarma (en inglés). |
| `alarmCause` | string | Descripción detallada de la causa raíz. |
| `alarmType` | number | Categoría interna: `0` = comunicaciones, `1` = dispositivo, `2` = ambiental, `3` = otros. |
| `causeId` | number | ID numérico de la causa. `-1` si no aplica. |
| `lev` | number | **Severidad**: `1` = crítica, `2` = mayor, `3` = menor, `4` = advertencia. |
| `status` | number | **Estado**: `1` = activa, `2` = resuelta, `3` = confirmada, `4` = pendiente. |
| `raiseTime` | ms epoch | Instante en que se disparó la alarma. |
| `devName` | string | Nombre del dispositivo que generó la alarma. |
| `devTypeId` | number | Tipo de dispositivo (ver tabla en [`02-device.md`](./02-device.md)). |
| `esnCode` | string | Serial hardware del dispositivo. |
| `stationCode` | string | `plantCode` donde ocurrió. |
| `stationName` | string | Nombre legible de la planta. |
| `repairSuggestion` | string | Instrucciones sugeridas para resolver la alarma (multi-línea, en inglés). |

### Tabla de severidad (`lev`)

| `lev` | Severidad | Acción sugerida |
|---:|---|---|
| `1` | Crítica | Planta sin generación, contactar mantenimiento inmediato. |
| `2` | Mayor | Afecta producción (p. ej. dongle desconectado). Revisar en el día. |
| `3` | Menor | Degradación menor (p. ej. un string con baja corriente). |
| `4` | Aviso / informativo | Cambio de estado, no requiere acción. |

### Tabla de estado (`status`)

| `status` | Significado |
|---:|---|
| `1` | Activa (aún presente). |
| `2` | Resuelta automáticamente por el sistema. |
| `3` | Confirmada / reconocida por un operador. |
| `4` | Pendiente de clasificar. |

### Respuesta cuando no hay alarmas

```json
{
  "success": true,
  "failCode": 0,
  "data": []
}
```

### Patrón típico de uso

1. Una vez al día, consulta `/thirdData/getAlarmList` con ventana de 24 h (`beginTime = now - 86400000`) por cada `stationCode`.
2. Filtra por `status == 1` (activas) y `lev <= 2` (críticas/mayores) para generar avisos al equipo.
3. Agrupa por `stationCode` + `devName` para evitar spam (varias alarmas del mismo dispositivo).
4. Usa `alarmId` como clave de deduplicación: si ya notificaste esa `alarmId`, no lo vuelvas a hacer hasta que cambie `status`.

> Como `alarmName`, `alarmCause` y `repairSuggestion` vienen en **inglés**, si tu UI es en español considera un diccionario de traducción para las alarmas más comunes (`Network Connection Error`, `String Current Abnormal`, `Grid Voltage Abnormal`, etc.).
