# Contexto vivo — Rootwave

> **Estado:** índice **incompleto**; se ampliará. No asumir que lista todo lo relevante del repo — ante duda, recorrer `docs/` y el código.

Índice rápido para agentes: leer junto con `docs/AGENTS.md` antes de cambiar código.

| Doc | Contenido |
| --- | --- |
| [../context.md](../context.md) | **Contexto estratégico MiTechoRentable** (resumen, diferenciadores, KPIs, demo) |
| [AGENTS.md](./AGENTS.md) | Agentes y responsabilidades |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Flujo Tinku → FastAPI → Supabase → React |
| [USER_FLOWS.md](./USER_FLOWS.md) | Flujos: Cliente natural / corporativo, Operaciones TR (War Room, agenda, analítica), Técnico de Campo |
| [API_SPEC.yml](./API_SPEC.yml) | OpenAPI — seguridad (JWT Supabase vs `X-Ingest-Key`), pipeline de datos, rutas |
| [API_SPEC.md](./API_SPEC.md) | Ejemplos de formato (legado, ver `.yml`) |
| [CONVENTIONS.md](./CONVENTIONS.md) | uv, pre-commit; git/`gh`; OS; mocks; **credenciales** |
| [DATABASE.md](./DATABASE.md) | Datos / Supabase |
| [TASKS.md](./TASKS.md) | Tablero Kanban + tareas por persona (Isabel/Santiago: vistas frontend) |

**Precedencia:** si algo en el hub `.cursor/` contradice estos docs, mandan **`docs/`**.
