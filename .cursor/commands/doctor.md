---
description: Run a hub health check for links, hooks, docs, and skill naming issues.
---

# Doctor

## Overview

Run the existing `cursor-hub doctor` command and summarize the result in plain language.

## When to Use

Use `/doctor` when:

- Hooks are not firing as expected
- A project install looks incomplete
- You changed `.cursor` assets and want a quick integrity check
- You want to confirm command, agent, and skill discovery still looks healthy

## What to Check

1. Run:

```bash
node .cursor/scripts/cursor-hub.mjs doctor --project "<project-root>"
```

1. Review:

- Project links like `.cursor`, `.github/copilot-instructions.md`, `.claude/skills`
- Exported artifacts under `dist/exports/`
- `hooks.json` parse errors
- Missing hook scripts referenced by config
- Missing key READMEs
- Invalid skill names for OpenCode compatibility
- Nested `.cursor` directories inside the hub root

1. Report:

- What passed
- What is missing or suspicious
- The smallest next fix

## Notes

- Prefer fixing broken paths and stale config before adding new rules or hooks.
- If the doctor output is clean but behavior is still wrong, inspect the specific script or target tool next.
