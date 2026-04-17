#!/usr/bin/env bash
# Cursor hook: beforeShellExecution
# Blocks destructive commands in Unix shells and PowerShell/CMD.

input=$(cat)
cmd=$(echo "$input" | jq -r '.command // ""')

deny_json() {
  local user_message="$1"
  local agent_message="$2"
  printf '{"permission":"deny","user_message":"%s","agent_message":"%s"}\n' \
    "$user_message" "$agent_message"
  exit 2
}

ask_json() {
  local user_message="$1"
  local agent_message="$2"
  printf '{"permission":"ask","user_message":"%s","agent_message":"%s"}\n' \
    "$user_message" "$agent_message"
  exit 0
}

# Block rm -rf targeting root, home, or current directory.
if echo "$cmd" | grep -qE '(^|[;&|[:space:]])rm\s+-r[fF]*\s+(/|~|\$HOME|\.|\.\/)\s*($|[;&|[:space:]])'; then
  deny_json \
    "Blocked: destructive rm on critical path." \
    "This rm command targets a critical directory. Use a more specific path."
fi

# Block Windows/PowerShell destructive deletes.
if echo "$cmd" | grep -qiE 'Remove-Item\s+.+(-Recurse|-r).*(-Force|-fo)|\bdel\s+(/f|/q|/s).*\*|\brd\s+/s\s+/q\b'; then
  deny_json \
    "Blocked: destructive delete command." \
    "This delete command is too broad for a protected workspace. Use a specific file path."
fi

# Block destructive git resets and cleans.
if echo "$cmd" | grep -qE 'git\s+reset\s+--hard|git\s+checkout\s+--\s|git\s+clean\s+-[[:alnum:]]*f[[:alnum:]]*d'; then
  deny_json \
    "Blocked: destructive git cleanup/reset command." \
    "This git command can discard local work. Use a non-destructive alternative or confirm manually outside the agent."
fi

# Block force push to main/master.
if echo "$cmd" | grep -qE 'git\s+push\s+.*(-f|--force).*(main|master)'; then
  deny_json \
    "Blocked: force push to main/master." \
    "Force pushing to main/master is blocked by project hooks. Use a feature branch or regular push."
fi

# Ask confirmation for other force pushes.
if echo "$cmd" | grep -qE 'git\s+push\s+.*(-f|--force)'; then
  ask_json \
    "This command force-pushes history. Allow?" \
    "Force push detected. Confirm with user before proceeding."
fi

# Ask confirmation for --no-verify (skips pre-commit hooks).
if echo "$cmd" | grep -qE '\-\-no-verify'; then
  ask_json \
    "This command uses --no-verify, skipping safety hooks. Allow?" \
    "The --no-verify flag bypasses pre-commit checks. Confirm with user before proceeding."
fi

# Ask confirmation before force-killing processes.
if echo "$cmd" | grep -qiE '\btaskkill\b.+\s/F\b|\bkill\s+-9\b'; then
  ask_json \
    "This command force-kills a process. Allow?" \
    "Force-kill detected. Confirm with user before proceeding."
fi

exit 0
