# 02 · Plantas (`station`)

Endpoints para listar plantas solares, consultar su telemetría actual e histórica, y revisar alertas.

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/deye"
STATION_ID=40760   # obtenido de /v1.0/station/list
```

Índice:

1. [`/v1.0/station/list`](#1-post-v10stationlist) — descubrir plantas
2. [`/v1.0/station/listWithDevice`](#2-post-v10stationlistwithdevice) — plantas + dispositivos
3. [`/v1.0/station/device`](#3-post-v10stationdevice) — dispositivos de una planta
4. [`/v1.0/station/latest`](#4-post-v10stationlatest) — telemetría instantánea
5. [`/v1.0/station/history`](#5-post-v10stationhistory) — generación/consumo agregado por día
6. [`/v1.0/station/history/power`](#6-post-v10stationhistorypower) — serie de potencia en una ventana
7. [`/v1.0/station/alertList`](#7-post-v10stationalertlist) — alertas de la planta

---

## 1. `POST /v1.0/station/list`

Lista las plantas a las que tu cuenta tiene acceso. **Este es el endpoint de descubrimiento**: todo `stationId` que uses en otros endpoints debe venir de aquí.

### Request

```json
{ "page": 1, "size": 20 }
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `page` | number | sí | Página, empieza en 1. |
| `size` | number | sí | Tamaño de página. Recomendado ≤ 50. |

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/station/list" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"page":1,"size":20}'
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "f16a6ab4f4546fb9",
  "total": 3,
  "stationList": [
    {
      "id": 40760,
      "name": "Planta Demo 1",
      "locationLat": 4.82,
      "locationLng": -75.79,
      "locationAddress": "Dirección ejemplo",
      "regionNationId": 50,
      "regionTimezone": "America/Bogota",
      "gridInterconnectionType": "BATTERY_BACKUP",
      "installedCapacity": 5.8,
      "startOperatingTime": 1724681815.0,
      "createdDate": 1724682144.0,
      "batterySOC": null,
      "connectionStatus": "NORMAL",
      "generationPower": 0.0,
      "lastUpdateTime": 1776490767.0,
      "contactPhone": "",
      "ownerName": null
    }
  ]
}
```

### Campos clave

| Campo | Descripción |
|---|---|
| `total` | Total de plantas disponibles (para paginar). |
| `stationList[].id` | **`stationId`**. Úsalo en los demás endpoints. |
| `stationList[].name` | Nombre humano de la planta. |
| `stationList[].installedCapacity` | Capacidad instalada en kW. |
| `stationList[].gridInterconnectionType` | Tipo de interconexión (`BATTERY_BACKUP`, `GRID_TIE`, etc.). |
| `stationList[].connectionStatus` | `NORMAL`, `ALL_OFFLINE`, `PART_OFFLINE`, etc. |
| `stationList[].generationPower` | Potencia actual en W (es un snapshot de la última actualización). |
| `stationList[].batterySOC` | Estado de carga de la batería en % (puede ser `null` si no reporta). |
| `stationList[].lastUpdateTime` | Última actualización (segundos epoch). |

---

## 2. `POST /v1.0/station/listWithDevice`

Igual que `station/list`, pero cada planta trae además sus dispositivos (colectores e inversores). **Este es el endpoint recomendado para descubrir `deviceSn`** de cada planta.

### Request

```json
{ "page": 1, "size": 20 }
```

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/station/listWithDevice" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"page":1,"size":20}'
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "c049fd4a78007c2a",
  "stationTotal": 2,
  "stationList": [
    {
      "id": 40760,
      "name": "Planta Demo 1",
      "type": "HOUSE_ROOF",
      "gridInterconnectionType": "BATTERY_BACKUP",
      "installedCapacity": 5.8,
      "regionTimezone": "America/Bogota",
      "deviceTotal": 2,
      "deviceListItems": [
        {
          "deviceSn": "COLL-XXXXXXXX",
          "deviceId": 4096218,
          "deviceType": "COLLECTOR",
          "connectStatus": 1,
          "collectionTime": 1776490430,
          "productId": "0_D0002_18",
          "stationId": 40760
        },
        {
          "deviceSn": "2402010117",
          "deviceId": 4096504,
          "deviceType": "INVERTER",
          "connectStatus": 1,
          "collectionTime": 1776490430,
          "productId": "0_5407_1",
          "stationId": 40760
        }
      ]
    }
  ]
}
```

