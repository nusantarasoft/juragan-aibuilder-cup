#!/usr/bin/env bash
# QA: full detached deploy (pull + redeploy) — no live SSH.
# Simulates SSH client death right after trigger and mid-pull.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DETACHED="$ROOT/scripts/master-production/redeploy-detached.sh"
WORKDIR=""
failures=0

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }

setup_workdir() {
  local pull_body="$1"
  WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/nsoft3-deploy-full-detached-qa.XXXXXX")"
  export REMOTE_DIR="$WORKDIR/repo"
  mkdir -p "$REMOTE_DIR/logs" "$REMOTE_DIR/scripts/master-production"
  cp "$DETACHED" "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  cat >"$REMOTE_DIR/scripts/master-production/redeploy.sh" <<'EOF'
#!/usr/bin/env bash
echo "==> fake redeploy done"
exit 0
EOF
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy.sh"
  echo "$pull_body" >"$REMOTE_DIR/logs/.deploy-pull-test.sh"
  chmod +x "$REMOTE_DIR/logs/.deploy-pull-test.sh"
}

cleanup() {
  if [[ -n "${WORKDIR:-}" ]] && [[ -d "$WORKDIR" ]]; then
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

echo "==> bash -n deploy shell scripts"
for s in \
  "$ROOT/scripts/master-production/redeploy-detached.sh" \
  "$ROOT/scripts/master-production/pull-on-server.sh"; do
  if bash -n "$s"; then
    pass "bash -n $(basename "$s")"
  else
    fail "bash -n $(basename "$s")"
  fi
done

slow_pull='#!/usr/bin/env bash
set -euo pipefail
echo "==> fake pull [1/2] slow backup"
sleep 3
echo "==> fake pull [2/2] reset OK"
'

fast_pull='#!/usr/bin/env bash
echo "==> fake pull instant"
'

run_ssh_drop_scenario() {
  local label="$1"
  local pull_script="$2"
  local kill_delay="$3"

  setup_workdir "$pull_script"
  local helper="$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  local pull_path="$REMOTE_DIR/logs/.deploy-pull-test.sh"

  echo "==> scenario: $label"
  start_out="$("$helper" start "$pull_path")"
  echo "$start_out" | grep -q '^LOG=' || fail "$label: start missing LOG="
  LOG="$(echo "$start_out" | grep '^LOG=' | cut -d= -f2-)"

  ssh_client_pid=""
  ( sleep "$kill_delay"; kill -9 "$ssh_client_pid" 2>/dev/null || true ) &
  ssh_client_pid=$!
  echo "    simulated SSH client pid=$ssh_client_pid (kill after ${kill_delay}s)"
  sleep 8
  wait "$ssh_client_pid" 2>/dev/null || true

  st_out="$("$helper" status || true)"
  echo "$st_out" | grep -qE 'STATUS=(done|success)' || fail "$label: expected STATUS=success"
  echo "$st_out" | grep -q 'EXIT=0' || fail "$label: expected EXIT=0"
  grep -q 'fake pull' "$LOG" || fail "$label: log missing pull output"
  grep -q 'fake redeploy' "$LOG" || fail "$label: log missing redeploy output"
  pass "$label: job completed; exit retrievable via status"
  WORKDIR=""
}

run_ssh_drop_scenario "SSH drop right after trigger (fast pull)" "$fast_pull" "0.2"
run_ssh_drop_scenario "SSH drop during pull (slow pull)" "$slow_pull" "1.0"

echo ""
if [[ "$failures" -gt 0 ]]; then
  echo "qa-deploy-full-detached: FAILED ($failures)"
  exit 1
fi
echo "qa-deploy-full-detached: OK"
exit 0
