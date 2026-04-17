# Agents (`.cursor/agents`)

This folder holds **agent personas** (system prompts) for different roles. Each file is one persona and is referenced by slash commands or used when a role-based behavior is needed.

---

## What lives here

- One Markdown file per agent (e.g. `architect.md`, `planner.md`).
- Frontmatter usually includes: `name`, `description`, `tools`, `model`.
- Body: role, process, principles, and examples.

---

## Agent index

| File                      | Role               | Purpose                                                        |
| ------------------------- | ------------------ | -------------------------------------------------------------- |
| `architect.md`            | Software architect | System design, scalability, technical decisions, trade-offs    |
| `build-error-resolver.md` | Build fixer        | Resolve TypeScript and build errors incrementally              |
| `code-reviewer.md`        | Code reviewer      | Review code for quality, patterns, and best practices          |
| `codescene-standards.md`  | CodeScene          | Apply CodeScene quality and hotspot standards                  |
| `doc-updater.md`          | Doc updater        | Update and structure documentation                             |
| `e2e-runner.md`           | E2E runner         | Run and fix end-to-end tests                                   |
| `planner.md`              | Planner            | Break down features, create implementation plans, assess risks |
| `refactor-cleaner.md`     | Refactor/cleaner   | Refactor and clean up code                                     |
| `security-reviewer.md`    | Security reviewer  | Security-focused code and config review                        |
| `tdd-guide.md`            | TDD guide          | Enforce test-driven development (red–green–refactor)           |
| `testing.md`              | Testing            | General testing strategy and execution                         |
| `vercel-engineering.md`   | Vercel             | React/Next.js performance optimization reference               |

---

## When to use

- **Slash commands** (e.g. `/plan`, `/tdd`, `/code-review`) reference these agents by name.
- Use when you want **consistent role-based behavior** across tools or sessions.
- They also document what “good” looks like for each role for humans.

---

## Paths

- In Cursor (hub): `.cursor/agents/<name>.md`.
- Commands reference agents under `.cursor/agents/`.