### Campos clave

| Campo | Descripción |
|---|---|
| `stationList[].deviceListItems[]` | Array de dispositivos de la planta. |
| `deviceListItems[].deviceSn` | **`deviceSn`**. Úsalo en `/device/*`. |
| `deviceListItems[].deviceType` | `INVERTER` (inversor) o `COLLECTOR` (logger/datalogger). Para telemetría de energía suele interesarte el `INVERTER`. |
| `deviceListItems[].connectStatus` | `1` = online, `0` = offline. |
| `deviceListItems[].productId` | Identificador de modelo interno de Deye. |

> **Patrón típico:** primero `/station/listWithDevice`, luego filtra `deviceType == "INVERTER"` para quedarte con los `deviceSn` con los que harás telemetría.

---

## 3. `POST /v1.0/station/device`

Lista solo los dispositivos de una (o varias) planta(s) específica(s). Alternativa a `listWithDevice` cuando ya sabes qué planta te interesa.

### Request

```json
{ "page": 1, "size": 10, "stationIds": [40760] }
```

| Campo | Tipo | Notas |
|---|---|---|
| `stationIds` | array<number> | Uno o varios `stationId`. Si pasas un ID que no pertenece a tu cuenta, recibirás `code: "2101023"` (acceso denegado). |

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/station/device" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"page":1,"size":10,"stationIds":[40760]}'
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "8365da79ee5fceb9",
  "total": 2,
  "deviceListItems": [
    { "deviceSn": "COLL-XXXXXXXX", "deviceId": 4096218, "deviceType": "COLLECTOR", "connectStatus": 1, "collectionTime": 1776490430, "productId": "0_D0002_18", "stationId": 40760 },
    { "deviceSn": "2402010117",    "deviceId": 4096504, "deviceType": "INVERTER",  "connectStatus": 1, "collectionTime": 1776490430, "productId": "0_5407_1",  "stationId": 40760 }
  ]
}
```

---

## 4. `POST /v1.0/station/latest`

Telemetría instantánea (último snapshot) de una planta: potencia de generación, consumo, batería, etc.

### Request

```json
{ "stationId": 40760 }
```

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/station/latest" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationId\":$STATION_ID}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "ba5619850680d8f2",
  "generationPower": 1250.0,
  "consumptionPower": 800.0,
  "gridPower": null,
  "purchasePower": null,
  "wirePower": 0.0,
  "chargePower": null,
  "dischargePower": null,
  "batteryPower": 0.0,
  "batterySOC": null,
  "irradiateIntensity": null,
  "lastUpdateTime": 1776491104.0
}
```

### Campos

| Campo | Unidad | Descripción |
|---|---|---|
| `generationPower` | W | Potencia generada por paneles. |
| `consumptionPower` | W | Potencia consumida por la casa/planta. |
| `wirePower` | W | Potencia por el ramal principal (según topología). |
| `batteryPower` | W | Potencia de/hacia la batería (positiva = carga, negativa = descarga, según modelo). |
| `batterySOC` | % | Estado de carga actual. |
| `chargePower` / `dischargePower` | W | Potencia específica de carga/descarga (algunos modelos). |
| `gridPower` / `purchasePower` | W | Potencia hacia/desde la red. |
| `irradiateIntensity` | W/m² | Irradiancia (solo si el sitio tiene piranómetro). |
| `lastUpdateTime` | epoch s | Última lectura del inversor. |

> Varios campos pueden venir `null` dependiendo del tipo de instalación. No asumas que todos están presentes.

---

## 5. `POST /v1.0/station/history`

Serie temporal agregada de la planta (por día, mes o año). Útil para dashboards de generación histórica.

### Request

```json
{
  "stationId": 40760,
  "granularity": 2,
  "startAt": "2026-04-17",
  "endAt": "2026-04-18"
}
```

