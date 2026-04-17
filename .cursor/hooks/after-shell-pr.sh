#!/usr/bin/env bash
# Cursor hook: afterShellExecution
# Logs the PR URL and review command after gh pr create.

input=$(cat)
cmd=$(echo "$input" | jq -r '.command // ""')
output=$(echo "$input" | jq -r '.output // ""')
if echo "$cmd" | grep -qE 'gh\s+pr\s+create'; then
  pr_url=$(echo "$output" | grep -oE 'https://github.com/[^/]+/[^/]+/pull/[0-9]+' || true)
  if [ -n "$pr_url" ]; then
    pr_num=$(echo "$pr_url" | grep -oE '[0-9]+$')
    echo "[Hook] PR created: $pr_url" >&2
    echo "[Hook] Review: gh pr view $pr_num" >&2
  fi
fi

exit 0
