# Rules (`.cursor/rules`)

This folder contains **behavior rules** for AI agents: code quality, security, workflows, and language- or domain-specific guidance. Cursor loads `.mdc` files from here recursively.

### Rootwave (este repo)

- **Precedencia:** `docs/` por encima de reglas genéricas del hub; ver `rootwave-ai-guidelines.mdc`.
- **Caveman:** default (`docs/AGENTS.md`). `human.mdc` es bajo demanda (no `alwaysApply`).
- **Estándares JS/TS:** `04-code-quality/01_code-standards.mdc` usa **globs** (`*.ts`, `*.tsx`, …). **npm** para JS; **uv** para Python (`docs/CONVENTIONS.md`).
- **Config alineada al stack:** `cursor-config.json` → FastAPI, Ruff, Mypy, React+Vite, **npm**, **uv**, **pre-commit**.

---

## Folder layout

| Folder                      | Contents                                                                                                          | alwaysApply                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `00-agent-behavior/`        | Agent orchestration, cursor tools, prompting style, humanizer, minimax model rules                                | Mixed (orchestration + policies: true; humanizer: false) |
| `01-domain/`                | Backend API, mobile, web, cross-platform, DevOps/infra                                                            | false                                      |
| `02-front-end/`             | React/Next.js patterns, UI components, i18n                                                                       | false                                      |
| `03-languages/`             | Flutter, Go, Python, Rust, Swift                                                                                  | false                                      |
| `04-code-quality/`          | Standards, linting, error handling, architecture, complexity, performance, testing, spelling, CodeScene, patterns | Mixed (Rootwave: `01_code-standards` por globs) |
| `05-development-workflows/` | Commits, PRs, git workflow, hooks                                                                                 | Mixed                                      |
| `06-documentation/`         | ADRs, doc creation, Mermaid diagrams                                                                              | false                                      |
| `07-processes/`             | Check/verify, Codacy, pre-commit setup, screenshots, doc updates                                                  | Mixed                                      |
| `08-problem-solving/`       | Issue analysis, bug fixes, Five Whys                                                                              | false                                      |
| `09-monitoring/`            | Logging, performance profiling, agent performance                                                                 | false                                      |
| `10-security/`              | Security standards, env protection, hardcoding policy, cybersecurity, testing                                     | Mixed                                      |
| `react-best-practices/`     | 40+ granular Vercel React/Next.js performance rules                                                               | false (requestable)                        |

### Root files

| File                 | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `README.md`          | This file                                        |
| `RULE.md`            | Short constitution for assistants (non-negotiables + pointers) |
| `cursor-config.json` | Project config (workflows, file limits, testing) |

---

## alwaysApply rules (Rootwave, estado actual)

Inyectadas en cada conversación (ver `alwaysApply` en el frontmatter de cada `.mdc`):

- `rootwave-ai-guidelines.mdc` — canon `docs/`, caveman, Engram, arquitectura
- `00-agent-behavior/cursor-agent-orchestration.mdc` — flujo agente / herramientas
- `00-agent-behavior/skills-audit-policy.mdc` — política de skills
- `00-agent-behavior/no-k-dense-product-promotion.mdc`
- `10-security/security-env.mdc` — variables de entorno
- `10-security/hardcoding-policy.mdc` — política de hardcoding

El resto son **bajo demanda** (`alwaysApply: false`, `globs`, o petición explícita), p. ej. `04-code-quality/01_code-standards.mdc` para archivos `*.{ts,tsx,js,jsx}`, `human.mdc` si se pide prosa “humana”, reglas `07-processes/*`, `10-security/security.mdc`, etc.

---

## Conventions

- Prefer **small, focused** rule files over large monoliths.
- Rules should be **actionable** and **testable**.
- Use **`description`**, **`alwaysApply`**, and **`globs`** in frontmatter so Cursor can decide when to apply them.
- Keep `alwaysApply: true` to a minimum -- every always-on rule consumes context window in every conversation.

---

## Trade-offs to watch

Nothing here is “wrong,” but these are the usual pressure points:

1. **Many rules with `alwaysApply: true`**
   This README already says to **limit** always-on rules: each one is injected into **every** chat and uses context window. A long list fits a very strict default policy; the cost is less room for code and conversation, and sometimes rules that are not relevant to the task at hand.

2. **Overlap across always-on blocks**
   Agent behavior, code quality, and security often ship together by default. That can be **intentional policy**. If you notice the same idea repeated across several `.mdc` files, prefer **one canonical section** and link or trim duplicates instead of copying paragraphs.

3. **Mixed file naming**
   Examples like `01_code-standards.mdc` vs `server-cache-react.mdc` follow different styles; within a folder there is usually a reason (numeric ordering vs topic slug). It does not break anything—it mainly affects **sort order when listing** and how easy names are to **remember**. If it bothers you, document a convention per folder (or a gradual rename plan) in this README.
