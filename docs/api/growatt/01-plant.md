# 01 · Plantas (`plant`)

Endpoints de Growatt OpenAPI v1 para descubrir y consultar plantas (también llamadas "power stations"). Son el punto de entrada natural: primero listas plantas, luego pides detalle, métricas en vivo o histórico.

Todos los endpoints son `GET` con query params. La respuesta sigue el envelope estándar `{ "error_code", "error_msg", "data" }` descrito en el [README](./README.md#3-formato-de-peticiones-y-respuestas).

---

## `GET /v1/plant/list`

Lista todas las plantas visibles con el token. Úsalo una sola vez al inicio y cachea el resultado — cambia raramente.

> Este endpoint normalmente regresa la respuesta con `Content-Encoding: br` (Brotli). Ver [README § 6.1](./README.md#61-respuestas-comprimidas-con-brotli) para el workaround en tu cliente.

### Request

**Método:** `GET`
**Ruta:** `/v1/plant/list`
**Query params:** ninguno requerido (opcional `page`, `perpage`, `search_type`, `search_keyword`).

### Ejemplo con `curl`

```bash
curl -sS --compressed \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/plant/list"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "count": 2,
    "plants": [
      {
        "plant_id": 1234567,
        "name": "Planta Demo Uno",
        "country": "Colombia",
        "city": "Ciudad Ejemplo",
        "latitude": "4.7000000",
        "longitude": "-75.5000000",
        "peak_power": 100,
        "current_power": "0.0",
        "total_energy": "100000.0",
        "status": 1,
        "create_date": "2024-01-01",
        "locale": "en-US",
        "user_id": 1000000,
        "latitude_f": null,
        "latitude_d": null,
        "image_url": null,
        "operator": null,
        "installer": null
      },
      {
        "plant_id": 7654321,
        "name": "Planta Demo Dos",
        "country": "Colombia",
        "city": "Ciudad Ejemplo",
        "latitude": "4.8000000",
        "longitude": "-75.6000000",
        "peak_power": 50,
        "current_power": "0.0",
        "total_energy": "50000.0",
        "status": 4,
        "create_date": "2022-01-01",
        "locale": "en-US",
        "user_id": 1000000
      }
    ]
  },
  "error_code": 0
}
```

### Campos de la respuesta

| Campo | Tipo | Descripción |
|---|---|---|
| `data.count` | number | Total de plantas retornadas. |
| `data.plants[]` | array | Lista de plantas. |
| `plants[].plant_id` | number | ID único de la planta. **Úsalo como `plant_id` en los demás endpoints.** |
| `plants[].name` | string | Nombre legible. |
| `plants[].country`, `city` | string | Ubicación. |
| `plants[].latitude`, `longitude` | string | Coordenadas (como strings decimales). |
| `plants[].peak_power` | number | Potencia pico instalada en **kW**. |
| `plants[].current_power` | string | Potencia actual en **kW** (viene como string; convierte a float). `0.0` fuera de horas solares. |
| `plants[].total_energy` | string | Energía total histórica en **kWh**. |
| `plants[].status` | number | `1` online/reportando, `4` offline. |
| `plants[].create_date` | string | Fecha de creación `YYYY-MM-DD`. |

---

## `GET /v1/plant/details`

Metadata fija de una planta: ubicación precisa, número de inversores y dataloggers, fabricantes, configuración mecánica. Útil para pantallas de ficha técnica.

### Request

**Método:** `GET`
**Ruta:** `/v1/plant/details`
**Query params obligatorios:**

| Param | Tipo | Descripción |
|---|---|---|
| `plant_id` | number | ID de la planta (de `/v1/plant/list`). |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/plant/details?plant_id=1234567"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "plant_type": 0,
    "name": "Planta Demo Uno",
    "country": "Colombia",
    "city": "Ciudad Ejemplo",
    "latitude": "4.7000000",
    "longitude": "-75.5000000",
    "peak_power": 100,
    "timezone": "GMT-5",
    "create_date": "2024-01-01",
    "locale": "en_US",
    "user_id": 1000000,
    "inverters": [
      { "inverter_man": "Growatt", "inverter_num": 0, "inverter_md": "" }
    ],
    "maxs": [
      { "max_man": "Growatt", "max_num": 2, "max_md": "" }
    ],
    "dataloggers": [
      { "datalogger_man": "Growatt", "datalogger_num": 2, "datalogger_md": "" }
    ],
    "arrays": [
      { "module_man": "Growatt", "num_modules": 0, "module_md": "" }
    ],
    "image_url": "null",
    "ownerorganization": null,
    "currency": null
  },
  "error_code": 0
}
```

### Campos relevantes

| Campo | Tipo | Descripción |
|---|---|---|
| `data.name`, `city`, `country` | string | Identificación humana. |
| `data.latitude`, `longitude` | string | Coordenadas precisas. |
| `data.peak_power` | number | Potencia pico instalada en **kW**. |
| `data.timezone` | string | Zona horaria de la planta (p.ej. `GMT-5`). Importante si vas a cruzar fechas. |
| `data.inverters[]` / `maxs[]` / `dataloggers[]` | array | Resumen por fabricante/modelo. `*_num` indica cuántas unidades. |
| `data.create_date` | string | `YYYY-MM-DD`. |

> Muchos strings (estado, dirección, contactos) pueden venir vacíos (`""`) si no se poblaron en el alta de la planta. No asumas presencia.

### Errores comunes

| `error_code` | Causa |
|---|---|
| `10002` | La planta no existe. |
| `10003` | Falta `plant_id` o es vacío. |
| `10011` | La planta existe pero no pertenece a tu token. |

---

## `GET /v1/plant/data`

Métricas agregadas **en vivo** de la planta: potencia actual, energía de hoy/mes/año, energía total histórica. Ideal para una pantalla tipo "dashboard resumido".

### Request

**Método:** `GET`
**Ruta:** `/v1/plant/data`
**Query params obligatorios:**

| Param | Tipo | Descripción |
|---|---|---|
| `plant_id` | number | ID de la planta. |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/plant/data?plant_id=1234567"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "current_power": 0,
    "today_energy": "0",
    "monthly_energy": "5000.0",
    "yearly_energy": "30000.0",
    "total_energy": "100000.0",
    "peak_power_actual": 100,
    "carbon_offset": "0",
    "efficiency": "",
    "timezone": "GMT-5",
    "last_update_time": "2026-04-18 12:34:56"
  },
  "error_code": 0
}
```

