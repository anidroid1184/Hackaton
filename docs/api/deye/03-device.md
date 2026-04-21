# 03 · Dispositivos (`device`)

Endpoints para consultar telemetría y alertas a nivel de dispositivo individual (inversor, colector, etc.).

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/deye"
DEVICE_SN="2402010117"   # obtenido de /v1.0/station/listWithDevice
```

> **Para descubrir `deviceSn`**, usa `POST /v1.0/station/listWithDevice` o `POST /v1.0/station/device` (ver `02-station.md`). Normalmente te interesan los items con `deviceType == "INVERTER"`.

Índice:

1. [`/v1.0/device/latest`](#1-post-v10devicelatest) — snapshot instantáneo del dispositivo
2. [`/v1.0/device/history`](#2-post-v10devicehistory) — serie histórica por puntos de medida
3. [`/v1.0/device/historyRaw`](#3-post-v10devicehistoryraw) — serie cruda de alta resolución
4. [`/v1.0/device/alertList`](#4-post-v10devicealertlist) — alertas del dispositivo
5. [`/v1.0/device/measurePoints`](#5-post-v10devicemeasurepoints) — catálogo de métricas soportadas
6. [`/v1.0/device/list`](#6-post-v10devicelist-no-recomendado) — **no recomendado**, ver nota

---

## 1. `POST /v1.0/device/latest`

Último snapshot completo de uno o varios dispositivos, con todas sus métricas en un solo arreglo `dataList`.

### Request

```json
{ "deviceList": ["2402010117"] }
```

| Campo | Tipo | Notas |
|---|---|---|
| `deviceList` | array<string> | Uno o varios `deviceSn`. El array puede tener múltiples SNs; cada uno vendrá como un item en `deviceDataList`. |

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/device/latest" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceList\":[\"$DEVICE_SN\"]}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "d15e13127e2ac9d8",
  "deviceDataList": [
    {
      "deviceSn": "2402010117",
      "deviceType": "INVERTER",
      "deviceState": 1,
      "collectionTime": 1776491104,
      "dataList": [
        { "key": "RatedPower",                "value": "6000.00",  "unit": "W"   },
        { "key": "TotalActiveProduction",     "value": "12538.20", "unit": "kWh" },
        { "key": "DailyActiveProduction",     "value": "0.00",     "unit": "kWh" },
        { "key": "CumulativeGridFeedIn",      "value": "11352.50", "unit": "kWh" },
        { "key": "CumulativeEnergyPurchased", "value": "740.40",   "unit": "kWh" },
        { "key": "DailyGridFeedIn",           "value": "0.00",     "unit": "kWh" },
        { "key": "DailyEnergyPurchased",      "value": "0.00",     "unit": "kWh" },
        { "key": "BatteryVoltage",            "value": "50.20",    "unit": "V"   },
        { "key": "BatteryCurrent",            "value": "-0.01",    "unit": "A"   },
        { "key": "BatteryPower",              "value": "0",        "unit": "W"   },
        { "key": "SOC",                       "value": "80",       "unit": "%"   },
        { "key": "DCVoltagePV1",              "value": "0.90",     "unit": "V"   },
        { "key": "DCCurrentPV1",              "value": "0.10",     "unit": "A"   },
        { "key": "DCPowerPV1",                "value": "0",        "unit": "W"   },
        { "key": "TotalDCInputPower",         "value": "0.00",     "unit": "W"   },
        { "key": "ACVoltageRUA",              "value": "120.30",   "unit": "V"   },
        { "key": "ACCurrentRUA",              "value": "0.10",     "unit": "A"   },
        { "key": "ACOutputFrequencyR",        "value": "60.02",    "unit": "Hz"  },
        { "key": "GridFrequency",             "value": "60.02",    "unit": "Hz"  },
        { "key": "TotalGridPower",            "value": "0",        "unit": "W"   },
        { "key": "TotalConsumptionPower",     "value": "0",        "unit": "W"   },
        { "key": "DC Temperature",            "value": "25.20",    "unit": "℃"   },
        { "key": "AC Temperature",            "value": "24.70",    "unit": "℃"   },
        { "key": "Temperature- Battery",      "value": "25.00",    "unit": "℃"   }
      ]
    }
  ]
}
```

