# Contrato IA — Rootwave

Comportamiento detallado: `rules/rootwave-ai-guidelines.mdc` (siempre activa) y el resto de `rules/*.mdc`.

## No negociable

- No commitear ni imprimir secretos; configuración sensible vía entorno.
- Validar entradas externas; evitar composición shell insegura.
- **Canon del repo:** `docs/` por encima de defaults del hub genérico (Node/pnpm/Next son referencia; este proyecto: FastAPI + React/Vite + Supabase según `docs/ARCHITECTURE.md`).

## Defaults (Rootwave)

- Módulos pequeños: ~**300** líneas/archivo, ~**50** líneas/función cuando sea razonable.
- Python: Ruff + Mypy estricto (`docs/CONVENTIONS.md`).
- TypeScript: estricto; evitar `any` sin justificación.

## Comunicación

- Por defecto **caveman** (`docs/AGENTS.md`): breve, causal, sin relleno.

## Dónde seguir

| Tema | Ubicación |
| --- | --- |
| Reglas siempre vs bajo demanda | [`README.md`](README.md) en esta carpeta |
| Workflows y límites | [`cursor-config.json`](cursor-config.json) |
| Skills / workflows externos | `~/.claude/skills` o skills del proyecto si existen |

Si los requisitos son ambiguos, preguntar antes de refactors grandes.