### Campos

| Campo | Tipo | Unidad | Descripción |
|---|---|---|---|
| `current_power` | number \| string | kW | Potencia activa instantánea. Convierte a float si viene como string. |
| `today_energy` | string | kWh | Energía generada hoy. |
| `monthly_energy` | string | kWh | Energía del mes en curso. |
| `yearly_energy` | string | kWh | Energía del año en curso. |
| `total_energy` | string | kWh | Energía total histórica. |
| `peak_power_actual` | number | kW | Potencia pico real medida. |
| `carbon_offset` | string | ton CO₂ | Estimación de CO₂ evitado. |
| `timezone` | string | — | Zona horaria de la planta. |
| `last_update_time` | string | `YYYY-MM-DD HH:MM:SS` | Momento del último reporte upstream (hora local de la planta). |

### Uso típico

- Endpoint ligero (≈275 B). Llamarlo una vez por minuto como máximo es más que suficiente (upstream refresca cada ~5 min).
- Si `current_power == 0` y es de día, revisa `last_update_time`: la planta puede estar offline.

---

## `GET /v1/plant/power`

Serie de **potencia activa** con granularidad de **5 minutos** para un día específico. Útil para graficar la curva diaria.

### Request

**Método:** `GET`
**Ruta:** `/v1/plant/power`
**Query params obligatorios:**

