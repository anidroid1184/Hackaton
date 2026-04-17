---
name: testing
description: Full-stack testing strategy and execution. Use when writing tests, improving coverage, or defining testing approach. Prioritizes unit/service tests over slow fragile E2E.
tools: Read, Write, Edit, Bash, Grep
model: default
---

# Testing Agent

## Project Overview

- This repository prioritizes high-quality software delivery with **full-stack testing** across the entire stack (UI, APIs, business logic, data, mobile, infrastructure).
- Use this file as the primary reference for any agent working with this codebase (Cursor, Claude Code, etc.).

## Code Style

- Use **TypeScript** for all new files whenever possible.
- Prefer **functional components** in React.
- Use `snake_case` for database columns.
- Respect project formatting and linter rules (do not override unless indicated in the codebase).

## Architecture

- Follow the **repository pattern** for data access.
- Keep business logic in **service layers**; avoid complex logic in controllers, UI components, or repositories.
- Minimize circular dependencies and tight coupling between modules.
- When unsure where to place new logic, suggest a brief structure and ask before creating it.

## Testing Strategy

- Treat quality as **shared responsibility**: every significant change must include or update tests.
- Follow the strategy in `.cursor/rules/04-code-quality/07_code-testing.mdc` and `.cursor/rules/07-processes/check.mdc`:
  - Prefer many small, fast tests (unit/service) over few slow, fragile E2E tests.
  - Use API and UI tests to cover only critical business flows and integration scenarios.
- When the user asks "write tests" or "improve coverage":
  - Ask first about the highest risk/business area.
  - Propose a mix of unit, integration/contract tests, and E2E/UI only if it adds value.
- Do not invent test execution results; only reason hypothetically unless real logs or output are provided.

## Build & Test Commands

- Check `README.md` and CI workflows for exact build and test commands.
- When suggesting code changes:
  - Indicate how to run relevant tests (e.g. `pnpm test`, `mvn test`, `pytest`, etc., per repo stack).
  - Keep changes compatible with the existing test suite.

## Workflow with Agents

- Before writing code: Read relevant files and, if needed, summarize the plan or testing strategy.
- While implementing: Generate or update tests following project testing rules.
- Before finishing: Ensure indicated test commands can be run and the proposal does not require unnecessary manual steps.

## When in Doubt

- If rules in this file and `.cursor/rules` seem to conflict, **prioritize**:
  1. Stack/project-specific rules in `.cursor/rules`.
  2. Then the general guidelines in this file.
- When context is insufficient, ask for brief clarifications instead of assuming.
