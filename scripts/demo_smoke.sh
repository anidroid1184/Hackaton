#!/usr/bin/env bash
# Demo smoke: arranca stack local y valida login de los 4 roles.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf "\033[1;34m[demo-smoke]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[demo-smoke][ERR]\033[0m %s\n" "$*" >&2; }

load_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
}

wait_for() {
  local url="$1" name="$2" tries="${3:-60}"
  for i in $(seq 1 "$tries"); do
    if curl -fsS -o /dev/null "$url" 2>/dev/null; then
      log "ready: $name ($url)"
      return 0
    fi
    sleep 1
  done
  err "timeout waiting for $name ($url)"
  return 1
}

login_role() {
  local email="$1" password="$2" role_label="$3"
  local supabase_url="${SUPABASE_URL:-http://127.0.0.1:54321}"
  local anon_key="${VITE_SUPABASE_ANON_KEY:-}"
  if [[ -z "$anon_key" ]]; then
    err "VITE_SUPABASE_ANON_KEY missing"
    return 2
  fi
  local response
  response=$(curl -sS -o /tmp/demo_smoke_login.json -w "%{http_code}" \
    -X POST "$supabase_url/auth/v1/token?grant_type=password" \
    -H "apikey: $anon_key" \
    -H "Content-Type: application/json" \
    --data "{\"email\":\"$email\",\"password\":\"$password\"}") || true
  if [[ "$response" == "200" ]]; then
    log "login OK: $role_label <$email>"
    return 0
  fi
  err "login FAIL: $role_label <$email> http=$response body=$(cat /tmp/demo_smoke_login.json 2>/dev/null || true)"
  return 1
}

# 1) Supabase local
if ! supabase status >/dev/null 2>&1; then
  log "starting supabase..."
  supabase start
else
  log "supabase already running"
fi

# 2) DB reset (migraciones + seed)
log "supabase db reset..."
supabase db reset --yes || supabase db reset

load_env

# 3) Seed demo users
log "seeding demo users..."
uv run python scripts/seed_demo_users.py

# 4) Arranque full stack en background
log "booting runserver --simulate (background)..."
: > /tmp/demo_smoke_runserver.log
nohup uv run manage.py runserver --simulate >> /tmp/demo_smoke_runserver.log 2>&1 &
RUNSERVER_PID=$!
echo "$RUNSERVER_PID" > /tmp/demo_smoke_runserver.pid
log "runserver pid=$RUNSERVER_PID (logs: /tmp/demo_smoke_runserver.log)"

# 5) Healthchecks
wait_for "http://127.0.0.1:8000/health" "backend" 60 || true
wait_for "http://127.0.0.1:4010/health"  "mock-hub" 60 || true
wait_for "http://127.0.0.1:5173"         "frontend" 60 || true
wait_for "${SUPABASE_URL:-http://127.0.0.1:54321}/auth/v1/health" "supabase-auth" 30 || true

# 6) Login de los 4 roles
FAIL=0
login_role "${VITE_CLIENT_MOCK_EMAIL:-cliente@solarpulse.local}"      "${VITE_CLIENT_MOCK_PASSWORD:-cliente-demo-2026}"      "cliente"       || FAIL=$((FAIL+1))
login_role "${VITE_OPERATIONS_MOCK_EMAIL:-ops@techorentable.local}"   "${VITE_OPERATIONS_MOCK_PASSWORD:-ops-demo-2026}"      "operaciones"   || FAIL=$((FAIL+1))
login_role "${VITE_CORPORATE_MOCK_EMAIL:-corp@techorentable.local}"   "${VITE_CORPORATE_MOCK_PASSWORD:-corp-demo-2026}"      "corporativo"   || FAIL=$((FAIL+1))
login_role "${VITE_TECHNICIAN_MOCK_EMAIL:-tech@techorentable.local}"  "${VITE_TECHNICIAN_MOCK_PASSWORD:-tech-demo-2026}"     "tecnico"       || FAIL=$((FAIL+1))

if [[ "$FAIL" -gt 0 ]]; then
  err "$FAIL role logins failed"
  exit "$FAIL"
fi

log "ALL CHECKS PASSED. Demo corriendo en http://127.0.0.1:5173 (PID runserver=$RUNSERVER_PID)."
log "Detener: kill \$(cat /tmp/demo_smoke_runserver.pid)"