| Param | Tipo | Formato | Descripción |
|---|---|---|---|
| `plant_id` | number | — | ID de la planta. |
| `date` | string | `YYYY-MM-DD` | Día para el que quieres la serie (hora local de la planta). |

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/plant/power?plant_id=1234567&date=2026-04-18"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "count": 288,
    "powers": [
      { "time": "2026-04-18 00:00", "power": null },
      { "time": "2026-04-18 06:00", "power": 0 },
      { "time": "2026-04-18 12:00", "power": 50.0 }
    ]
  },
  "error_code": 0
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `data.count` | number | Total de puntos devueltos. Un día completo son **288** (24 × 12). |
| `data.powers[].time` | string | Instante del punto, `YYYY-MM-DD HH:MM` en hora local de la planta. |
| `data.powers[].power` | number \| null | Potencia activa en **kW**. `null` cuando la planta no reportó en esa ventana (p. ej. de noche). |

### Notas importantes

- El arreglo **no viene necesariamente ordenado** cronológicamente. Ordena por `time` del lado de tu cliente antes de graficar.
- Puntos con `power: null` son normales fuera de horas solares o cuando el datalogger no reportó.
- La ventana es un único día (hora local). Para rangos más largos usa `/v1/plant/energy`.

### Errores comunes

| `error_code` | Causa |
|---|---|
| `10003` | `plant_id` vacío **o** `date` con formato inválido. |
| `10004` | `date` con formato incorrecto. |

---

## `GET /v1/plant/energy`

Energía total generada **agregada** por día, mes o año, sobre un rango de fechas.

### Request

**Método:** `GET`
**Ruta:** `/v1/plant/energy`
**Query params:**

| Param | Tipo | Formato | Descripción |
|---|---|---|---|
| `plant_id` | number | — | ID de la planta. |
| `start_date` | string | `YYYY-MM-DD` | Fecha inicial (inclusive). |
| `end_date` | string | `YYYY-MM-DD` | Fecha final (inclusive). |
| `time_unit` | string | `day` \| `month` \| `year` | Granularidad del agregado. Default: `day`. |
| `page` | number | — | Página (opcional). |
| `perpage` | number | — | Tamaño de página (opcional, máx 100). |

Límites de ventana según `time_unit`:

| `time_unit` | Ventana máxima |
|---|---|
| `day` | 7 días |
| `month` | dentro del mismo año o el anterior |
| `year` | 20 años |

Si te pasas del rango, Growatt responde `error_code: 10004 Time format is incorrect`.

### Ejemplo con `curl`

```bash
curl -sS \
  -H "Authorization: $TEAM_KEY" \
  "https://techos.thetribu.dev/growatt/v1/plant/energy?plant_id=1234567&start_date=2026-04-12&end_date=2026-04-18&time_unit=day"
```

### Respuesta (mock)

```json
{
  "error_msg": "",
  "data": {
    "count": 7,
    "time_unit": "day",
    "energys": [
      { "date": "2026-04-12", "energy": "450" },
      { "date": "2026-04-13", "energy": "420" },
      { "date": "2026-04-14", "energy": "480" },
      { "date": "2026-04-15", "energy": "200" },
      { "date": "2026-04-16", "energy": "410" },
      { "date": "2026-04-17", "energy": "300" },
      { "date": "2026-04-18", "energy": "0" }
    ]
  },
  "error_code": 0
}
```

### Campos

| Campo | Tipo | Descripción |
|---|---|---|
| `data.count` | number | Total de puntos. |
| `data.time_unit` | string | Granularidad efectiva (`day` / `month` / `year`). |
| `data.energys[].date` | string | Etiqueta temporal. Para `day` es `YYYY-MM-DD`, para `month` es `YYYY-MM`, para `year` es `YYYY`. |
| `data.energys[].energy` | string | Energía generada en el intervalo, en **kWh** (viene como string, convierte a float). |

### Uso típico

- `time_unit=day` con rango de 7 días → gráfica semanal de producción diaria.
- `time_unit=month` con 12 meses → gráfica anual de producción mensual.
- `time_unit=year` con N años → histórico completo.
- Si `energy == "0"` en un día con la planta `status=1`, revisa si hubo mantenimiento / nube prolongada / fallo de datalogger.
