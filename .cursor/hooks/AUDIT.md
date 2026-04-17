# Hooks audit

<!-- Generated: 2026-03-27 18:13:12 UTC -->

## Scope

Review of `.cursor/hooks.json` and all scripts in `.cursor/hooks/`.
Goal: keep automation active while eliminating unnecessary interruptions.

## Verdict by hook

| Hook | Purpose | Problem found | Fix applied | Status |
| ---- | ------- | ------------- | ----------- | ------ |
| `after-edit-lint.sh` | Auto-format and lint after edits | Ran Prettier even in repos without config, causing latency with no benefit | Now checks for Prettier/ESLint config before running; silent exit when no config found | Active |
| `after-edit-console-warn.sh` | Warn on `console.log` in edited files | None; already silent when nothing found | No change needed | Active |
| `before-shell-guard.sh` | Block destructive shell commands | None | No change needed | Active |
| `after-shell-pr.sh` | Log PR URL after `gh pr create` | None | No change needed | Active |
| `stop-console-audit.sh` | Final `console.log` audit at end of agent turn | In repos without commits, scanned ALL tracked+untracked JS/TS files | Now only checks staged files when no commits exist | Active |
| `preToolUse` prompt review | Review edits before `Write`/`ApplyPatch`/`EditNotebook` | Prompt-type hooks open Cursor's hook UI before every edit, stealing focus from chat | Removed from `hooks.json`; no script-level fix possible for this event type | Removed |

## Why preToolUse was the only hook removed

The other hooks write to stderr on specific conditions and produce no UI beyond that. A `preToolUse` hook with `type: "prompt"` is different: it triggers a model evaluation step inside Cursor's UI before applying the edit. That evaluation renders in the hook panel and pulls focus away from the chat. The interruption is not caused by the prompt text or the timeout; it is how Cursor processes prompt hooks. There is no silent mode for this event type.

The fallback-detection logic it provided (empty catch blocks, silent defaults masking missing config) should be enforced through linter rules or code review instead.

## What changed in the scripts

### after-edit-lint.sh

Before: always ran `npx prettier --write` on matching files, even without project config. ESLint was already conditional.

After: checks for Prettier config files (`.prettierrc`, `prettier.config.*`) before running. Both Prettier and ESLint are conditional on project config. All stdout/stderr suppressed on success. Uses `npx --yes` to avoid interactive install prompts.

### stop-console-audit.sh

Before: in repos without commits, combined `ls-files --cached` and `ls-files --others --exclude-standard`, scanning every JS/TS file in the tree.

After: in repos without commits, only checks `diff --cached` (staged files). Untracked, unstaged files are not scanned until they enter the staging area.
