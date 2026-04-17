# Base de datos — Supabase

## Convención de columnas

Toda tabla debe incluir:

- `id` — `UUID`, PK, default `gen_random_uuid()` (o equivalente en migraciones).
- `created_at` — `timestamptz`, no nulo, default `now()`.
- `updated_at` — `timestamptz`, no nulo, actualizado en cada `UPDATE` (trigger o aplicación).

---

## Esquema

> Rellenar con tablas reales según el dominio.

| Tabla | Descripción | Notas |
|-------|-------------|--------|
| `_ejemplo` | Tabla de ejemplo; sustituir | Incluir `id`, `created_at`, `updated_at` |

---

## Políticas RLS (Row Level Security)

> Documentar por tabla: quién puede `SELECT` / `INSERT` / `UPDATE` / `DELETE` y bajo qué condición (claims JWT, pertenencia a org, etc.).

| Tabla | Política | Operación | Condición resumida |
|-------|----------|-----------|---------------------|
| — | — | — | — |

---

## RPCs (funciones en Supabase)

> Funciones expuestas vía `rpc()` con firma, propósito y permisos.

| Nombre | Parámetros | Retorno | Uso |
|--------|------------|---------|-----|
| — | — | — | — |
