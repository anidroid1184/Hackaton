#!/usr/bin/env bash
# =============================================================================
# Growatt OpenAPI v1 — Smoke test (9 endpoints de lectura)
# =============================================================================
#
# Script para que los equipos verifiquen rápidamente que la API Growatt está
# arriba y que su API key tiene acceso correcto a los endpoints documentados.
#
# REQUISITO: necesitas tu API key de equipo (formato tk_…). Por seguridad la
#            key NO viene hardcodeada en el archivo — se pasa por variable de
#            entorno TEAM_KEY antes de ejecutar el script.
#
# Uso (macOS / Linux):
#
#   export TEAM_KEY="tk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
#   bash growatt/smoke_test.sh
#
# En una sola línea:
#
#   TEAM_KEY="tk_XXX..." bash growatt/smoke_test.sh
#
# Opcionalmente puedes sobreescribir la planta/dispositivo de prueba. Por
# defecto se descubren dinámicamente (primera planta con status=1 en
# /v1/plant/list, primer device_sn en /v1/device/list):
#
#   TEAM_KEY="tk_XXX..." PLANT_ID=1234567 DEVICE_SN="ABC1234567" \
#     bash growatt/smoke_test.sh
#
# Salida esperada (con la cuenta de producción actual):
#   - 6 endpoints OK      (error_code 0):  plant/list, plant/details,
#                          plant/data, plant/power, plant/energy, device/list
#   - 2 endpoints WARN    (error_code 10011 error_permission_denied):
#                          tlx_data_info y mix_data_info cuando el DEVICE_SN
#                          no es de tipo 7 (MIN/TLX) ni 5 (SPH/MIX). Es normal.
#   - 1 endpoint  OK/WARN (tlx_set_info): con device_sn de otro tipo devuelve
#                          error_code=0 pero data vacío.
#
# Si ves HTTP 401 -> revisa tu TEAM_KEY.
# Si ves HTTP 429 -> rate limit del middleware, espera y reintenta.
# Si ves error_code 10012 -> rate limit UPSTREAM (Growatt); espera ~5 min.
# Si ves HTTP 5xx -> reporta a los organizadores.
# =============================================================================
set -u

BASE="${GROWATT_BASE_URL:-https://techos.thetribu.dev/growatt}"

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

# --- Cálculo de fechas (portable macOS/Linux) --------------------------------
TODAY=$(date -u +%Y-%m-%d)
if WEEK_AGO=$(date -u -v-6d +%Y-%m-%d 2>/dev/null); then
  :
elif WEEK_AGO=$(date -u -d "6 days ago" +%Y-%m-%d 2>/dev/null); then
  :
else
  echo "ERROR: no pude calcular la fecha de hace 6 días con este 'date'." >&2
  exit 1
fi

# --- Archivos temporales -----------------------------------------------------
WORK=$(mktemp -d -t growatt_smoke.XXXXXX)
RESP_FILE="$WORK/resp.bin"
BODY_FILE="$WORK/body.txt"
trap 'rm -rf "$WORK"' EXIT

# --- Detección de capacidades de decodificación ------------------------------
HAS_BROTLI_PY=0
if python3 -c "import brotli" >/dev/null 2>&1; then
  HAS_BROTLI_PY=1
fi
# curl puede no soportar brotli (p. ej. macOS default solo trae zlib). Siempre
# mandamos --compressed cuando existe: si curl tiene brotli, decodifica solo;
# si no, al menos decodifica gzip/deflate.
CURL_COMPRESSED=""
if curl --help all >/dev/null 2>&1; then
  if curl --help all 2>&1 | grep -q -- '--compressed'; then
    CURL_COMPRESSED="--compressed"
  fi
else
  # fallback para curl viejos: --help sin 'all'
  if curl --help 2>&1 | grep -q -- '--compressed'; then
    CURL_COMPRESSED="--compressed"
  fi
fi

# --- Decodificador: lee $RESP_FILE binario y deja texto en $BODY_FILE --------
# Estrategia: intentar parsear como JSON; si falla, intentar brotli; como
# último recurso copiar tal cual (será binario ilegible para el humano).
decode_body() {
  if python3 - <<PY 2>/dev/null; then return 0; fi
import json, sys
raw = open('$RESP_FILE','rb').read()
try:
    s = raw.decode('utf-8')
    json.loads(s)
    open('$BODY_FILE','wb').write(raw)
    sys.exit(0)
except Exception:
    pass
try:
    import brotli
    dec = brotli.decompress(raw)
    json.loads(dec.decode('utf-8'))
    open('$BODY_FILE','wb').write(dec)
    sys.exit(0)
except Exception:
    pass
sys.exit(1)
PY
  # Si nada funcionó copiamos raw (quedará binario).
  cp "$RESP_FILE" "$BODY_FILE"
  return 0
}

# --- Contadores --------------------------------------------------------------
PASS=0
WARN=0
FAIL=0

