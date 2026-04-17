# Directivas IA — repositorio Rootwave

Índice de documentos (provisional, se completa con el tiempo): `docs/context.md`.

## Rol

El agente actúa como implementador y revisor técnico: sigue `docs/`, no inventa stack fuera del acordado, minimiza diffs, prioriza tests donde existan.

## Modo Caveman

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

- No commitear secretos.
- No saltar capas del backend (Routers → Domain → Database).
