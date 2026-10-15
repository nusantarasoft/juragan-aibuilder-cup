#!/usr/bin/env bash
# QA D-7: .deploy.state exists immediately; status=running before job finishes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DETACHED="$ROOT/scripts/master-production/redeploy-detached.sh"
WORKDIR=""
failures=0

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }

setup_workdir() {
  WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/nsoft3-deploy-state-early-qa.XXXXXX")"
  export REMOTE_DIR="$WORKDIR/repo"
  mkdir -p "$REMOTE_DIR/logs" "$REMOTE_DIR/scripts/master-production"
  cp "$DETACHED" "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  cat >"$REMOTE_DIR/scripts/master-production/redeploy.sh" <<'EOF'
#!/usr/bin/env bash
sleep 6
echo "==> fake redeploy done"
exit 0
EOF
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy.sh"
}

cleanup() {
  if [[ -n "${WORKDIR:-}" ]] && [[ -d "$WORKDIR" ]]; then
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

echo "==> bash -n redeploy-detached.sh"
bash -n "$DETACHED" && pass "bash -n redeploy-detached.sh" || fail "bash -n redeploy-detached.sh"

setup_workdir
HELPER="$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
STATE="$REMOTE_DIR/logs/.deploy.state"
TARGET_SHA="deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"

start_out="$("$HELPER" start "" "$TARGET_SHA")"
LOG="$(echo "$start_out" | grep '^LOG=' | cut -d= -f2-)"

if [[ ! -f "$STATE" ]]; then
  fail "state file missing immediately after start"
else
  pass "state file exists immediately after start"
fi

grep -q '^STATUS=running' "$STATE" || fail "state STATUS=running missing at start"
grep -q "^LOG=$LOG" "$STATE" || fail "state LOG mismatch"
grep -q "^SHA=$TARGET_SHA" "$STATE" || fail "state SHA missing"

st_immediate="$("$HELPER" status)"
echo "$st_immediate" | grep -q '^STATUS=running' || fail "status immediately after start not running"
echo "$st_immediate" | grep -q "^SHA=$TARGET_SHA" || fail "status SHA missing"

# Stale prior success must not win while lock + job still running
cat >"$STATE" <<EOF
LOG=/old/deploy.log
PID=99999
STARTED=2020-01-01T00:00:00+00:00
STATUS=success
SHA=oldshaoldshaoldshaoldshaoldshaoldshaoldsha
EXIT=0
EOF
st_stale="$("$HELPER" status)"
echo "$st_stale" | grep -q '^STATUS=running' || fail "stale state: expected running from live lock"
echo "$st_stale" | grep -q "^LOG=$LOG" || fail "stale state: expected current log from lock"

sleep 7
st_done="$("$HELPER" status)"
echo "$st_done" | grep -q '^STATUS=success' || fail "expected STATUS=success after job done"
echo "$st_done" | grep -q '^EXIT=0' || fail "expected EXIT=0"

pass "immediate + during-build status running; final success"

echo ""
if [[ "$failures" -gt 0 ]]; then
  echo "qa-deploy-state-early: FAILED ($failures)"
  exit 1
fi
echo "qa-deploy-state-early: OK"
exit 0
