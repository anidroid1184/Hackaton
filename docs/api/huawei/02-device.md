# 02 · Dispositivos (`device`)

Endpoints para listar los dispositivos de una planta (inversores, baterías, medidores, dongles) y leer su telemetría instantánea.

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/huawei"
STATION_CODE="NE=12345678"         # obtenido de /thirdData/stations
DEV_ID=1000000012345678             # obtenido de /thirdData/getDevList
DEV_TYPE_ID=1                       # 1 = inversor string
```

Índice:

1. [`POST /thirdData/getDevList`](#1-post-thirddatagetdevlist) — dispositivos de una planta
2. [`POST /thirdData/getDevRealKpi`](#2-post-thirddatagetdevrealkpi) — telemetría instantánea por inversor

---

## 1. `POST /thirdData/getDevList`

Lista los dispositivos físicos asociados a una (o varias) planta(s): inversores, baterías, medidores, optimizadores, dongles de comunicaciones, etc.

### Request

```json
{ "stationCodes": "NE=12345678" }
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `stationCodes` | string | sí | Uno o varios `plantCode` separados por coma. |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getDevList" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"stationCodes\":\"$STATION_CODE\"}"
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
      "id": 1000000012345678,
      "devDn": "NE=12345678",
      "devName": "Inverter-1",
      "devTypeId": 1,
      "esnCode": "ES21XXXXXXXX",
      "invType": "SUN2000-20KTL-M3",
      "model": "SUN2000-20KTL-M3",
      "softwareVersion": "V100R001C20SPC122",
      "optimizerNumber": 0,
      "stationCode": "NE=12345678",
      "latitude": 4.711754,
      "longitude": -75.919234
    },
    {
      "id": 1000000012345679,
      "devDn": "NE=12345679",
      "devName": "Inverter-2",
      "devTypeId": 1,
      "esnCode": "ES21YYYYYYYY",
      "invType": "SUN2000-20KTL-M3",
      "model": "SUN2000-20KTL-M3",
      "softwareVersion": "V100R001C20SPC122",
      "optimizerNumber": 0,
      "stationCode": "NE=12345678",
      "latitude": 4.711754,
      "longitude": -75.919234
    },
    {
      "id": 1000000012345680,
      "devDn": "NE=12345680",
      "devName": "Dongle-1",
      "devTypeId": 62,
      "esnCode": "BT21ZZZZZZZZ",
      "invType": null,
      "model": "SDongleA-05",
      "softwareVersion": "V100R001C00SPC127",
      "optimizerNumber": null,
      "stationCode": "NE=12345678",
      "latitude": 4.711754,
      "longitude": -75.919234
    }
  ]
}
```

### Campos clave

| Campo | Descripción |
|---|---|
| `id` | **`devId`**. Úsalo en `/getDevRealKpi` y `/getDevKpi*`. |
| `devTypeId` | Tipo de dispositivo (ver tabla abajo). **Debes pasarlo junto con `devId`** en endpoints de KPI. |
| `devName` | Nombre asignado en el portal (`Inverter-1`, `Battery-1`, `Dongle-1`…). |
| `esnCode` | Serial Hardware. Identificador físico del equipo. |
| `invType` / `model` | Modelo comercial (`SUN2000-20KTL-M3`, `LUNA2000-5-S0`, `SDongleA-05`, etc.). |
| `softwareVersion` | Firmware instalado. Útil para reportes de incidencias. |
| `optimizerNumber` | Nº de optimizadores (si los hay). `0` o `null` = no hay optimizadores. |
| `latitude` / `longitude` | Coordenadas del dispositivo (normalmente idénticas a la planta). |

### Tabla de `devTypeId`

| `devTypeId` | Tipo | Telemetría energética relevante | Endpoints útiles |
|---:|---|:---:|---|
| `1` | Inversor string (residencial/comercial) | sí | `getDevRealKpi`, `getDevKpi*`, `getDevHistoryKpi` |
| `38` | Batería residencial (LUNA2000) | sí | `getDevRealKpi`, `getDevKpi*` |
| `39` | Medidor (Smart Power Sensor / DTSU666) | sí | `getDevRealKpi` |
| `46` | Optimizador a nivel de panel (MERC-…) | parcial | `getDevRealKpi` |
| `47` | EMI (sensor medioambiental: irradiancia + temperatura) | sí | `getDevRealKpi` |
| `62` | Dongle de comunicaciones (SDongleA-…) | **no** | Ninguno (no genera KPIs). |
| `63` | PID (Potential Induced Degradation) | parcial | `getDevRealKpi` |

> Para obtener datos de generación filtra por `devTypeId == 1` (inversor). Los demás (dongle, PID…) no devuelven telemetría en KPI.

---

## 2. `POST /thirdData/getDevRealKpi`

Telemetría **instantánea** (último snapshot) de uno o varios dispositivos. Es el endpoint más rico: ~150 campos por inversor con tensiones/corrientes de cada string (MPPT), fases AC, frecuencia, eficiencia, potencia y estado.

### Request

```json
{
  "devIds": "1000000012345678",
  "devTypeId": 1
}
```

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `devIds` | string | sí | Uno o varios `devId` separados por coma. **Todos deben ser del mismo `devTypeId`**. |
| `devTypeId` | number | sí | Tipo de los dispositivos que envías. Mezclar tipos devuelve `failCode=20003`. |

### Ejemplo

```bash
curl -X POST "$BASE/thirdData/getDevRealKpi" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID}"
```

Varios inversores a la vez:

```bash
curl -X POST "$BASE/thirdData/getDevRealKpi" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d '{"devIds":"1000000012345678,1000000012345679","devTypeId":1}'
```

### Respuesta (mock) — inversor generando de día

```json
{
  "success": true,
  "failCode": 0,
  "message": null,
  "params": {
    "currentTime": 1776503706197,
    "devIds": "1000000012345678",
    "devTypeId": 1
  },
  "data": [
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "dataItemMap": {
        "run_state": 1,
        "inverter_state": 512,
        "active_power": 4.235,
        "efficiency": 98.2,
        "elec_freq": 60.01,
        "power_factor": 0.999,
        "temperature": 42.1,
        "day_cap": 12.35,
        "total_cap": 43210.88,
        "open_time": 1776489000000,
        "close_time": 0,
        "a_u": 127.3,
        "b_u": 127.1,
        "c_u": 127.4,
        "ab_u": 220.1,
        "bc_u": 220.2,
        "ca_u": 220.0,
        "a_i": 11.1,
        "b_i": 11.0,
        "c_i": 11.1,
        "pv1_u": 412.5,
        "pv1_i": 5.2,
        "pv2_u": 410.8,
        "pv2_i": 5.1,
        "mppt_power": 4.30,
        "mppt_total_cap": 43112.55,
        "mppt_1_cap": 21456.12,
        "mppt_2_cap": 21656.43
      }
    }
  ]
}
```

### Respuesta (mock) — inversor apagado (de noche)

```json
{
  "success": true,
  "failCode": 0,
  "data": [
    {
      "devId": 1000000012345678,
      "sn": "ES21XXXXXXXX",
      "dataItemMap": {
        "run_state": 0,
        "inverter_state": null,
        "active_power": null,
        "efficiency": null,
        "a_u": null,
        "b_u": null,
        "pv1_u": null,
        "pv1_i": null
      }
    }
  ]
}
```

> **Casi todos los campos pueden venir `null`** cuando el inversor está offline o apagado (`run_state=0`). Siempre comprueba `null` antes de usar un valor.

### Campos clave (inversor, `devTypeId=1`)

#### Estado

| Campo | Tipo | Descripción |
|---|---|---|
| `run_state` | enum | `0` = apagado, `1` = encendido, `2` = desconectado. |
| `inverter_state` | bitmask | Estado detallado del inversor. Valores comunes: `512` = generando, `513` = de guardia, `768` = alarma. |
| `open_time` | ms epoch | Momento en que el inversor arrancó (amaneció). |
| `close_time` | ms epoch | Momento en que se apagó (atardeció). `0` mientras está activo. |

#### Potencia y energía

| Campo | Unidad | Descripción |
|---|---|---|
| `active_power` | kW | Potencia activa actual. |
| `efficiency` | % | Eficiencia instantánea de conversión DC→AC. |
| `power_factor` | adimensional | Factor de potencia (1.0 = ideal). |
| `elec_freq` | Hz | Frecuencia de red detectada (50/60 según país). |
| `temperature` | °C | Temperatura interna del inversor. |
| `day_cap` | kWh | Energía generada hoy. |
| `total_cap` | kWh | Energía total acumulada desde instalación. |
| `mppt_power` | kW | Potencia total entregada por los MPPT (lado DC). |
| `mppt_total_cap` | kWh | Energía DC total. |
| `mppt_N_cap` | kWh | Energía acumulada del MPPT `N` (1..10). |

#### AC (red)

| Campo | Unidad | Descripción |
|---|---|---|
| `a_u`, `b_u`, `c_u` | V | Tensión fase-neutro de las 3 fases. |
| `ab_u`, `bc_u`, `ca_u` | V | Tensión fase-fase. |
| `a_i`, `b_i`, `c_i` | A | Corriente de cada fase. |

#### DC (paneles)

| Campo | Unidad | Descripción |
|---|---|---|
| `pv1_u` ... `pv36_u` | V | Tensión de cada string (hasta 36 strings). |
| `pv1_i` ... `pv36_i` | A | Corriente de cada string. |

> El número real de strings disponibles depende del modelo. Un SUN2000-20KTL-M3 suele reportar `pv1..pv10` y el resto vendrá como `null`.

### Patrón típico de uso

1. Llama `/thirdData/getDevList` con tu `stationCode` y filtra `devTypeId == 1` para quedarte con los inversores.
2. Construye un string `devIds` concatenando los `id` con coma: `"1000000012345678,1000000012345679"`.
3. Llama `/thirdData/getDevRealKpi` con `devTypeId: 1` y ese `devIds`.
4. Para cada elemento de `data[]`, usa `active_power` (potencia actual) y `day_cap` (energía del día). El resto de campos son para diagnóstico detallado.
