# Commands (`.cursor/commands`)

This folder contains **slash commands** and helpers for AI workflows. In Cursor, each `.md` file is exposed as a slash command (e.g. `plan.md` → `/plan`).

---

## What lives here

- **`*.md`** — Command definitions: frontmatter (`description`) and body (what the command does, when to use it, examples).
- **`*.ps1`** and other scripts — Utilities (e.g. `switch-theme.ps1`); not slash commands by themselves.

Meta / docs (not meant as slash commands): `README.md`, `README-theme-switcher.md`, `ANALISIS-COMANDOS-CURSOR.md`.

---

## Command index

| File | Slash | Purpose |
| ---- | ----- | ------- |
| `plan.md` | `/plan` | Create implementation plan; wait for user confirm before coding |
| `tdd.md` | `/tdd` | Enforce TDD: tests first, then minimal implementation, 80%+ coverage |
| `build-fix.md` | `/build-fix` | Fix TypeScript/build errors step by step |
| `code-review.md` | `/code-review` | Run code review (uses code-reviewer agent) |
| `code-review-checklist.md` | `/code-review-checklist` | Code review checklist |
| `codescene-review.md` | `/codescene-review` | CodeScene-based review |
| `e2e.md` | `/e2e` | Run and fix E2E tests (uses e2e-runner agent) |
| `security-audit.md` | `/security-audit` | Security audit flow |
| `security-scan.md` | `/security-scan` | Security scanning |
| `doctor.md` | `/doctor` | Check hub links, hooks, docs, and discovery health |
| `refactor-clean.md` | `/refactor-clean` | Refactor and clean code |
| `create-pull-request.md` | `/create-pull-request` | Create PR with conventional format |
| `changelog.md` | `/changelog` | Generate or update changelog |
| `test-coverage.md` | `/test-coverage` | Check and improve test coverage |
| `run-all-tests-and-fix-failures.md` | `/run-all-tests-and-fix-failures` | Run full test suite and fix failures |
| `update-docs.md` | `/update-docs` | Update project docs |
| `update-codemaps.md` | `/update-codemaps` | Update code maps |
| `ui-ux-designer.md` | `/ui-ux-designer` | UI/UX design and review |
| `ultra-think.md` | `/ultra-think` | Deep-thinking / planning mode |

---

## How to use

- In Cursor: type `/` and pick a command; the chosen `.md` is used as the prompt/context.
- Commands often refer to agents in `agents/` (e.g. planner, tdd-guide, code-reviewer). When using the hub, agents live under `.cursor/agents/`.
