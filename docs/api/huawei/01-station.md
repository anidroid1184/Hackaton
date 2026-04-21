# 01 · Plantas (`station`)

Endpoints para listar plantas solares y consultar su telemetría instantánea.

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/huawei"
STATION_CODE="NE=12345678"   # obtenido de /thirdData/stations
```

Índice:

1. [`POST /thirdData/stations`](#1-post-thirddatastations) — descubrir plantas (v2, recomendado)
2. [`POST /thirdData/getStationList`](#2-post-thirddatagetstationlist) — descubrir plantas (v1 legado)
3. [`POST /thirdData/getStationRealKpi`](#3-post-thirddatagetstationrealkpi) — KPI instantáneo por planta

---

## 1. `POST /thirdData/stations`

Lista las plantas a las que tu cuenta tiene acceso. **Este es el endpoint de descubrimiento recomendado** (v2): todo `plantCode` que uses en otros endpoints debe venir de aquí.

### Request

```json
{ "pageNo": 1 }
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `pageNo` | number | sí | Página, empieza en 1. Tamaño de página fijo (no aceptado `pageSize`). |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/stations" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"pageNo":1}'
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "message": "get plant list success",
  "params": { "pageNo": 1 },
  "data": {
    "total": 2,
    "pageNo": 1,
    "pageCount": 1,
    "list": [
      {
        "plantCode": "NE=12345678",
        "plantName": "Planta Demo 1",
        "plantAddress": "Cartago, Valle del Cauca, Colombia",
        "latitude": "4.711754",
        "longitude": "-75.919234",
        "capacity": 40.0,
        "gridConnectionDate": "2022-07-07T21:06:57-05:00",
        "contactPerson": null,
        "contactMethod": null
      },
      {
        "plantCode": "NE=87654321",
        "plantName": "Planta Demo 2",
        "plantAddress": "Cartago, Valle del Cauca, Colombia",
        "latitude": "4.705746",
        "longitude": "-75.896070",
        "capacity": 19.62,
        "gridConnectionDate": "2023-12-14T16:31:15-05:00",
        "contactPerson": null,
        "contactMethod": null
      }
    ]
  }
}
```

### Campos clave

| Campo | Descripción |
|---|---|
| `data.total` | Total de plantas disponibles (para paginar). |
| `data.list[].plantCode` | **`plantCode`**. Formato `NE=<id>`. Úsalo en los demás endpoints. |
| `data.list[].plantName` | Nombre humano de la planta. |
| `data.list[].capacity` | Capacidad instalada en **kW** (distinto de `getStationList` que usa MW). |
| `data.list[].gridConnectionDate` | Fecha de puesta en servicio (ISO 8601 con zona horaria). |
| `data.list[].latitude` / `longitude` | Coordenadas (string). |
| `data.list[].plantAddress` | Dirección legible. |

---

## 2. `POST /thirdData/getStationList`

Endpoint **legado** equivalente a `/stations`. Devuelve más metadatos administrativos pero **exige `pageSize >= 50`** y usa nombres de campo distintos. Prefiere `/stations` salvo que necesites los campos extra (`aidType`, `combineType`, `linkmanPho`).

### Request

```json
{ "pageNo": 1, "pageSize": 50 }
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `pageNo` | number | sí | Página, empieza en 1. |
| `pageSize` | number | sí | **Debe ser ≥ 50**. Si pasas un valor menor o lo omites, recibes `HTTP 400` con `exceptionId: framwork.remote.Paramerror`. |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getStationList" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"pageNo":1,"pageSize":50}'
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "message": null,
  "params": { "pageNo": 1, "pageSize": 50, "currentTime": 1776503706197 },
  "data": {
    "total": 2,
    "pageNo": 1,
    "pageCount": 1,
    "list": [
      {
        "stationCode": "NE=12345678",
        "stationName": "Planta Demo 1",
        "stationAddr": "Cartago, Valle del Cauca, Colombia",
        "capacity": 0.04,
        "aidType": 1,
        "buildState": null,
        "combineType": null,
        "stationLinkman": "",
        "linkmanPho": ""
      },
      {
        "stationCode": "NE=87654321",
        "stationName": "Planta Demo 2",
        "stationAddr": "Cartago, Valle del Cauca, Colombia",
        "capacity": 0.01962,
        "aidType": 1,
        "buildState": null,
        "combineType": null,
        "stationLinkman": "",
        "linkmanPho": ""
      }
    ]
  }
}
```

### Diferencias con `/stations`

| Aspecto | `/stations` | `/getStationList` |
|---|---|---|
| Campo ID | `plantCode` | `stationCode` |
| Campo nombre | `plantName` | `stationName` |
| Campo dirección | `plantAddress` | `stationAddr` |
| Unidad de `capacity` | **kW** (`40.0` = 40 kW) | **MW** (`0.04` = 40 kW) |
| Coordenadas | `latitude`/`longitude` (string) | no incluidas |
| Campos extra | — | `aidType`, `combineType`, `linkmanPho`, `stationLinkman` |
| `pageSize` | No aceptado | Obligatorio, ≥ 50 |

> El valor identificador (`NE=12345678`) es el mismo — solo cambia el nombre del campo que lo contiene.

---

## 3. `POST /thirdData/getStationRealKpi`

Telemetría **instantánea** (último snapshot) de una o varias plantas: potencia de generación, energía del día/mes/total, ingresos, estado general.

### Request

```json
{ "stationCodes": "NE=12345678" }
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `stationCodes` | string | sí | Uno o varios `plantCode` separados por coma (máx. 100 por petición). |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getStationRealKpi" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\"}"
```

Para consultar varias plantas en una sola llamada:

```bash
curl -X POST "$BASE/thirdData/getStationRealKpi" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"stationCodes":"NE=12345678,NE=87654321"}'
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "message": null,
  "params": {
    "currentTime": 1776503706197,
    "stationCodes": "NE=12345678"
  },
  "data": [
    {
      "stationCode": "NE=12345678",
      "dataItemMap": {
        "real_health_state": 1,
        "day_power": 12.35,
        "month_power": 845.12,
        "total_power": 43210.88,
        "day_income": 3085.0,
        "total_income": 277439.11,
        "day_on_grid_energy": 11.22,
        "day_use_energy": 1.13
      }
    }
  ]
}
```

### Campos

| Campo | Unidad | Descripción |
|---|---|---|
| `real_health_state` | enum | `1` = normal, `2` = alarma menor, `3` = alarma mayor, `0` = desconectado. |
| `day_power` | kWh | Energía generada hoy. |
| `month_power` | kWh | Energía generada en el mes en curso. |
| `total_power` | kWh | Energía total acumulada desde la puesta en servicio. |
| `day_income` | moneda local | Ingreso estimado del día (según tarifa configurada en el portal). |
| `total_income` | moneda local | Ingreso estimado total. |
| `day_on_grid_energy` | kWh | Energía exportada a la red hoy. |
| `day_use_energy` | kWh | Energía consumida en sitio hoy (solo si hay medidor `devTypeId=39`). |

> Si la planta está offline (sin comunicación), varios campos vendrán como `null` y `real_health_state` puede venir como `3` o `0`. Contempla este caso en tu cliente.
