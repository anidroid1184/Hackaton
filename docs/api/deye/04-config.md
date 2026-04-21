# 04 · Configuración (`config`)

Endpoints que devuelven la configuración actual de un dispositivo (parámetros de batería, sistema y Time-of-Use). Son **de solo lectura**.

Todos los ejemplos asumen:

```bash
TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
BASE="https://techos.thetribu.dev/deye"
DEVICE_SN="2402010117"   # obtenido de /v1.0/station/listWithDevice
```

Índice:

1. [`/v1.0/config/battery`](#1-post-v10configbattery)
2. [`/v1.0/config/system`](#2-post-v10configsystem)
3. [`/v1.0/config/tou`](#3-post-v10configtou)

> **Nota:** no todos los inversores soportan los tres puntos. Cuando la consulta llega a un inversor que no lo soporta, verás `code: "2106001"` (`config point not supported`). Esto **no es un error** de tu aplicación; simplemente ese modelo/firmware no expone ese parámetro.

---

## 1. `POST /v1.0/config/battery`

Parámetros de batería (capacidad, SOC mínimo/máximo, corrientes de carga/descarga, tipo de batería, etc.).

### Request

```json
{ "deviceSn": "2402010117" }
```

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/config/battery" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\"}"
```

### Respuesta (mock, soportado)

```json
{
  "code": "1000000", "success": true, "requestId": "56d9c5ef0a628e4f",
  "deviceSn": "2402010117",
  "batteryType": "LITHIUM",
  "ratedCapacity": 202,
  "minSOC": 20,
  "maxSOC": 100,
  "maxChargeCurrent": 50,
  "maxDischargeCurrent": 50,
  "floatVoltage": 54.0,
  "absorptionVoltage": 56.4
}
```

> Los campos exactos dependen del firmware. Los más comunes son `batteryType`, `ratedCapacity`, `minSOC`, `maxSOC`, corrientes máximas y voltajes. Puede haber más campos específicos del modelo.

### Respuesta (mock, no soportado)

```json
{
  "code": "2106001",
  "msg": "config point not supported",
  "success": false,
  "requestId": "56d9c5ef0a628e4f"
}
```

---

## 2. `POST /v1.0/config/system`

Parámetros de sistema del inversor (modo de trabajo, límites de potencia, configuración de red, etc.).

### Request

```json
{ "deviceSn": "2402010117" }
```

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/config/system" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\"}"
```

### Respuesta (mock, soportado)

```json
{
  "code": "1000000", "success": true, "requestId": "7b6d47282afdc8bf",
  "deviceSn": "2402010117",
  "workMode": "BATTERY_FIRST",
  "energyPattern": "BATTERY_FIRST",
  "limitControl": "SELL_FIRST",
  "maxSellPower": 6000,
  "maxSolarPower": 8000,
  "solarSellEnabled": true,
  "gridPeakShavingEnabled": false
}
```

> Los campos exactos dependen del firmware. Valores típicos:
>
> - `workMode` / `energyPattern`: `BATTERY_FIRST`, `LOAD_FIRST`
> - `limitControl`: `SELL_FIRST`, `ZERO_EXPORT`, `LIMIT_POWER`

### Respuesta (mock, no soportado)

```json
{
  "code": "2106001",
  "msg": "config point not supported",
  "success": false,
  "requestId": "7b6d47282afdc8bf"
}
```

---

## 3. `POST /v1.0/config/tou`

Configuración de **Time-of-Use** (TOU): ventanas horarias con sus parámetros de carga/descarga programada.

### Request

```json
{ "deviceSn": "2402010117" }
```

### Ejemplo

```bash
curl -X POST "$BASE/v1.0/config/tou" \
  -H "Authorization: $TEAM_KEY" -H "Content-Type: application/json" \
  -d "{\"deviceSn\":\"$DEVICE_SN\"}"
```

### Respuesta (mock)

```json
{
  "code": "1000000", "success": true, "requestId": "84bbc11c03722b79",
  "touAction": "off",
  "timeUseSettingItems": [
    { "time": "0100", "power": 6000, "voltage": 49, "soc": 80, "enableGridCharge": false, "enableGeneration": false },
    { "time": "0500", "power": 6000, "voltage": 49, "soc": 80, "enableGridCharge": false, "enableGeneration": false },
    { "time": "0900", "power": 6000, "voltage": 49, "soc": 80, "enableGridCharge": false, "enableGeneration": false },
    { "time": "1300", "power": 6000, "voltage": 49, "soc": 80, "enableGridCharge": false, "enableGeneration": false },
    { "time": "1700", "power": 6000, "voltage": 49, "soc": 80, "enableGridCharge": false, "enableGeneration": false },
    { "time": "2100", "power": 6000, "voltage": 49, "soc": 80, "enableGridCharge": false, "enableGeneration": false }
  ]
}
```

### Campos

| Campo | Descripción |
|---|---|
| `touAction` | `"on"` si el TOU está activo, `"off"` si no. |
| `timeUseSettingItems[]` | Ventanas del día (típicamente 6 slots de 4 horas). |
| `timeUseSettingItems[].time` | Hora de inicio del slot en formato `"HHMM"`. |
| `timeUseSettingItems[].power` | Potencia máxima permitida en el slot (W). |
| `timeUseSettingItems[].voltage` | Voltaje objetivo de batería (V). |
| `timeUseSettingItems[].soc` | SOC objetivo (%) para ese slot. |
| `timeUseSettingItems[].enableGridCharge` | Si la batería puede cargar desde la red durante ese slot. |
| `timeUseSettingItems[].enableGeneration` | Si el generador (backup) puede arrancar durante ese slot. |
