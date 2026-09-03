#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# up-hermes.sh — ON SERVER: bring up nsoft3-hermes only (no app image rebuild)
#
#   cd /opt/nusantarasoft-3 && bash scripts/master-production/up-hermes.sh
#
# Prerequisites: compose + docs already pulled; .env.master-production present.
# Sets WHATSAPP_PROVIDER=hermes when missing (Hermes is the sole transport).
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$DIR"

CF="docker-compose.master-production.yml"
EF=".env.master-production"

if [[ ! -f "$EF" ]]; then
  echo "ERROR: missing $EF" >&2
  exit 1
fi

ensure_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$EF" 2>/dev/null; then
    return 0
  fi
  echo "    appending $key to $EF"
  printf '\n%s=%s\n' "$key" "$val" >>"$EF"
}

echo "==> [1/4] ensure Hermes env defaults in $EF (append-only if missing)"
ensure_env HERMES_IMAGE "nousresearch/hermes-agent:v2026.8.27"
ensure_env HERMES_BASE_URL "http://hermes:8642"
ensure_env HERMES_GATEWAY_PORT "8652"
ensure_env HERMES_DASHBOARD_PORT "9129"
ensure_env HERMES_DASHBOARD "1"
ensure_env WHATSAPP_PROVIDER "hermes"
# Dashboard GUI — if missing, append placeholders; set real password on server .env before first login
if ! grep -qE '^HERMES_DASHBOARD_BASIC_AUTH_USERNAME=' "$EF" 2>/dev/null; then
  echo "WARN: set HERMES_DASHBOARD_BASIC_AUTH_* in $EF for dashboard login" >&2
fi

echo "==> [2/4] mkdir volumes/hermes"
mkdir -p volumes/hermes

echo "==> [3/4] pull image + up hermes"
docker compose -f "$CF" --env-file "$EF" pull hermes
docker compose -f "$CF" --env-file "$EF" up -d hermes

echo "==> [4/4] status"
docker compose -f "$CF" --env-file "$EF" ps hermes
echo
echo "OK — nsoft3-hermes should be Up."
echo "Dashboard (SSH tunnel): ssh -L 9129:127.0.0.1:9129 root@31.97.66.39 → http://127.0.0.1:9129"
echo "Pair test number: docker compose -f $CF --env-file $EF exec -it hermes hermes whatsapp"
echo "WHATSAPP_PROVIDER=hermes (sole transport). Docs: docs/hermes-local.md"
