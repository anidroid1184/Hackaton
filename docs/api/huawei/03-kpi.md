# 03 · KPI histórico (`kpi`)

Series temporales agregadas por planta o por dispositivo. Útil para dashboards de evolución diaria/mensual/anual y análisis de rendimiento.

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/huawei"
STATION_CODE="NE=12345678"
DEV_ID=1000000012345678
DEV_TYPE_ID=1

NOW_MS=$(($(date +%s) * 1000))
```

> Recordatorio: `collectTime`, `startTime` y `endTime` están en **milisegundos** desde epoch. Pasar segundos devuelve `success:true` pero `data: []`.

Índice:

**Planta (4 endpoints):**

1. [`POST /thirdData/getKpiStationHour`](#1-post-thirddatagetkpistationhour) — buckets de 1 hora (día en curso)
2. [`POST /thirdData/getKpiStationDay`](#2-post-thirddatagetkpistationday) — buckets de 1 día (mes en curso)
3. [`POST /thirdData/getKpiStationMonth`](#3-post-thirddatagetkpistationmonth) — buckets de 1 mes (año en curso)
4. [`POST /thirdData/getKpiStationYear`](#4-post-thirddatagetkpistationyear) — buckets de 1 año (histórico total)

**Dispositivo (3 endpoints):**

5. [`POST /thirdData/getDevKpiDay`](#5-post-thirddatagetdevkpiday) — buckets de 1 día (mes en curso)
6. [`POST /thirdData/getDevKpiMonth`](#6-post-thirddatagetdevkpimonth) — buckets de 1 mes (año en curso)
7. [`POST /thirdData/getDevKpiYear`](#7-post-thirddatagetdevkpiyear) — buckets de 1 año (histórico total)

**Serie de alta resolución (1 endpoint):**

8. [`POST /thirdData/getDevHistoryKpi`](#8-post-thirddatagetdevhistorykpi) — buckets de 5 min (ventana ≤ 3 días)

---

## Patrón común

Todos estos endpoints siguen la misma estructura:

- Envías un `stationCodes` / `devIds` + un `collectTime` (o un rango `startTime`/`endTime`) en **ms**.
- Huawei devuelve un `data: []` con puntos ordenados cronológicamente, cada uno con su propio `collectTime` (ms) y `dataItemMap` de métricas.
- Los campos que Huawei no pudo calcular para ese bucket (hora sin sol, día futuro, mes sin datos, dispositivo offline) vienen como `null`. **Tu cliente debe tolerar `null`**.

---

## 1. `POST /thirdData/getKpiStationHour`

Buckets **horarios** del día al que pertenece `collectTime`. Normalmente devuelve hasta 24 puntos (uno por hora).

### Request

```json
{
  "stationCodes": "NE=12345678",
  "collectTime": 1776503706197
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `stationCodes` | string | sí | Uno o varios `plantCode` separados por coma. |
| `collectTime` | number | sí | Cualquier timestamp (ms) **del día** que quieras consultar. Huawei lo normaliza al inicio del día. |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getKpiStationHour" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "message": null,
  "params": {
    "currentTime": 1776503710996,
    "collectTime": 1776503705000,
    "stationCodes": "NE=12345678"
  },
  "data": [
    {
      "stationCode": "NE=12345678",
      "collectTime": 1776488400000,
      "dataItemMap": {
        "radiation_intensity": 542.3,
        "theory_power": 5.12,
        "inverter_power": 4.89,
        "ongrid_power": 4.45,
        "PVYield": 4.89,
        "inverterYield": 4.89,
        "power_profit": 1222.5,
        "chargeCap": null,
        "dischargeCap": null,
        "selfProvide": 0.44
      }
    },
    {
      "stationCode": "NE=12345678",
      "collectTime": 1776492000000,
      "dataItemMap": {
        "radiation_intensity": 612.7,
        "theory_power": 5.88,
        "inverter_power": 5.42,
        "ongrid_power": 4.93,
        "PVYield": 5.42,
        "inverterYield": 5.42,
        "power_profit": 1355.0,
        "chargeCap": null,
        "dischargeCap": null,
        "selfProvide": 0.49
      }
    }
  ]
}
```

### Campos (por bucket)

| Campo | Unidad | Descripción |
|---|---|---|
| `collectTime` | ms epoch | Inicio de la hora (xx:00). |
| `radiation_intensity` | W/m² | Irradiancia solar (solo si hay EMI `devTypeId=47`). |
| `theory_power` | kWh | Energía teórica ideal según irradiancia. |
| `inverter_power` / `PVYield` / `inverterYield` | kWh | Energía generada en esta hora (valores equivalentes). |
| `ongrid_power` | kWh | Energía exportada a la red. |
| `selfProvide` | kWh | Energía autoconsumida (si hay medidor). |
| `chargeCap` / `dischargeCap` | kWh | Carga/descarga de batería (solo si hay batería `devTypeId=38`). |
| `power_profit` | moneda local | Ingreso estimado. |

> Si consultas una hora que aún no ha ocurrido o antes del amanecer, **todos** los campos vienen `null`.

---

## 2. `POST /thirdData/getKpiStationDay`

Buckets **diarios** del mes al que pertenece `collectTime`. Devuelve hasta 31 puntos (uno por día).

### Request

```json
{
  "stationCodes": "NE=12345678",
  "collectTime": 1776503706197
}
```

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getKpiStationDay" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
```

