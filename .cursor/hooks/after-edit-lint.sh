#!/usr/bin/env bash
# Cursor hook: afterFileEdit
# Auto-formats edited files with Prettier when available.
# Runs ESLint --fix only if the project has an ESLint config.
# Silent on success; only writes to stderr on actual problems.

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // ""')

if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
  exit 0
fi

if ! command -v npx >/dev/null 2>&1; then
  exit 0
fi

project_root="${CURSOR_PROJECT_DIR:-.}"

has_prettier=false
for cfg in .prettierrc .prettierrc.json .prettierrc.js .prettierrc.cjs .prettierrc.yml prettier.config.js prettier.config.cjs prettier.config.mjs; do
  if [ -f "$project_root/$cfg" ]; then
    has_prettier=true
    break
  fi
done

has_eslint=false
for cfg in .eslintrc.json .eslintrc.js .eslintrc.cjs .eslintrc.yml eslint.config.js eslint.config.mjs eslint.config.ts; do
  if [ -f "$project_root/$cfg" ]; then
    has_eslint=true
    break
  fi
done

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.scss|*.md)
    if [ "$has_prettier" = true ]; then
      npx --yes prettier --write "$file_path" >/dev/null 2>&1 || true
    fi
    ;;
esac

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx)
    if [ "$has_eslint" = true ]; then
      lint_output=$(npx --yes eslint --fix "$file_path" 2>&1) || true
      if [ -n "$lint_output" ]; then
        echo "$lint_output" | head -5 >&2
      fi
    fi
    ;;
esac

# Rootwave: Python — Ruff si existe pyproject.toml y el binario ruff (docs/CONVENTIONS.md)
case "$file_path" in
  *.py)
    if [ -f "$project_root/pyproject.toml" ] && command -v ruff >/dev/null 2>&1; then
      ruff format "$file_path" >/dev/null 2>&1 || true
      ruff check --fix "$file_path" >/dev/null 2>&1 || true
    fi
    ;;
esac

exit 0
