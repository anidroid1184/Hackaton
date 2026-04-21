#!/usr/bin/env bash
# =============================================================================
# Huawei FusionSolar API — Smoke test (13 endpoints de lectura)
# =============================================================================
#
# Script para que los equipos verifiquen rápidamente que la API está arriba y
# que su API key tiene acceso correcto a todos los endpoints documentados.
#
# REQUISITO: necesitas tu API key de equipo (formato tk_…). Por seguridad la
#            key NO viene hardcodeada en el archivo — se pasa por variable de
#            entorno TEAM_KEY antes de ejecutar el script.
#
# Uso (macOS / Linux):
#
#   export TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#   bash docs/huawei/smoke_test.sh
#
# En una sola línea:
#
#   TEAM_KEY="tk_XXX..." bash docs/huawei/smoke_test.sh
#
# Opcionalmente puedes sobreescribir el plant/device a probar:
#
#   TEAM_KEY="tk_XXX..." STATION_CODE="NE=33685734" DEV_ID=1000000033685719 \
#     DEV_TYPE_ID=1 bash docs/huawei/smoke_test.sh
#
# Salida esperada al final:
#   - 13 endpoints con HTTP 200 + success=true + failCode=0
#
# Si ves HTTP 401 -> revisa tu TEAM_KEY.
# Si ves HTTP 429 -> rate limit del middleware, espera y reintenta.
# Si ves failCode=407 -> rate limit upstream (Huawei), espera 10 min.
# Si ves HTTP 5xx -> reporta a los organizadores.
# =============================================================================
set -u

BASE="${HUAWEI_BASE_URL:-https://techos.thetribu.dev/huawei}"
PAUSE="${PAUSE:-1}"   # segundos entre llamadas (para no disparar failCode=407)

# --- Validación de TEAM_KEY --------------------------------------------------
if [ -z "${TEAM_KEY:-}" ]; then
  echo "ERROR: falta la variable de entorno TEAM_KEY." >&2
  echo "       Ejemplo: export TEAM_KEY=\"tk_XXXXXXXX...\" && bash $0" >&2
  exit 1
fi
case "$TEAM_KEY" in
  tk_*) : ;;
  *) echo "ERROR: TEAM_KEY debe empezar con 'tk_' (valor recibido: ${TEAM_KEY:0:6}…)." >&2
     exit 1 ;;
esac

KEY="$TEAM_KEY"
RESP_FILE=$(mktemp -t huawei_resp.XXXXXX)
trap 'rm -f "$RESP_FILE"' EXIT

# --- Contadores --------------------------------------------------------------
PASS=0
WARN=0
FAIL=0

run() {
  local label="$1" path="$2" body="$3"
  local http_code

  printf '=== %-4s POST %s ===\n' "$label" "$path"

  http_code=$(curl -sS --http1.1 -o "$RESP_FILE" -w "%{http_code}" \
    -X POST "$BASE$path" \
    -H "Authorization: $KEY" -H "Content-Type: application/json" \
    -d "$body" 2>&1) || true

  if ! [[ "$http_code" =~ ^[0-9]{3}$ ]]; then
    echo "     curl error: $http_code"
    FAIL=$(( FAIL + 1 ))
    echo
    sleep "$PAUSE"
    return 1
  fi

  local success failCode message
  success=$(grep -o '"success":[^,}]*' "$RESP_FILE" | head -n1 | sed 's/.*"success"://')
  failCode=$(grep -o '"failCode":[^,}]*' "$RESP_FILE" | head -n1 | sed 's/.*"failCode"://')
  message=$(grep -o '"message":"[^"]*"' "$RESP_FILE" | head -n1 | sed 's/.*"message":"//;s/"$//' | cut -c1-80)
  [ -z "$success" ]  && success="n/a"
  [ -z "$failCode" ] && failCode="n/a"

  printf '     HTTP %s · success=%s · failCode=%s · %s\n' \
    "$http_code" "$success" "$failCode" "$message"
  head -c 400 "$RESP_FILE"; echo

  if [ "$http_code" = "200" ] && [ "$success" = "true" ] && [ "$failCode" = "0" ]; then
    PASS=$(( PASS + 1 ))
  elif [ "$http_code" = "200" ]; then
    WARN=$(( WARN + 1 ))
  else
    FAIL=$(( FAIL + 1 ))
  fi
  echo
  sleep "$PAUSE"
  return 0
}

# --- Banner ------------------------------------------------------------------
echo "### Huawei smoke-test"
echo "### base URL:    $BASE"
echo "### API key:     ${KEY:0:6}…${KEY: -4}   (enmascarada; completa en \$TEAM_KEY)"

# --- Ventanas de tiempo (ms) -------------------------------------------------
NOW_MS=$(($(date +%s) * 1000))
DAY_AGO_MS=$(( NOW_MS - 86400000 ))
WEEK_AGO_MS=$(( NOW_MS - 7*86400000 ))
echo "### now_ms:      $NOW_MS"
echo "### day_ago_ms:  $DAY_AGO_MS"
echo "### week_ago_ms: $WEEK_AGO_MS"
echo

# --- 0. Descubrimiento dinámico ---------------------------------------------
echo "### Descubriendo plant / device dinámicamente..."

