#!/usr/bin/env bash
# Cursor hook: stop
# Final audit: checks git-modified JS/TS files for console.log when the agent session ends.
# In repos without commits, only checks staged files to avoid scanning the entire tree.

input=$(cat)
project_root="${CURSOR_PROJECT_DIR:-.}"

if ! git -C "$project_root" rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

if git -C "$project_root" rev-parse --verify HEAD >/dev/null 2>&1; then
  modified=$(
    git -C "$project_root" diff --name-only HEAD 2>/dev/null \
      | grep -E '\.(ts|tsx|js|jsx)$' || true
  )
else
  modified=$(
    git -C "$project_root" diff --cached --name-only 2>/dev/null \
      | grep -E '\.(ts|tsx|js|jsx)$' || true
  )
fi

if [ -z "$modified" ]; then
  exit 0
fi

found=false
while IFS= read -r file; do
  full_path="$project_root/$file"
  if [ -f "$full_path" ] && grep -q 'console\.log' "$full_path" 2>/dev/null; then
    echo "[Hook] console.log in: $file" >&2
    found=true
  fi
done <<< "$modified"

if [ "$found" = true ]; then
  echo "[Hook] Remove console.log statements before committing." >&2
fi

exit 0
