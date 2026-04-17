# Cursor hooks

Project-level hooks for Cursor Agent. Drop the `.cursor/` folder into any project to activate.

Reference: [Cursor Hooks Docs](https://cursor.com/docs/agent/hooks)

---

## How it works

- `.cursor/hooks.json` defines which scripts run at which hook events.
- Scripts live in `.cursor/hooks/` and run from the **project root**.
- Scripts receive JSON on stdin, write messages to stderr, and exit with:
  - `0` = success / allow
  - `2` = deny (block the action)
  - Other = hook failed, action continues (fail-open)
- Each hook has a `timeout` (in seconds) to prevent hanging processes.

---

## Active hooks

### afterFileEdit

Fires after the agent edits any file. Two scripts run in sequence:

1. **`after-edit-lint.sh`** (15s) -- Formats with Prettier and fixes with ESLint, but only when the project has their config files at root. In repos without config, the script exits immediately and produces no output.
2. **`after-edit-console-warn.sh`** (5s) -- Warns via stderr if `console.log` appears in the edited JS/TS file. Silent when nothing is found.

### beforeShellExecution

Fires only when the agent runs a command matching the `matcher` pattern (destructive deletes, force pushes, `--no-verify`, force kills). The script either blocks the command or asks for confirmation. Does not fire on regular commands.

- **`before-shell-guard.sh`** (5s)

### afterShellExecution

Fires after every shell command completes. The script only produces output when the command was `gh pr create`.

- **`after-shell-pr.sh`** (5s) -- Extracts and prints the PR URL.

### stop

Fires once when the agent turn ends.

- **`stop-console-audit.sh`** (10s) -- Checks git-modified JS/TS files for leftover `console.log`. In repos without commits yet, only checks staged files (not the entire tree).

---

## Removed: preToolUse prompt review

The original config included a `preToolUse` hook with `type: "prompt"` that reviewed every `Write`/`ApplyPatch`/`EditNotebook` operation before applying it. This hook was removed because prompt-type hooks open Cursor's hook evaluation UI before each edit, which steals focus from the chat panel. There is no way to make a prompt hook silent; the interruption is architectural. The fallback review it provided (catching empty catch blocks, silent defaults) is better handled by linter rules or code review, not by blocking every file write.

---

## Pipeline

```text
Agent edits a file
  ├── [afterFileEdit] Auto-format if project has Prettier/ESLint config
  └── [afterFileEdit] Warn on console.log (silent when clean)

Agent runs a shell command
  ├── [beforeShellExecution] Guard (only on dangerous commands via matcher)
  └── [afterShellExecution] Log PR URL after gh pr create

Agent turn ends
  └── [stop] Final console.log audit on modified files
```

---

## Requirements

- **jq** -- all scripts use it to parse JSON input from Cursor
- **npx** -- used by lint hook (comes with Node.js)
- Cursor on Windows runs hook scripts through its own bash-compatible runtime

---

## Customization

To add a new hook, create a script in `.cursor/hooks/` and register it in `hooks.json`:

```json
{
  "afterFileEdit": [{ "command": ".cursor/hooks/your-new-hook.sh", "timeout": 10 }]
}
```

Use `matcher` on `beforeShellExecution` to filter by command pattern:

```json
{
  "beforeShellExecution": [
    {
      "command": ".cursor/hooks/your-guard.sh",
      "matcher": "docker|kubectl"
    }
  ]
}
```
