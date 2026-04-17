#!/usr/bin/env bash
# Cursor hook: afterFileEdit
# Warns if console.log is found in the edited file.

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // ""')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx)
    matches=$(grep -n 'console\.log' "$file_path" 2>/dev/null || true)
    if [ -n "$matches" ]; then
      echo "[Hook] console.log found in $(basename "$file_path"):" >&2
      echo "$matches" | head -5 >&2
      echo "[Hook] Remove before committing." >&2
    fi
    ;;
esac

exit 0
