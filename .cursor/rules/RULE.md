# Contrato IA — Rootwave

Comportamiento detallado: `rules/rootwave-ai-guidelines.mdc` (siempre activa) y el resto de `rules/*.mdc`.

## No negociable

- No commitear ni imprimir secretos; configuración sensible vía entorno.
- Validar entradas externas; evitar composición shell insegura.
- **Canon del repo:** `docs/` por encima del hub genérico. **Tooling:** npm (JS), uv (`uv run`, `uv add`), pre-commit — ver `docs/CONVENTIONS.md`. **Git:** Sebastián → git clásico; resto → pueden usar `gh`. **SO:** Sebastián Ubuntu; Isabel y Santiago Windows (sin Supabase local → mocks).

## Defaults (Rootwave)

- Módulos pequeños: ~**300** líneas/archivo, ~**50** líneas/función cuando sea razonable.
- Python: Ruff + Mypy estricto vía **uv** cuando aplique (`docs/CONVENTIONS.md`).
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
