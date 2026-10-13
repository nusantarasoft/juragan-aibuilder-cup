#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# smoke-umkm.sh — post-deploy health + consult smoke (non-destructive).
#
# Run on the production server inside /opt/nusantarasoft-3 (or repo root locally
# when the nsoft3 stack is up). No ledger writes, no outbound WA messages,
# no secrets printed to stdout.
#
#   cd /opt/nusantarasoft-3 && bash scripts/master-production/smoke-umkm.sh
#
# Also invoked as the final step of scripts/master-production/redeploy.sh
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$DIR/scripts/master-production"
EF="${NSOFT3_ENV_FILE:-$DIR/.env.master-production}"
HERMES_CONTAINER="${HERMES_CONTAINER:-nsoft3-hermes}"
MIDDLEWARE_CONTAINER="${MIDDLEWARE_CONTAINER:-nsoft3-middleware}"
GRAPHQL_URL="${SMOKE_GRAPHQL_URL:-http://127.0.0.1:8090/graphql}"
HERMES_HOME="${HERMES_HOME:-$DIR/volumes/hermes}"

failures=0

log_pass() { echo "PASS  $*"; }
log_fail() { echo "FAIL  $*"; failures=$((failures + 1)); }
log_skip() { echo "SKIP  $*"; }

# Read one key from env file (or process env override). Never echo the value.
env_get() {
  local key="$1"
  if [[ -n "${!key:-}" ]]; then
    printf '%s' "${!key}"
    return 0
  fi
  if [[ ! -f "$EF" ]]; then
    return 1
  fi
  local line val
  line="$(grep -E "^${key}=" "$EF" 2>/dev/null | tail -1 || true)"
  [[ -n "$line" ]] || return 1
  val="${line#*=}"
  val="${val%$'\r'}"
  val="${val#\"}"
  val="${val%\"}"
  val="${val#\'}"
  val="${val%\'}"
  printf '%s' "$val"
}

echo "==> smoke-umkm (env file: ${EF##*/})"

# ── 1) GraphQL via nginx :8090 ─────────────────────────────────────────────
gql_body='{"query":"{ __typename }"}'
gql_code=""
if command -v curl >/dev/null 2>&1; then
  gql_code="$(curl -sS -o /dev/null -w '%{http_code}' \
    -X POST "$GRAPHQL_URL" \
    -H 'Content-Type: application/json' \
    -d "$gql_body" 2>/dev/null || echo "000")"
else
  gql_code="000"
fi
if [[ "$gql_code" == "200" ]]; then
  log_pass "graphql POST $GRAPHQL_URL → 200"
else
  log_fail "graphql POST $GRAPHQL_URL → ${gql_code:-err} (want 200)"
fi

# ── 2–3) Internal kasir-consult (401 without key; 200 + text with key) ───
if ! docker inspect "$MIDDLEWARE_CONTAINER" >/dev/null 2>&1; then
  log_fail "middleware container $MIDDLEWARE_CONTAINER not found"
else
  unauth_out=""
  unauth_out="$(docker exec "$MIDDLEWARE_CONTAINER" node -e "
fetch('http://127.0.0.1:4001/internal/kasir-consult', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'tanya' }),
}).then(r => { console.log(String(r.status)); })
 .catch(() => { console.log('0'); process.exit(1); });
" 2>/dev/null | tail -1 || echo "0")"
  if [[ "$unauth_out" == "401" ]]; then
    log_pass "POST /internal/kasir-consult without key → 401"
  else
    log_fail "POST /internal/kasir-consult without key → ${unauth_out:-err} (want 401)"
  fi

  consult_key=""
  if ! consult_key="$(env_get KASIR_CONSULT_KEY)"; then
    log_fail "KASIR_CONSULT_KEY missing in env / $EF (cannot run authed consult probe)"
  elif [[ -z "$consult_key" ]]; then
    log_fail "KASIR_CONSULT_KEY empty (cannot run authed consult probe)"
  else
    auth_json=""
    auth_json="$(docker exec -e KASIR_CONSULT_KEY="$consult_key" "$MIDDLEWARE_CONTAINER" node -e "
const key = process.env.KASIR_CONSULT_KEY || '';
fetch('http://127.0.0.1:4001/internal/kasir-consult', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-kasir-consult-key': key,
  },
  body: JSON.stringify({ question: 'tanya apa itu modal kerja (smoke probe)' }),
}).then(async r => {
  let text = '';
  let consultStatus = '';
  try {
    const j = await r.json();
    text = String(j && j.text != null ? j.text : '');
    consultStatus = String(j && j.status != null ? j.status : '');
  } catch (_) {}
  console.log(JSON.stringify({ http: r.status, textLen: text.trim().length, consultStatus }));
}).catch(() => { console.log(JSON.stringify({ http: 0, textLen: 0 })); process.exit(1); });
" 2>/dev/null | tail -1 || echo '{"http":0,"textLen":0}')"
    auth_http="$(printf '%s' "$auth_json" | sed -n 's/.*"http":\([0-9]*\).*/\1/p')"
    auth_len="$(printf '%s' "$auth_json" | sed -n 's/.*"textLen":\([0-9]*\).*/\1/p')"
    if [[ "$auth_http" == "200" && "${auth_len:-0}" -gt 0 ]]; then
      log_pass "POST /internal/kasir-consult with key → 200 + non-empty text (len=${auth_len})"
    else
      log_fail "POST /internal/kasir-consult with key → http=${auth_http:-?} textLen=${auth_len:-0} (want 200 + text)"
    fi
  fi
