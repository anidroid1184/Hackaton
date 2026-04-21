# 03 · Inversor específico (MIN/TLX y SPH/MIX)

Growatt OpenAPI v1 tiene endpoints **específicos por familia** de inversor. Solo funcionan cuando el `device_sn` que mandas corresponde al `type` esperado por el endpoint:

| Familia | `device.type` en `/v1/device/list` | Endpoints GET expuestos aquí |
|---|---:|---|
| **MIN / TLX** | `7` | `/v1/device/tlx/tlx_data_info`, `/v1/device/tlx/tlx_set_info` |
| **SPH / MIX** | `5` | `/v1/device/mix/mix_data_info` |

Si llamas cualquiera de estos con un `device_sn` que no es del tipo correcto, Growatt responde `error_code: 10011 error_permission_denied` (el endpoint existe y tu key tiene permiso general, pero el dispositivo no aplica).

Los endpoints están accesibles por el middleware aunque la cuenta del hackathon no tenga hoy inversores de estos tipos en su inventario. Todos los ejemplos de respuesta son **anonimizados** (la forma del payload es la real, pero los valores —seriales, dataloggers, modelos, fechas— son ficticios).

> Growatt también expone endpoints **POST** para la telemetría detallada de MIN/SPH (`tlx_last_data`, `tlx_data`, `mix_last_data`, `mix_data`). Esos **no están disponibles** a través del middleware, que hoy sólo acepta `GET` en `/growatt/*` (responde `HTTP 405`). Para telemetría agregada al nivel de planta, usa [`01-plant.md`](./01-plant.md).

---

## `GET /v1/device/tlx/tlx_data_info`  *(MIN / TLX, `type=7`)*

Información técnica detallada de un inversor MIN/TLX: modelo, firmware, capacidades, límites configurables.

### Request

**Método:** `GET`
**Ruta:** `/v1/device/tlx/tlx_data_info`
**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `device_sn` | string | **Obligatorio.** Serial del inversor MIN/TLX (de `/v1/device/list` con `type=7`). |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/device/tlx/tlx_data_info?device_sn=AHC1234567"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "device_sn": "AHC1234567",
    "datalogger_sn": "DLG0003GHI",
    "model": "TLX-6K",
    "fw_version": "GT1.0.1",
    "inverter_type": 7,
    "power": 6000,
    "rated_power": 6000,
    "ac_max_power": 6000,
    "dc_max_voltage": 550,
    "status": 1,
    "last_update_time": "2026-04-18 12:34:56"
  },
  "error_code": 0
}
```

### Respuesta (mock)

```json
{
  "error_msg": "error_permission_denied",
  "data": "",
  "error_code": 10011
}
```

### Errores comunes

| `error_code` | Causa |
|---|---|
| `10003` | Falta `device_sn`. |
| `10011` | El `device_sn` no es un MIN/TLX (`type != 7`) o no pertenece a tu token. |

---

## `GET /v1/device/tlx/tlx_set_info`  *(MIN / TLX, `type=7`)*

Parámetros configurables actuales de un inversor MIN/TLX (modos de operación, setpoints, ventanas time-of-use, límites). Solo lectura — la escritura requiere el endpoint POST `/v1/tlxSet`, que **no está disponible vía middleware**.

### Request

**Método:** `GET`
**Ruta:** `/v1/device/tlx/tlx_set_info`
**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `device_sn` | string | **Obligatorio.** Serial del inversor MIN/TLX. |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/device/tlx/tlx_set_info?device_sn=AHC1234567"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "device_sn": "AHC1234567",
  "dataloggerSn": "DLG0003GHI",
  "data": {
    "tlx_on_off": "1",
    "pv_active_p_rate": "100",
    "backflow_setting": "0",
    "priority": "0",
    "time_segment1": "0:0-23:59-0-0",
    "time_segment2": "0:0-0:0-0-0"
  },
  "error_code": 0
}
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "device_sn": "ABC1234567",
  "dataloggerSn": "",
  "data": "",
  "error_code": 0
}
```

> Ojo: con `device_sn` tipo `1` (MAX genérico) la llamada devuelve `error_code: 0` pero el `data` viene vacío (`""`) y el `dataloggerSn` también. Eso indica que **el endpoint está disponible pero no hay configuración que reportar para ese dispositivo**. Para ver datos reales el `device_sn` debe ser de un MIN/TLX (`type=7`).

### Campos (cuando `data` viene poblado)

| Campo | Descripción |
|---|---|
| `tlx_on_off` | `"1"` encendido, `"0"` apagado. |
| `pv_active_p_rate` | Porcentaje (0-100) de potencia activa permitida. |
| `backflow_setting` | Habilitación de inyección a la red. |
| `priority` | Prioridad de operación (load/battery/grid, valor numérico). |
| `time_segmentN` | Ventanas TOU, formato `"HH:MM-HH:MM-mode-enabled"`. |

### Errores comunes

Igual que `tlx_data_info`.

---

## `GET /v1/device/mix/mix_data_info`  *(SPH / MIX, `type=5`)*

Información técnica detallada de un inversor **híbrido** SPH/MIX: capacidad de batería, configuración de carga AC, modos de operación, histórico de salud.

### Request

**Método:** `GET`
**Ruta:** `/v1/device/mix/mix_data_info`
**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `device_sn` | string | **Obligatorio.** Serial del inversor SPH/MIX (de `/v1/device/list` con `type=5`). |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/device/mix/mix_data_info?device_sn=GBX9876543"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "device_sn": "GBX9876543",
    "datalogger_sn": "DLG0004JKL",
    "model": "SPH-5000",
    "fw_version": "MIX1.2.3",
    "inverter_type": 5,
    "rated_power": 5000,
    "battery_type": "LFP",
    "battery_capacity": 10.24,
    "ac_charge_enable": false,
    "priority": "0",
    "status": 1,
    "last_update_time": "2026-04-18 12:34:56"
  },
  "error_code": 0
}
```

### Respuesta (mock)

```json
{
  "error_msg": "error_permission_denied",
  "data": "",
  "error_code": 10011
}
```

### Errores comunes

| `error_code` | Causa |
|---|---|
| `10003` | Falta `device_sn`. |
| `10011` | El `device_sn` no es un SPH/MIX (`type != 5`) o no pertenece a tu token. |

---

## Flujo recomendado

1. Llama `/v1/device/list?plant_id=...` y filtra por `type`.
2. Si encuentras `type=7`, usa los dos endpoints TLX con ese `device_sn`.
3. Si encuentras `type=5`, usa el endpoint MIX con ese `device_sn`.
4. Para telemetría en tiempo real o histórica agregada al nivel de planta, sigue usando [`01-plant.md`](./01-plant.md) (`plant/data`, `plant/power`, `plant/energy`) — esos funcionan para cualquier tipo de inversor.