run() {
  local label="$1" path="$2"
  local http_code

  printf '=== %-4s GET %s ===\n' "$label" "$path"

  # shellcheck disable=SC2086
  http_code=$(curl -sS $CURL_COMPRESSED -o "$RESP_FILE" -w "%{http_code}" \
      -H "Authorization: $KEY" \
      "$BASE$path" 2>&1) || true

  if ! [[ "$http_code" =~ ^[0-9]{3}$ ]]; then
    echo "     curl error: $http_code"
    FAIL=$(( FAIL + 1 ))
    echo
    return
  fi

  decode_body

  # Extrae error_code sin depender de jq
  local ec
  ec=$(grep -o '"error_code":[^,}]*' "$BODY_FILE" | head -n1 | sed 's/.*"error_code"://;s/[^0-9-]//g')
  [ -z "$ec" ] && ec="n/a"

  printf '     HTTP %s · error_code=%s\n' "$http_code" "$ec"
  head -c 500 "$BODY_FILE"; echo

  # Clasificación
  if [ "$http_code" = "200" ] && [ "$ec" = "0" ]; then
    PASS=$(( PASS + 1 ))
  elif [ "$http_code" = "200" ]; then
    # 200 + error_code dominio (10011, 10012, etc.): reachable pero con nota
    WARN=$(( WARN + 1 ))
  else
    FAIL=$(( FAIL + 1 ))
  fi
  echo
}

extract_json_field() {
  # $1: path al archivo JSON, $2: código python que recibe 'd' (objeto JSON)
  # y debe imprimir el valor extraído por stdout. Silencia excepciones.
  python3 - "$1" "$2" <<'PY' 2>/dev/null
import json, sys
path, code = sys.argv[1], sys.argv[2]
try:
    d = json.load(open(path))
except Exception:
    sys.exit(0)
try:
    exec(code)
except Exception:
    pass
PY
}

# --- Banner ------------------------------------------------------------------
echo "### Growatt smoke-test"
echo "### base URL:    $BASE"
echo "### API key:     ${KEY:0:6}…${KEY: -4}   (enmascarada; completa en \$TEAM_KEY)"
echo "### brotli py:   $HAS_BROTLI_PY    curl compressed: ${CURL_COMPRESSED:-no}"
echo "### window:      $WEEK_AGO → $TODAY"
echo

# --- 1. plant/list ------------------------------------------------------------
# (Intervalos de 3–4 s entre llamadas para evitar error_code 10012 upstream.)

run "#1" "/v1/plant/list"
# Descubre PLANT_ID si no vino por env.
if [ -z "${PLANT_ID:-}" ]; then
  PLANT_ID=$(extract_json_field "$BODY_FILE" "
plants = d.get('data',{}).get('plants',[])
best=None
for p in plants:
    cp=float(p.get('current_power') or 0)
    pk=float(p.get('peak_power') or 0)
    st=int(p.get('status') or 0)
    # prefer status=1 online
    score = (st==1)*1e9 + cp*1e6 + pk
    if best is None or score>best[0]:
        best=(score, p.get('plant_id'))
if best: print(best[1])
")
fi

if [ -z "${PLANT_ID:-}" ]; then
  echo "WARN: no se pudo descubrir un plant_id desde /v1/plant/list."
  echo "      Define PLANT_ID manualmente y vuelve a correr:"
  echo "      TEAM_KEY=... PLANT_ID=1234 bash $0"
  echo
  TOTAL=$(( PASS + WARN + FAIL ))
  echo "============================================================"
  echo " Resumen parcial: $TOTAL endpoints probados"
  echo "   OK    (HTTP 200 + error_code 0): $PASS"
  echo "   WARN  (HTTP 200 + error_code ≠ 0): $WARN"
  echo "   FAIL  (HTTP no-200 o curl err):   $FAIL"
  echo "============================================================"
  exit 2
fi

echo ">>> usando PLANT_ID=$PLANT_ID"
echo
sleep 3

# --- 2–6. plant/* -------------------------------------------------------------
run "#2" "/v1/plant/details?plant_id=$PLANT_ID"
sleep 3
run "#3" "/v1/plant/data?plant_id=$PLANT_ID"
sleep 3
run "#4" "/v1/plant/power?plant_id=$PLANT_ID&date=$TODAY"
sleep 3
run "#5" "/v1/plant/energy?plant_id=$PLANT_ID&start_date=$WEEK_AGO&end_date=$TODAY&time_unit=day"
sleep 3

# --- 7. device/list ----------------------------------------------------------
run "#6" "/v1/device/list?plant_id=$PLANT_ID"

# Descubre DEVICE_SN si no vino por env.
if [ -z "${DEVICE_SN:-}" ]; then
  DEVICE_SN=$(extract_json_field "$BODY_FILE" "
devs = d.get('data',{}).get('devices',[])
for dv in devs:
    sn = dv.get('device_sn')
    if sn and sn != 'meter':
        print(sn); break
")
fi

if [ -z "${DEVICE_SN:-}" ]; then
  echo "WARN: no se pudo descubrir un device_sn. Salto los endpoints 7–9."
else
  echo ">>> usando DEVICE_SN=$DEVICE_SN"
  echo
  sleep 3

  # --- 7–9. inverter type-specific -----------------------------------------
  run "#7" "/v1/device/tlx/tlx_data_info?device_sn=$DEVICE_SN"
  sleep 3
  run "#8" "/v1/device/tlx/tlx_set_info?device_sn=$DEVICE_SN"
  sleep 3
  run "#9" "/v1/device/mix/mix_data_info?device_sn=$DEVICE_SN"
fi

# --- Resumen -----------------------------------------------------------------
TOTAL=$(( PASS + WARN + FAIL ))
echo "============================================================"
echo " Resumen: $TOTAL endpoints probados"
echo "   OK    (HTTP 200 + error_code 0): $PASS"
echo "   WARN  (HTTP 200 + error_code ≠ 0): $WARN   <- normalmente 10011 en tlx/mix con device_type incorrecto"
echo "   FAIL  (HTTP no-200 o curl err):   $FAIL"
echo "============================================================"

if [ "$FAIL" -gt 0 ]; then
  exit 2
fi
exit 0