| Campo | Valores | Descripción |
|---|---|---|
| `granularity` | `1` / `2` / `3` | `1` = por hora, `2` = por día, `3` = por mes. |
| `startAt`, `endAt` | `"YYYY-MM-DD"` | Rango inclusivo. Si `granularity == 3` usa `"YYYY-MM"`. |

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/station/history" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationId\":$STATION_ID,\"granularity\":2,\"startAt\":\"2026-04-17\",\"endAt\":\"2026-04-18\"}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "9edc0493985d1bea",
  "total": 1,
  "stationDataItems": [
    {
      "generationValue": 21.1,
      "consumptionValue": 0.9,
      "gridValue": 20.2,
      "purchaseValue": 0.0,
      "chargeValue": 0.0,
      "dischargeValue": 0.0,
      "generationRatio": 4.27,
      "gridRatio": 95.73,
      "chargeRatio": 0.0,
      "purchaseRatio": 0.0,
      "consumptionDischargeRatio": 0.0,
      "fullPowerHours": 3.64,
      "irradiate": null,
      "theoreticalGeneration": null,
      "pr": null,
      "cpr": null,
      "year": 2026, "month": 4, "day": 17,
      "timeStamp": null
    }
  ]
}
```

### Campos

| Campo | Unidad | Descripción |
|---|---|---|
| `generationValue` | kWh | Energía generada en el periodo. |
| `consumptionValue` | kWh | Energía consumida. |
| `gridValue` | kWh | Energía intercambiada con la red. |
| `purchaseValue` | kWh | Energía comprada a la red. |
| `chargeValue` / `dischargeValue` | kWh | Energía entregada/extraída a/de la batería. |
| `generationRatio`, `gridRatio`, `chargeRatio`, `purchaseRatio` | % | Participaciones porcentuales en el mix. |
| `fullPowerHours` | h | Horas equivalentes a potencia nominal. |
| `year` / `month` / `day` | number | Marcador temporal del bucket. |

---

## 6. `POST /v1.0/station/history/power`

Serie temporal de **potencia** (no energía) en una ventana arbitraria. Ideal para graficar curvas de generación/consumo intradía.

### Request

```json
{
  "stationId": 40760,
  "startTimestamp": 1776404792,
  "endTimestamp":   1776491192
}
```

| Campo | Formato | Notas |
|---|---|---|
| `startTimestamp`, `endTimestamp` | **segundos** epoch | Ventana ≤ 12 meses. Si pasas milisegundos verás `"should be <=12months"`. |

### Ejemplo

```bash
NOW_S=$(date +%s); DAY_AGO_S=$(( NOW_S - 86400 ))

curl -X POST "$BASE/v1.0/station/history/power" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationId\":$STATION_ID,\"startTimestamp\":$DAY_AGO_S,\"endTimestamp\":$NOW_S}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "d49699d233ac9d0e",
  "total": 258,
  "stationDataItems": [
    {
      "generationPower": 0.0,
      "consumptionPower": 0.0,
      "wirePower": 0.0,
      "batteryPower": 0.0,
      "gridPower": null,
      "purchasePower": null,
      "chargePower": null,
      "dischargePower": null,
      "batterySOC": null,
      "irradiateIntensity": null,
      "timeStamp": 1776404927
    }
  ]
}
```

- `total` = número de puntos retornados.
- Cada item dentro de `stationDataItems` es un snapshot de potencia con su `timeStamp` (segundos epoch).

---

## 7. `POST /v1.0/station/alertList`

Alertas/alarmas a nivel de planta en un rango de tiempo.

### Request

```json
{
  "stationId": 40760,
  "startTimestamp": 1776404792,
  "endTimestamp":   1776491192,
  "page": 1,
  "size": 10
}
```

> Ventana ≤ 180 días. `startTimestamp`/`endTimestamp` en **segundos** epoch.

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/station/alertList" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationId\":$STATION_ID,\"startTimestamp\":$DAY_AGO_S,\"endTimestamp\":$NOW_S,\"page\":1,\"size\":10}"
```

### Respuesta (mock) — sin alertas

```json
{
  "code": "1000000", "success": true, "requestId": "2f41a4aad4ff290a",
  "total": 0,
  "stationAlertItems": []
}
```

### Respuesta (mock) — con alertas

```json
{
  "code": "1000000", "success": true, "requestId": "2f41a4aad4ff290a",
  "total": 1,
  "stationAlertItems": [
    {
      "alertId": "ALERT-XXXX",
      "alertCode": "E013",
      "alertLevel": "WARN",
      "alertMsg": "Battery low voltage",
      "deviceSn": "2402010117",
      "stationId": 40760,
      "startTimestamp": 1776440000,
      "endTimestamp": 1776444000,
      "status": "CLEARED"
    }
  ]
}
```

> La forma exacta de cada alerta puede variar según firmware. Los campos más estables son `alertLevel`, `alertMsg`, `deviceSn`, `startTimestamp`, `status`.
