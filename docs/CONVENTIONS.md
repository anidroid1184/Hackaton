# Convenciones — Rootwave

## Herramientas (obligatorio para agentes y devs)

### JavaScript / frontend

- **npm** como gestor de paquetes: `npm install`, `npm ci`, `npm run <script>`.
- No usar **pnpm** ni **yarn** en este repo salvo decisión explícita del equipo.

### Python / backend

- **uv** para dependencias y ejecución de herramientas:
  - Añadir dependencias: `uv add <paquete>` (y `uv sync` según flujo del repo).
  - Ejecutar linters, tests o CLI del proyecto: **`uv run`** (p. ej. `uv run ruff check`, `uv run mypy`, `uv run pytest`).
- No usar `pip install` suelto en el sistema; el entorno del proyecto va con **uv**.

### Pre-commit

- El repo define checks en **`.pre-commit-config.yaml`**.
- Una vez por clon: `pre-commit install` (engancha hooks en `git commit`).
- Antes de push, si hubo cambios fuera del flujo normal: **`pre-commit run`** (o `pre-commit run --all-files` si aplica).
- No integrar cambios que fallen pre-commit / CI.
- **GitGuardian ggshield** (`id: ggshield`): escanea secretos en el commit. Requiere **`GITGUARDIAN_API_KEY`** (token desde el [dashboard de GitGuardian](https://dashboard.gitguardian.com)) exportada en el entorno o en un archivo que cargues antes de commitear. Sin clave, el hook fallará al autenticar; emergencia puntual (no abusar): `SKIP=ggshield git commit …`.

---

## Seguridad, credenciales y carpeta `supabase/`

### Filtrar credenciales (obligatorio en reglas y en la práctica)

- **Agente y devs:** máximo cuidado al generar texto, diffs, ejemplos de comandos y respuestas: **no pegar ni repetir** API keys, JWT, `service_role`, connection strings completas, contenido de `.env`, claves PEM, tokens OAuth, ni salidas de logs con datos sensibles.
- Si hace falta mostrar forma: usar placeholders (`<REDACTED>`, `env(NOMBRE_VARIABLE)`, `sb_publishable_xxx`).
- En código: secretos solo vía **variables de entorno** o secret manager; nunca hardcode en el repo.

### Qué sí entra en git respecto a Supabase

- **Sí** versionar en el repo lo que define el **proyecto** sin secretos: `supabase/config.toml` (plantilla oficial usa `env(...)` para claves), `supabase/migrations/`, seeds, `supabase/.gitignore`.
- **Sebastián** es quien suele operar **Supabase CLI** en local; igualmente el repo es la **fuente de verdad** del esquema/config para el equipo (Isabel/Santiago siguen con mocks; no necesitan CLI).
- **No** commitear: archivos ignorados por `supabase/.gitignore` (p. ej. `.temp`, `.branches`), ni `.env` / `.env.keys` con claves reales.

---

## Backend (Python 3.13)

- **Ruff:** obligatorio como linter y formatter; configuración en `pyproject.toml` (o equivalente). Preferir invocación vía **`uv run ruff`** cuando el proyecto use uv.
- **Mypy:** obligatorio, tipado estricto; el código mergeado debe pasar `mypy` sin errores en el alcance del proyecto (p. ej. **`uv run mypy`**).

## Frontend (React 18+)

- **ESLint** y **Prettier** obligatorios (scripts vía **npm** en el `package.json` del frontend).
- **TypeScript estricto** (`strict: true` o equivalente).
- **Prohibido** usar `any` (usar tipos concretos, `unknown` con narrowing, o genéricos).

## Git

- Ramas: `feat/[nombre]`, `fix/[nombre]`.
- Commits semánticos: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc. (ej.: `feat: add login`).

### GitHub: quién usa qué

- **Sebastián:** flujo **git** clásico (`git`, remotes, push, PR vía web o lo que prefiera). No asumir `gh` para él.
- **Resto del equipo:** pueden usar **`gh`** (GitHub CLI) para PRs, issues, etc. — suele ser más rápido; el agente puede sugerir comandos `gh` salvo que el contexto sea trabajo explícito de Sebastián.

### Entornos (OS) y Supabase / datos

| Persona        | SO        | Notas |
| -------------- | --------- | ----- |
| **Sebastián**  | **Ubuntu** | Puede usar Supabase CLI, Docker, etc. según su setup. |
| **Isabel**     | **Windows** | Sin Supabase instalado localmente por defecto. |
| **Santiago**   | **Windows** | Sin Supabase instalado localmente por defecto. |

- **Isabel y Santiago** no cuentan con **Supabase local** en su día a día: priorizar **mocks**, fixtures y **`docs/MOCK_DATA.md`** (y documentación asociada) para que puedan desarrollar y testear sin DB real.
- No exigir a todo el equipo comandos tipo `supabase start`, migraciones locales o scripts solo Unix sin ofrecer alternativa o documentar el flujo mínimo.
- Rutas y scripts en docs/comandos: tener en cuenta **Windows vs Linux** (separadores, shell, variables).

## Calidad previa a push

- Debe pasar **pre-commit** (y checks acordados en CI). No pushear roturas conocidas del pipeline local.