> La lista `dataList` puede tener **40+ puntos** por inversor. Para saber qué `key` están disponibles en un dispositivo específico, usa `/v1.0/device/measurePoints` (punto 5).

### Campos

| Campo | Descripción |
|---|---|
| `deviceDataList[]` | Un item por cada `deviceSn` solicitado. |
| `deviceDataList[].deviceState` | `1` = online, `0` = offline. |
| `deviceDataList[].collectionTime` | Segundos epoch del último reporte. |
| `deviceDataList[].dataList[]` | Métricas en formato `{key, value, unit}`. `value` es **string** (pársealo a número según el caso de uso). |

---

## 2. `POST /v1.0/device/history`

Serie histórica de métricas específicas con granularidad **por día** o **por hora** (agregada).

### Request

```json
{
  "deviceSn": "2402010117",
  "granularity": 1,
  "startAt": "2026-04-17",
  "endAt": "2026-04-18",
  "measurePoints": ["SOC"]
}
```

| Campo | Valores | Descripción |
|---|---|---|
| `granularity` | `1` / `2` | `1` = por minuto/punto-crudo, `2` = agregado por día. |
| `startAt`, `endAt` | `"YYYY-MM-DD"` | Rango inclusivo. |
| `measurePoints` | array<string> | Las métricas a consultar (ver `/measurePoints`). **Solo permitido cuando `granularity == 1`.** Si `granularity == 2` debe omitirse o ser `null`. |

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/device/history" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\",\"granularity\":1,\"startAt\":\"2026-04-17\",\"endAt\":\"2026-04-18\",\"measurePoints\":[\"SOC\"]}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "b73defd68339ecb5",
  "deviceSn": "2402010117",
  "deviceId": 4096504,
  "deviceType": "INVERTER",
  "granularity": 1,
  "dataList": [
    { "time": "1776402217", "itemList": [ { "key": "SOC", "value": "80", "unit": "%" } ] },
    { "time": "1776402520", "itemList": [ { "key": "SOC", "value": "80", "unit": "%" } ] },
    { "time": "1776402561", "itemList": [ { "key": "SOC", "value": "79", "unit": "%" } ] }
  ]
}
```

- `dataList[].time` viene como **string** con segundos epoch. Parséalo a número antes de usarlo.
- Cada `itemList` es el vector de medidas solicitadas en ese instante.

### Errores comunes

| `code` | Causa |
|---|---|
| `2101006 · "if granularity != 1，measurePoints should be null"` | Pasaste `measurePoints` con `granularity == 2`. |
| `2101006 · "measurePoints cannot be null"` | Pediste `granularity == 1` sin `measurePoints`. |

---

## 3. `POST /v1.0/device/historyRaw`

Serie **cruda** de alta resolución (cada reporte del inversor) en una ventana corta. Útil cuando necesitas ver variaciones intradía con máximo detalle.

### Request

```json
{
  "deviceSn": "2402010117",
  "startTimestamp": 1776404792,
  "endTimestamp":   1776491192,
  "measurePoints":  ["SOC"]
}
```

| Campo | Formato | Notas |
|---|---|---|
| `startTimestamp`, `endTimestamp` | **segundos** epoch | Ventana ≤ 5 días. |
| `measurePoints` | array<string> | Requerido. |

### Ejemplo

```bash
NOW_S=$(date +%s); DAY_AGO_S=$(( NOW_S - 86400 ))

