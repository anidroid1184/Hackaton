# Base de datos — MiTechoRentable (Supabase / Postgres)

**Versión objetivo:** proyecto Supabase con cliente JS **2.70.x**; JWT de Auth estándar (`sub`, `role`, `aud`). RLS obligatorio en tablas con datos de cliente.

**Implementación:** migraciones en `supabase/migrations/*.sql`. Este documento es la **especificación**; el código SQL puede ajustar nombres si no rompe contratos del frontend.

---

## Convención global

Toda tabla de dominio incluye:

| Columna | Tipo | Notas |
|---------|------|--------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_at` | `timestamptz` | `now()`, not null |
| `updated_at` | `timestamptz` | not null; trigger `BEFORE UPDATE` o app |

Índices comunes: FKs siempre indexadas; series temporales: `(plant_id, ts DESC)` o BRIN en `ts` si el volumen es alto.

---

## 1. Multi-tenant y perfiles

### `organizations`

Operador tipo Techos Rentables (tenant interno).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `name` | text | Nombre legal o comercial |
| `slug` | text | único, URL-safe |
| `created_at`, `updated_at` | timestamptz | |

### `profiles`

Extiende `auth.users` (1:1). **No** duplicar email aquí; leer de `auth.users` vía join o API.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK, **FK → `auth.users.id`** `ON DELETE CASCADE` |
| `organization_id` | uuid | FK → `organizations.id` |
| `full_name` | text | |
| `role` | text | Check: `admin` \| `client` \| `technician` (enum Postgres preferible) |
| `phone` | text | nullable |
| `created_at`, `updated_at` | timestamptz | |

**RLS (resumen):** usuario solo ve/actualiza fila donde `id = auth.uid()`. Admins: política extra por `organization_id` (ver sección RLS abajo).

---

## 2. Clientes y plantas

### `clients`

Cliente corporativo o residencial (dueño contractual del techo).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → `organizations` |
| `name` | text | |
| `tariff_cop_per_kwh` | numeric(14,6) | tarifa para cálculo de ahorro |
| `currency` | text | default `COP` |
| `grid_emission_factor_kg_co2_per_kwh` | numeric(14,8) | factor red para CO2 |
| `created_at`, `updated_at` | timestamptz | |

### `plants`

Instalación solar (unidad de monitoreo principal).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `client_id` | uuid | FK → `clients` |
| `name` | text | |
| `nominal_power_kw` | numeric(12,4) | Pnom inversor/planta |
| `timezone` | text | e.g. `America/Bogota` |
| `lat` | double precision | nullable |
| `lng` | double precision | nullable |
| `status` | text | `online` \| `degraded` \| `offline` \| `unknown` |
| `created_at`, `updated_at` | timestamptz | |

### `devices`

Inversor / medidor; agnóstico de marca (`vendor_slug` libre).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `plant_id` | uuid | FK → `plants` |
| `vendor_slug` | text | e.g. `growatt`, `huawei` |
| `external_device_id` | text | id en portal del fabricante |
| `meta` | jsonb | nullable; modelo, strings brutos |
| `created_at`, `updated_at` | timestamptz | |

---

## 3. Series temporales y alertas

### `readings`

Lecturas discretas. Tras **inferencia de magnitud** (FastAPI o job), guardar **canónicos**; opcionalmente conservar `raw` para auditoría.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `plant_id` | uuid | FK → `plants` |
| `device_id` | uuid | nullable, FK → `devices` |
| `ts` | timestamptz | instante de la muestra |
| `raw` | jsonb | pares nombre→valor proveedor |
| `canonical` | jsonb | magnitudes normalizadas: `p_active_kw`, `v_dc`, `i_dc`, `pf`, `t_inv_c`, etc. |
| `created_at` | timestamptz | default `now()` |

**Índice:** `(plant_id, ts DESC)` obligatorio para Time Slider y gráficas.

### `alerts`

Alertas derivadas (arco, degradación, breaker, offline).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `plant_id` | uuid | FK → `plants` |
| `type` | text | `arc_fault` \| `breaker_fatigue` \| `degradation` \| `offline` \| `out_of_range` |
| `severity` | text | `info` \| `warn` \| `critical` |
| `ts` | timestamptz | momento del evento |
| `payload` | jsonb | umbrales, ventana, valores |
| `acknowledged_at` | timestamptz | nullable |
| `resolved_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

**Índice:** `(plant_id, ts DESC)`; filtro por `severity` en War Room.

### `maintenance_tickets`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK |
| `plant_id` | uuid | FK → `plants` |
| `title` | text | |
| `status` | text | `pending` \| `done` \| `overdue` |
| `due_at` | timestamptz | nullable |
| `completed_at` | timestamptz | nullable |
| `assigned_profile_id` | uuid | nullable, FK → `profiles.id` |
| `created_at`, `updated_at` | timestamptz | |

---

## 4. Vistas útiles (opcional)

| Vista | Propósito |
|-------|-----------|
| `v_plant_health_summary` | Último `status`, conteo alertas abiertas, última lectura `ts` por planta |
| `v_client_kpi_daily` | Agregados diarios por `client_id` para dashboard (puede generarse también vía RPC) |

---

## 5. RLS — modelo mental

| Rol | Acceso típico |
|-----|-----------------|
| `admin` | Todas las plantas de su `organization_id`. |
| `client` | Solo `plants` donde `client_id` está ligado al perfil (tabla puente `client_users` **si** un usuario humano se asocia a un `client`; si no, claim JWT custom / metadata). |
| `technician` | Plantas asignadas (tabla `technician_plants` opcional: `profile_id`, `plant_id`) o política por org. |

> **Pendiente de implementación:** definir si la relación usuario↔cliente es 1:1 en metadata JWT o tabla `client_users(user_id, client_id)`. Documentar en la primera migración que incluya RLS.

**Regla:** sin política, **denegar** `SELECT`/`INSERT`/`UPDATE`/`DELETE` en tablas sensibles.

---

## 6. RPCs sugeridos (hackathon)

| Función | Uso |
|---------|-----|
| `rpc_plant_readings_range(plant_id, t_from, t_to)` | Lecturas para Time Slider (paginado) |
| `rpc_ack_alert(alert_id)` | Marcar alerta reconocida (con check de rol) |

---

## Referencias cruzadas

- Flujos de pantalla: `docs/USER_FLOWS.md`
- API edge / JWT: `docs/API_SPEC.yml`
- Arquitectura: `docs/ARCHITECTURE.md`
