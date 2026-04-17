# Convenciones — Rootwave

## Backend (Python 3.13)

- **Ruff:** obligatorio como linter y formatter; configuración en `pyproject.toml` (o equivalente).
- **Mypy:** obligatorio, tipado estricto; el código mergeado debe pasar `mypy` sin errores en el alcance del proyecto.

## Frontend (React 18+)

- **ESLint** y **Prettier** obligatorios.
- **TypeScript estricto** (`strict: true` o equivalente).
- **Prohibido** usar `any` (usar tipos concretos, `unknown` con narrowing, o genéricos).

## Git

- Ramas: `feat/[nombre]`, `fix/[nombre]`.
- Commits semánticos: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc. (ej.: `feat: add login`).

## Calidad previa a push

- El hook de **pre-commit** (y checks acordados en CI) debe pasar antes de pushear. No integrar cambios que rompan el pipeline local.
