# 02 · Dispositivos (`device`)

Endpoints para listar los dispositivos (inversores, storage, MAX, dataloggers, medidores, etc.) asociados a una planta.

Todos los endpoints son `GET` con query params. La respuesta sigue el envelope estándar `{ "error_code", "error_msg", "data" }`.

---

## `GET /v1/device/list`

Devuelve la lista de dispositivos físicos que Growatt tiene asociados a una planta.

### Request

**Método:** `GET`
**Ruta:** `/v1/device/list`
**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `plant_id` | number | **Obligatorio.** ID de la planta (de `/v1/plant/list`). |
| `page` | number | Opcional. Página. |
| `perpage` | number | Opcional. Tamaño de página (máx 100). |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/device/list?plant_id=1234567"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "count": 4,
    "devices": [
      {
        "device_sn": "ABC1234567",
        "device_id": 0,
        "model": "MODEL0DEMO0XXXXXXXXX",
        "type": 1,
        "datalogger_sn": "DLG0001ABC",
        "manufacturer": "Growatt",
        "lost": false,
        "status": 2,
        "last_update_time": "2026-04-18 12:34:56"
      },
      {
        "device_sn": "ABC1234567",
        "device_id": 0,
        "model": "MODEL0DEMO0XXXXXXXXX",
        "type": 4,
        "datalogger_sn": "DLG0001ABC",
        "manufacturer": "Growatt",
        "lost": false,
        "status": 0,
        "last_update_time": "2026-04-18 12:34:56"
      },
      {
        "device_sn": "ABC2345678",
        "device_id": 0,
        "model": "MODEL0DEMO0YYYYYYYYY",
        "type": 1,
        "datalogger_sn": "DLG0002DEF",
        "manufacturer": "Growatt",
        "lost": false,
        "status": 2,
        "last_update_time": "2026-04-18 12:30:00"
      },
      {
        "device_sn": "meter",
        "device_id": "",
        "model": "",
        "type": 3,
        "datalogger_sn": "DLG0001ABC",
        "manufacturer": "Growatt",
        "last_update_time": "2026-04-01 00:00:00"
      }
    ]
  },
  "error_code": 0
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `data.count` | number | Total de dispositivos físicos distintos (cada inversor puede aparecer con varios `type` — ver nota abajo). |
| `data.devices[].device_sn` | string | Serial único del dispositivo. **Úsalo como `device_sn` en los demás endpoints.** |
| `data.devices[].model` | string | Modelo de fábrica. Puede venir vacío en medidores / dispositivos tipo 3. |
| `data.devices[].type` | number | Familia del dispositivo. Ver tabla siguiente. |
| `data.devices[].datalogger_sn` | string | Serial del datalogger al que está conectado. Agrupa dispositivos físicos bajo un mismo punto de conexión. |
| `data.devices[].manufacturer` | string | Fabricante reportado por Growatt (típicamente `"Growatt"`). |
| `data.devices[].lost` | boolean | `true` si Growatt detectó pérdida de comunicación reciente. |
| `data.devices[].status` | number | Estado operativo: `0` offline, `1` normal, `2` esperando/otro, `3` fallo. |
| `data.devices[].last_update_time` | string | Último reporte, hora local `YYYY-MM-DD HH:MM:SS`. |

### Mapeo de `type`

| `type` | Familia |
|---:|---|
| 1 | Inversor genérico (incluye MAX agregado) |
| 2 | Storage |
| 3 | Otro (p. ej. medidor / meter) |
| 4 | MAX (single unit) |
| 5 | SPH (híbrido, aka MIX) |
| 6 | SPA |
| 7 | MIN (incluye TLX) |
| 8 | PCS |
| 9 | HPS |
| 10 | PBD |

### Comportamiento importante

- **Un mismo `device_sn` puede aparecer varias veces con distintos `type`.** En el ejemplo, `ABC1234567` aparece como `type=1` (inversor) y `type=4` (MAX). Esto es porque Growatt modela la misma unidad física desde varias "vistas". Si solo quieres unidades únicas, dedupa por `device_sn`.
- Los dispositivos con `device_sn: "meter"` son medidores virtuales; no tienen `device_id`, `model` ni `status` y su único identificador útil es `datalogger_sn`.
- Para saber si un inversor es **TLX/MIN** (usable con los endpoints de [`03-inverter.md`](./03-inverter.md)) tiene que aparecer con `type=7`. Para **SPH/MIX** con `type=5`.

### Errores comunes

| `error_code` | Causa |
|---|---|
| `10002` | La planta no existe. |
| `10003` | Falta `plant_id`. |
| `10011` | La planta no pertenece a tu token. |