### Respuesta (mock, bucket con datos)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "stationCode": "NE=12345678",
      "collectTime": 1775019600000,
      "dataItemMap": {
        "installed_capacity": 40.0,
        "inverter_power": 196.45,
        "inverterYield": 196.45,
        "PVYield": 196.45,
        "perpower_ratio": 4.911,
        "power_profit": 300.71,
        "reduction_total_co2": 0.093,
        "reduction_total_coal": 0.079,
        "reduction_total_tree": 0.127
      }
    }
  ]
}
```

### Campos adicionales respecto a `Hour`

| Campo | Unidad | Descripción |
|---|---|---|
| `installed_capacity` | kW | Capacidad instalada de la planta. |
| `perpower_ratio` | kWh/kWp | Productividad específica (yield por kW instalado). |
| `reduction_total_co2` | ton | CO₂ evitado (estimación). |
| `reduction_total_coal` | ton | Carbón equivalente evitado. |
| `reduction_total_tree` | unidades | Árboles equivalentes. |

---

## 3. `POST /thirdData/getKpiStationMonth`

Buckets **mensuales** del año al que pertenece `collectTime`. Hasta 12 puntos.

### Request y ejemplo

Idénticos a `getKpiStationDay`. Huawei normaliza `collectTime` al inicio del mes.

```bash
curl -X POST "$BASE/thirdData/getKpiStationMonth" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "stationCode": "NE=12345678",
      "collectTime": 1767243600000,
      "dataItemMap": {
        "installed_capacity": 40.0,
        "inverter_power": 5420.11,
        "inverterYield": 5420.11,
        "PVYield": 5420.11,
        "perpower_ratio": 135.5,
        "power_profit": 8301.25,
        "reduction_total_co2": 2.56,
        "reduction_total_coal": 2.17,
        "reduction_total_tree": 3.49
      }
    }
  ]
}
```

Mismos campos que `Day` pero agregados al mes completo.

---

## 4. `POST /thirdData/getKpiStationYear`

Buckets **anuales** desde `gridConnectionDate` de la planta. Un punto por año.

### Request y ejemplo

```bash
curl -X POST "$BASE/thirdData/getKpiStationYear" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "stationCode": "NE=12345678",
      "collectTime": 1672549200000,
      "dataItemMap": {
        "installed_capacity": 40.0,
        "PVYield": 62810.22,
        "inverterYield": 62810.22,
        "inverter_power": 62810.22,
        "ongrid_power": 56987.11,
        "power_profit": 96204.12,
        "reduction_total_co2": 29.72
      }
    }
  ]
}
```

> Para años anteriores a que la planta existiera, `dataItemMap` viene con todos los campos `null`.

---

## 5. `POST /thirdData/getDevKpiDay`

Igual que `getKpiStationDay` pero a nivel de **dispositivo** (inversor, batería). Devuelve buckets diarios del mes en curso.

### Request

```json
{
  "devIds": "1000000012345678",
  "devTypeId": 1,
  "collectTime": 1776503706197
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `devIds` | string | sí | Uno o varios `devId` separados por coma. **Mismos requisitos que `/getDevRealKpi`**: todos deben tener el mismo `devTypeId`. |
| `devTypeId` | number | sí | Tipo de los dispositivos. |
| `collectTime` | number | sí | Timestamp (ms) del mes a consultar. |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getDevKpiDay" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"collectTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "collectTime": 1775019600000,
      "dataItemMap": {
        "installed_capacity": 20.0,
        "product_power": 99.31,
        "perpower_ratio": 4.966
      }
    }
  ]
}
```

### Campos

| Campo | Unidad | Descripción |
|---|---|---|
| `installed_capacity` | kW | Capacidad instalada del inversor. |
| `product_power` | kWh | Energía generada en el día. |
| `perpower_ratio` | kWh/kWp | Yield específico del inversor. |

---

## 6. `POST /thirdData/getDevKpiMonth`

Buckets mensuales por dispositivo. Hasta 12 puntos.

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getDevKpiMonth" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"collectTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "collectTime": 1767243600000,
      "dataItemMap": {
        "installed_capacity": 20.0,
        "product_power": 2440.71,
        "perpower_ratio": 122.036
      }
    }
  ]
}
```