fi

# ── 4) Coach mode (optional — only when ops sets KASIR_COACH_SMOKE_PHONE) ──
coach_phone=""
if coach_phone="$(env_get KASIR_COACH_SMOKE_PHONE)" && [[ -n "$coach_phone" ]]; then
  consult_key_coach=""
  consult_key_coach="$(env_get KASIR_CONSULT_KEY 2>/dev/null || true)"
  if [[ -z "$consult_key_coach" ]]; then
    log_fail "coach probe: KASIR_COACH_SMOKE_PHONE set but KASIR_CONSULT_KEY missing"
  else
    coach_json=""
    coach_json="$(docker exec \
      -e KASIR_CONSULT_KEY="$consult_key_coach" \
      -e COACH_PHONE="$coach_phone" \
      "$MIDDLEWARE_CONTAINER" node -e "
const key = process.env.KASIR_CONSULT_KEY || '';
const phone = (process.env.COACH_PHONE || '').replace(/\\D/g, '');
fetch('http://127.0.0.1:4001/internal/kasir-consult', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-kasir-consult-key': key,
  },
  body: JSON.stringify({ question: 'pendamping', mode: 'coach', phone }),
}).then(async r => {
  let text = '';
  try {
    const j = await r.json();
    text = String(j && j.text != null ? j.text : '');
    console.log(JSON.stringify({ http: r.status, textLen: text.trim().length }));
  } catch (_) {
    console.log(JSON.stringify({ http: r.status, textLen: 0 }));
  }
}).catch(() => { console.log(JSON.stringify({ http: 0, textLen: 0 })); process.exit(1); });
" 2>/dev/null | tail -1 || echo '{"http":0,"textLen":0}')"
    coach_http="$(printf '%s' "$coach_json" | sed -n 's/.*"http":\([0-9]*\).*/\1/p')"
    coach_len="$(printf '%s' "$coach_json" | sed -n 's/.*"textLen":\([0-9]*\).*/\1/p')"
    if [[ "$coach_http" == "200" && "${coach_len:-0}" -gt 0 ]]; then
      log_pass "coach mode probe (KASIR_COACH_SMOKE_PHONE) → 200 + non-empty text"
    else
      log_fail "coach mode probe → http=${coach_http:-?} textLen=${coach_len:-0}"
    fi
  fi
else
  log_skip "coach mode probe (set KASIR_COACH_SMOKE_PHONE in $EF for demo tenant)"
fi

# ── 5) Hermes Up + WhatsApp connected since last container start ───────────
if docker inspect -f '{{.State.Running}}' "$HERMES_CONTAINER" 2>/dev/null | grep -q true; then
  log_pass "container $HERMES_CONTAINER running"
  started_at="$(docker inspect -f '{{.State.StartedAt}}' "$HERMES_CONTAINER" 2>/dev/null || true)"
  wa_ok=0
  if [[ -n "$started_at" ]]; then
    if docker logs "$HERMES_CONTAINER" --since "$started_at" 2>&1 \
      | grep -Eiq 'whatsapp[^\\n]{0,80}connected|connected[^\\n]{0,80}whatsapp|WhatsApp connected|pair: connected'; then
      wa_ok=1
    fi
    if [[ "$wa_ok" -eq 0 ]]; then
      if docker exec "$HERMES_CONTAINER" sh -lc \
        'grep -Ei "whatsapp.*connected|connected.*whatsapp|WhatsApp connected" /opt/data/logs/gateway.log 2>/dev/null | tail -1' \
        | grep -Eiq 'connect'; then
        wa_ok=1
      fi
    fi
  fi
  if [[ "$wa_ok" -eq 1 ]]; then
    log_pass "gateway logs show WhatsApp connected since last start ($started_at)"
  else
    # Pair bridge status (read-only) — same transport signal ops uses in hermes-smoke-test.py
    pair_line=""
    pair_line="$(docker exec "$HERMES_CONTAINER" curl -sS -m 15 http://127.0.0.1:8765/pair/status 2>/dev/null || true)"
    if printf '%s' "$pair_line" | grep -Eq '"connected"[[:space:]]*:[[:space:]]*true'; then
      log_pass "pair/status connected=true (gateway log line not matched; bridge OK)"
    else
      log_fail "WhatsApp not confirmed connected since start (started=$started_at)"
    fi
  fi
else
  log_fail "container $HERMES_CONTAINER not running"
fi

# ── 6) Kasir posture check (plugins, locks, health) ─────────────────────────
if [[ -f "$SCRIPTS/hermes-kasir-posture.py" ]]; then
  if HERMES_HOME="$HERMES_HOME" HERMES_CONTAINER="$HERMES_CONTAINER" \
    python3 "$SCRIPTS/hermes-kasir-posture.py" check --docker --container "$HERMES_CONTAINER"; then
    log_pass "hermes-kasir-posture.py check"
  else
    log_fail "hermes-kasir-posture.py check (see hermes-gaps.md)"
  fi
else
  log_fail "missing $SCRIPTS/hermes-kasir-posture.py"
fi

echo
if [[ "$failures" -gt 0 ]]; then
  echo "smoke-umkm: FAILED ($failures check(s))"
  exit 1
fi
echo "smoke-umkm: OK"
exit 0