curl -X POST "$BASE/v1.0/device/historyRaw" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\",\"startTimestamp\":$DAY_AGO_S,\"endTimestamp\":$NOW_S,\"measurePoints\":[\"SOC\"]}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "16224fb3efdfe866",
  "deviceSn": "2402010117",
  "deviceId": 4096504,
  "deviceType": "INVERTER",
  "dataList": [
    { "time": "1776404927", "itemList": [ { "key": "SOC", "value": "80", "unit": "%" } ] },
    { "time": "1776405264", "itemList": [ { "key": "SOC", "value": "80", "unit": "%" } ] }
  ]
}
```

### Errores comunes

| `code` | Causa |
|---|---|
| `2101006 · "startTimestamp and endTimestamp should be within 5 days"` | Ventana > 5 días, o timestamps en milisegundos. |
| `2101006 · "measurePoints cannot be null"` | Olvidaste `measurePoints`. |

---

## 4. `POST /v1.0/device/alertList`

Alertas a nivel de dispositivo en una ventana de tiempo. Similar a `/station/alertList` pero más granular.

### Request

```json
{
  "deviceSn": "2402010117",
  "startTimestamp": 1776404792,
  "endTimestamp":   1776491192,
  "page": 1,
  "size": 10
}
```

> Ventana ≤ 30 días. `startTimestamp`/`endTimestamp` en **segundos** epoch.

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/device/alertList" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\",\"startTimestamp\":$DAY_AGO_S,\"endTimestamp\":$NOW_S,\"page\":1,\"size\":10}"
```

### Respuesta (mock) — sin alertas

```json
{
  "code": "1000000", "success": true, "requestId": "69d3f287244c636e",
  "deviceSn": "2402010117",
  "deviceId": 4096504,
  "deviceType": "INVERTER",
  "total": 0,
  "alertList": []
}
```

### Respuesta (mock) — con alertas

```json
{
  "code": "1000000", "success": true, "requestId": "69d3f287244c636e",
  "deviceSn": "2402010117",
  "deviceType": "INVERTER",
  "total": 1,
  "alertList": [
    {
      "alertId": "ALERT-YYYY",
      "alertCode": "E010",
      "alertLevel": "ERROR",
      "alertMsg": "Grid voltage out of range",
      "startTimestamp": 1776410000,
      "endTimestamp": 1776410500,
      "status": "CLEARED"
    }
  ]
}
```

---

## 5. `POST /v1.0/device/measurePoints`

Devuelve el **catálogo de métricas** soportadas por un dispositivo. Úsalo antes de construir queries de `/device/history` o `/device/historyRaw` para saber qué `measurePoints` son válidos en ese inversor específico.

### Request

```json
{ "deviceSn": "2402010117" }
```

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/device/measurePoints" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\"}"
```

### Respuesta (mock, abreviada)

```json
{
  "code": "1000000", "success": true, "requestId": "f0a4e0132515d255",
  "deviceSn": "2402010117",
  "deviceType": "INVERTER",
  "productId": "0_5407_1",
  "timeZone": "America/Bogota",
  "measurePoints": [
    "RatedPower",
    "TotalActiveProduction",
    "DailyActiveProduction",
    "CumulativeGridFeedIn",
    "CumulativeEnergyPurchased",
    "CumulativeConsumption",
    "SOC",
    "TotalChargeEnergy",
    "TotalDischargeEnergy",
    "DCVoltagePV1", "DCCurrentPV1", "DCPowerPV1",
    "ACVoltageRUA", "ACCurrentRUA", "ACOutputFrequencyR",
    "GridFrequency", "GridVoltageL1L2", "GridCurrentL1L2",
    "BatteryVoltage", "BatteryCurrent", "BatteryPower",
    "DC Temperature", "AC Temperature", "Temperature- Battery"
  ]
}
```

> Un inversor real puede exponer 40+ puntos. El catálogo varía según firmware y hardware. Cachea esta respuesta (cambia muy poco).

---

## 6. `POST /v1.0/device/list` (no recomendado)

El endpoint existe en la API de Deye, pero en este entorno **responde `HTTP 200` con `code: "2101019"` ("auth invalid token")**, mientras que `/v1.0/station/list` y `/v1.0/station/listWithDevice` funcionan correctamente con la misma credencial.

**Recomendación:** no uses `/device/list`. Para descubrir dispositivos:

- `POST /v1.0/station/listWithDevice` → trae todos los dispositivos de todas las plantas de una vez.
- `POST /v1.0/station/device` con `stationIds` → si ya sabes qué plantas te interesan.

Ambos retornan la información que necesitas (`deviceSn`, `deviceType`, `connectStatus`, `productId`).