Mismos campos que `getDevKpiDay` agregados al mes completo.

---

## 7. `POST /thirdData/getDevKpiYear`

Buckets anuales por dispositivo, desde la puesta en servicio del inversor.

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getDevKpiYear" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"collectTime\":$NOW_MS}"
```

### Respuesta (mock, año con datos parciales)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "collectTime": 1672549200000,
      "dataItemMap": {
        "installed_capacity": 20.0,
        "product_power": 31200.5,
        "perpower_ratio": 1560.03
      }
    },
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "collectTime": 1609477200000,
      "dataItemMap": {
        "installed_capacity": null,
        "product_power": null,
        "perpower_ratio": null
      }
    }
  ]
}
```

> Años anteriores a la puesta en servicio devuelven `null`s en todo el `dataItemMap`. Fíltralos si los mostrás en tu UI.

---

## 8. `POST /thirdData/getDevHistoryKpi`

Serie temporal **de alta resolución (buckets de 5 minutos)** a nivel de dispositivo. Ideal para gráficas intradía detalladas, debugging y detección de paradas.

### Request

```json
{
  "devIds": "1000000012345678",
  "devTypeId": 1,
  "startTime": 1776417305000,
  "endTime":   1776503705000
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `devIds` | string | sí | Uno o varios `devId` separados por coma, mismo `devTypeId`. |
| `devTypeId` | number | sí | Tipo de los dispositivos. Generalmente `1` (inversor). |
| `startTime` | number | sí | Inicio de la ventana, en **ms** epoch. |
| `endTime` | number | sí | Fin de la ventana, en **ms** epoch. |

**Restricciones críticas de la ventana:**

- `endTime - startTime` **debe ser ≤ 3 días** (259 200 000 ms). Si pides más, Huawei recorta silenciosamente y sólo te devuelve los últimos 3 días (sin error visible).
- Si `startTime > endTime`, `data: []` y `failCode: 0`.
- Si la ventana es del futuro o antes de la puesta en servicio, `data: []` y `failCode: 0`.

### Ejemplo (últimas 24 h)

```bash
DAY_AGO_MS=$(( NOW_MS - 86400000 ))
curl -X POST "$BASE/thirdData/getDevHistoryKpi" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"startTime\":$DAY_AGO_MS,\"endTime\":$NOW_MS}"
```

### Respuesta (mock)

```json
{
  "success": true,
  "failCode": 0,
  "message": null,
  "params": {
    "currentTime": 1776503728075,
    "devIds": "1000000012345678",
    "startTime": 1776417305000,
    "endTime": 1776503705000,
    "devTypeId": 1
  },
  "data": [
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "collectTime": 1776430800000,
      "dataItemMap": {
        "active_power": 4.235,
        "efficiency": 98.2,
        "temperature": 42.1,
        "elec_freq": 60.01,
        "mppt_power": 4.30,
        "a_u": 127.3,
        "b_u": 127.1,
        "c_u": 127.4,
        "a_i": 11.1,
        "b_i": 11.0,
        "c_i": 11.1
      }
    },
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "collectTime": 1776431100000,
      "dataItemMap": {
        "active_power": 4.410,
        "efficiency": 98.3,
        "temperature": 42.4,
        "mppt_power": 4.48
      }
    }
  ]
}
```

### Respuesta cuando no hay datos (noche completa)

```json
{
  "success": true,
  "failCode": 0,
  "params": { "devIds": "1000000012345678", "startTime": 1776330000000, "endTime": 1776416400000, "devTypeId": 1 },
  "data": []
}
```

### Campos por punto

Mismos campos que `/getDevRealKpi` (ver [`02-device.md`](./02-device.md)) pero restringidos a las métricas que Huawei persiste históricamente:

| Campo | Unidad | Descripción |
|---|---|---|
| `active_power` | kW | Potencia activa en ese instante. |
| `mppt_power` | kW | Potencia DC total. |
| `efficiency` | % | Eficiencia del inversor. |
| `temperature` | °C | Temperatura interna. |
| `elec_freq` | Hz | Frecuencia de red. |
| `a_u`, `b_u`, `c_u` | V | Tensiones de fase. |
| `a_i`, `b_i`, `c_i` | A | Corrientes de fase. |

### Recomendaciones

- Para ventanas > 3 días, parte en bloques de 72 h y llama varias veces. Entre calls, `sleep 1` para no disparar `failCode=407`.
- El bucket es de 5 min → 24 h = 288 puntos, 3 días = 864 puntos. No es una API pensada para "stream"; usa `/getDevRealKpi` si necesitas tiempo real.
- De noche `data: []` es normal: el inversor está apagado y no reporta. No es un error.
