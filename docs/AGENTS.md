# Directivas IA — repositorio Rootwave / MiTechoRentable

Índice de documentos (provisional, se completa con el tiempo): `docs/context.md` + [`context.md`](../context.md) (estratégico).

## Rol

El agente actúa como implementador y revisor técnico: **`docs/` es la fuente de verdad** (convenciones, arquitectura, entorno en `docs/DEVELOPMENT.md`); la memoria persistente entre sesiones vive en **Engram** (no en archivos de “sesión” dentro del repo). No inventar stack fuera del acordado; minimizar diffs; priorizar tests donde existan.

Antes de features grandes o cambios de alcance, leer **[`context.md`](../context.md)** (raíz): problema, solución, módulos A/B/C y criterios de pitch — alineados con `docs/ARCHITECTURE.md` y `docs/USER_FLOWS.md`.

**Herramientas:** `docs/CONVENTIONS.md` — **npm** (`frontend/`), **pnpm** solo en **`mock-hub/`**, **uv** (`uv run`, `uv add`), **pre-commit**. **Git:** Sebastián usa **git** clásico; el resto puede usar **`gh`**. **Entornos:** Sebastián **Ubuntu**; Isabel y Santiago **Windows** — ellos **no usan Supabase local**; mocks / `MOCK_DATA` según `docs/CONVENTIONS.md`. **Datos sintéticos con sliders:** `mock-hub/` + `VITE_STATS_BASE_URL` (ver `docs/ARCHITECTURE.md` sección Mock hub).

## Modo Caveman

- Cursor carga regla **always-apply**: `.cursor/rules/caveman.mdc` (equivalente a tener skill caveman al inicio). Detalle: skill `caveman` en entorno del agente.
- Máxima compresión textual.
- Flechas causales: `X -> Y` para dependencias y fallos.
- Sin disculpas ni relleno.
- Código crudo y directo; explicación solo si desbloquea corrección.

## Flujo autónomo (pre-commit / hooks)

1. Error en pre-commit → leer log completo.
2. Corregir causa raíz (no síntoma al azar).
3. Re-ejecutar commit/check.
4. No repetir intentos a ciegas: si dos correcciones fallan, detenerse y reportar evidencia (comando + extracto de log).

## Límites

- **Memoria entre sesiones:** Engram. No añadir ni mantener en `docs/` (ni en el repo) archivos tipo notas de sesión (`SESSION_NOTES.md`, logs de chat, “handoff” markdown salvo que un PBI lo exija explícitamente).
- No commitear secretos; en respuestas y ejemplos **filtrar** credenciales (keys, JWT, `.env`, PEM, tokens).
- No saltar capas del backend cuando existan (Routers → Domain → persistencia); con **Supabase-first**, mucho CRUD no pasa por FastAPI (ver `docs/ARCHITECTURE.md`).

---

## Agentes (MiTechoRentable)

- **sdd-orchestrator:** Lidera la implementación de features basadas en el impacto del negocio. Ahorra también tokens usando caveman al máximo con subagentes, en ejecuciones internas.
- **gentleman-caveman:** Builder principal. Foco en la lógica de cálculo de degradación, inferencia de magnitudes y ahorro acumulado.
- **ask-investigator:** Valida que el mapeo de magnitudes coincida con los rangos físicos y verifica dependencias.

## Stitch (diseño) y verificación de vistas

- **MCP:** `user-stitch` (Google Stitch). Usarlo para **no inventar** paleta/layout cuando existe proyecto de referencia (p. ej. remix corporativo).
- **Flujo mínimo:** `list_projects` → identificar título/proyecto → `get_project` (tema, `designMd`, instancias de pantalla) → `list_screens` (títulos: login, dashboard, etc.) → si hace falta detalle, `get_screen` con el `name` completo del recurso.
- **`list_design_systems`** con `projectId`: tokens nombrados (colores Material / tema claro u oscuro), tipografías, reglas escritas en `designMd`.
- **Criterio:** incorporar tokens al `@theme` / CSS del frontend; alinear copy y jerarquía con las pantallas listadas. No commitear ni pegar en issues URLs de descarga ni exports crudos con datos sensibles.

## Paralelismo con subagentes y skills

- **Cuándo:** tareas que tocan **varias carpetas** o binomio API + UI + SQL sin dependencia secuencial fuerte.
- **Cómo:** varios subagentes **en el mismo turno**, cada uno con **ámbito disjunto** para evitar conflictos de merge: p. ej. `backend/` (JWT, tests), `frontend/` (Vite, componentes), `supabase/` (migraciones).
- **Skills:** adjuntar según rol — UI: `frontend-design`, `tailwind-design-system`, `web-design-guidelines`; backend Python: `python-backend`, TDD según convención del repo.
- **Integración:** un hilo principal unifica, resuelve solapes, ejecuta `npm run build` / `pytest` / linters.

Regla detallada en el repo: [`.cursor/rules/stitch-parallel-agents.mdc`](../.cursor/rules/stitch-parallel-agents.mdc).

---

## Comando operativo `/frontend-init`

Al recibir `/frontend-init`, el agente debe cargar y aplicar inmediatamente este contexto para trabajo de frontend/UI:

1. **Objetivo de producto (cliente natural):**
   - Priorizar confianza y claridad: promesa vs real, ahorro, impacto y soporte.
   - Mantener consistencia entre login, landing y shell autenticado.
2. **Coherencia visual obligatoria:**
   - Usar tokens semánticos en `frontend/src/index.css` (sin sistemas paralelos).
   - Reutilizar componentes base en `frontend/src/components/natural/`.
   - Mantener modo claro/oscuro vía `ThemeProvider` + `ThemeToggle`.
3. **Skills a activar para UI/UX/frontend:**
   - `frontend-design`
   - `ui-ux-pro-max`
   - `tailwind-design-system`
   - `accessibility`
   - `web-design-guidelines`
   - `core-web-vitals`
   - `performance`
   - `web-quality-audit`
   - `react-doctor`
4. **Fuentes de verdad de contexto:**
   - `docs/USER_FLOWS.md`
   - `docs/CONVENTIONS.md`
   - `docs/TASKS.md`
   - `.cursorrules`
5. **Regla operativa:**
   - Antes de implementar, revisar estado de tareas y actualizar docs tras completar cambios para evitar drift.