# 1) /thirdData/stations -> elegir la primera planta con capacity > 0
if [ -z "${STATION_CODE:-}" ]; then
  curl -sS -o "$RESP_FILE" -X POST "$BASE/thirdData/stations" \
    -H "Authorization: $KEY" -H "Content-Type: application/json" \
    -d '{"pageNo":1}' >/dev/null

  # Requiere jq para descubrimiento; si no está, el equipo debe pasar STATION_CODE por env.
  if command -v jq >/dev/null 2>&1; then
    STATION_CODE=$(jq -r '[.data.list[] | select(.capacity>0)][0].plantCode // .data.list[0].plantCode // empty' "$RESP_FILE")
  else
    STATION_CODE=$(grep -o '"plantCode":"[^"]*"' "$RESP_FILE" | head -n1 | sed 's/.*"plantCode":"//;s/"$//')
  fi

  if [ -z "$STATION_CODE" ]; then
    echo "ERROR: no pude descubrir STATION_CODE desde /thirdData/stations." >&2
    echo "       Pásalo por env: STATION_CODE='NE=...' $0" >&2
    head -c 400 "$RESP_FILE"; echo
    exit 1
  fi
  sleep "$PAUSE"
fi

# 2) /thirdData/getDevList -> elegir el primer inversor (devTypeId=1)
if [ -z "${DEV_ID:-}" ] || [ -z "${DEV_TYPE_ID:-}" ]; then
  curl -sS -o "$RESP_FILE" -X POST "$BASE/thirdData/getDevList" \
    -H "Authorization: $KEY" -H "Content-Type: application/json" \
    -d "{\"stationCodes\":\"$STATION_CODE\"}" >/dev/null

  if command -v jq >/dev/null 2>&1; then
    DEV_ID=$(jq -r '[.data[] | select(.devTypeId==1)][0].id // .data[0].id // empty' "$RESP_FILE")
    DEV_TYPE_ID=$(jq -r '[.data[] | select(.devTypeId==1)][0].devTypeId // .data[0].devTypeId // empty' "$RESP_FILE")
  else
    # Fallback sin jq: busca un objeto cuyo devTypeId sea 1 y saca el id.
    DEV_ID=$(grep -o '"id":[0-9]*' "$RESP_FILE" | head -n1 | sed 's/.*"id"://')
    DEV_TYPE_ID=1
  fi

  if [ -z "$DEV_ID" ] || [ -z "$DEV_TYPE_ID" ]; then
    echo "ERROR: no pude descubrir DEV_ID / DEV_TYPE_ID desde /thirdData/getDevList." >&2
    echo "       Pásalos por env: DEV_ID=... DEV_TYPE_ID=... $0" >&2
    head -c 400 "$RESP_FILE"; echo
    exit 1
  fi
  sleep "$PAUSE"
fi

echo "### STATION_CODE: $STATION_CODE"
echo "### DEV_ID:       $DEV_ID"
echo "### DEV_TYPE_ID:  $DEV_TYPE_ID"
echo

# --- 1. Plantas (station, 3) -------------------------------------------------
run "#1"  "/thirdData/stations"           '{"pageNo":1}'
run "#2"  "/thirdData/getStationList"     '{"pageNo":1,"pageSize":50}'
run "#3"  "/thirdData/getStationRealKpi"  "{\"stationCodes\":\"$STATION_CODE\"}"

# --- 2. Dispositivos (device, 2) --------------------------------------------
run "#4"  "/thirdData/getDevList"         "{\"stationCodes\":\"$STATION_CODE\"}"
run "#5"  "/thirdData/getDevRealKpi"      "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID}"

# --- 3. KPI histórico planta (4) --------------------------------------------
run "#6"  "/thirdData/getKpiStationHour"  "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
run "#7"  "/thirdData/getKpiStationDay"   "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
run "#8"  "/thirdData/getKpiStationMonth" "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"
run "#9"  "/thirdData/getKpiStationYear"  "{\"stationCodes\":\"$STATION_CODE\",\"collectTime\":$NOW_MS}"

# --- 4. KPI histórico dispositivo (3 + 1 historyKpi) ------------------------
run "#10" "/thirdData/getDevKpiDay"       "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"collectTime\":$NOW_MS}"
run "#11" "/thirdData/getDevKpiMonth"     "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"collectTime\":$NOW_MS}"
run "#12" "/thirdData/getDevKpiYear"      "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"collectTime\":$NOW_MS}"
run "#13" "/thirdData/getDevHistoryKpi"   "{\"devIds\":\"$DEV_ID\",\"devTypeId\":$DEV_TYPE_ID,\"startTime\":$DAY_AGO_MS,\"endTime\":$NOW_MS}"

# --- 5. Alarmas (1) ----------------------------------------------------------
run "#14" "/thirdData/getAlarmList"       "{\"stationCodes\":\"$STATION_CODE\",\"beginTime\":$WEEK_AGO_MS,\"endTime\":$NOW_MS}"

# --- Resumen -----------------------------------------------------------------
TOTAL=$(( PASS + WARN + FAIL ))
echo "============================================================"
echo " Resumen: $TOTAL endpoints probados"
echo "   OK    (HTTP 200 + success=true + failCode=0): $PASS"
echo "   WARN  (HTTP 200 pero failCode != 0):          $WARN   <- reachable, ver notas"
echo "   FAIL  (HTTP no-200 o curl err):               $FAIL"
echo "============================================================"

if [ "$FAIL" -gt 0 ]; then
  exit 2
fi
if [ "$WARN" -gt 0 ]; then
  exit 1
fi
exit 0
