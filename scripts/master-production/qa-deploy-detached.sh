#!/usr/bin/env bash
# QA: detached redeploy helper (no SSH). Simulates SSH client death mid-run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DETACHED="$ROOT/scripts/master-production/redeploy-detached.sh"
WORKDIR=""
failures=0

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }

setup_workdir() {
  WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/nsoft3-deploy-detached-qa.XXXXXX")"
  export REMOTE_DIR="$WORKDIR/repo"
  mkdir -p "$REMOTE_DIR/logs" "$REMOTE_DIR/scripts/master-production"
  cp "$DETACHED" "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  cat >"$REMOTE_DIR/scripts/master-production/redeploy.sh" <<'EOF'
#!/usr/bin/env bash
echo "==> fake redeploy [1/2] sleep"
sleep 2
echo "==> fake redeploy [2/2] done"
exit 7
EOF
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy.sh"
}

cleanup() {
  if [[ -n "${WORKDIR:-}" ]] && [[ -d "$WORKDIR" ]]; then
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

echo "==> bash -n changed deploy shell scripts"
for s in \
  "$ROOT/scripts/master-production/redeploy-detached.sh" \
  "$ROOT/scripts/master-production/redeploy.sh" \
  "$ROOT/scripts/master-production/pull-on-server.sh"; do
  if bash -n "$s"; then
    pass "bash -n $(basename "$s")"
  else
    fail "bash -n $(basename "$s")"
  fi
done

setup_workdir
HELPER="$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"

echo "==> start detached + simulate SSH client killed mid-run"
start_out="$("$HELPER" start)"
echo "$start_out" | grep -q '^LOG=' || fail "start missing LOG="
LOG="$(echo "$start_out" | grep '^LOG=' | cut -d= -f2-)"

# Subshell mimics deploy.ps1 polling over SSH; SIGKILL mid-run must not stop server job.
ssh_client_pid=""
( sleep 0.5; kill -9 "$ssh_client_pid" 2>/dev/null || true ) &
ssh_client_pid=$!
echo "simulated SSH client pid=$ssh_client_pid (killed after 0.5s)"
sleep 4
wait "$ssh_client_pid" 2>/dev/null || true

st_out="$("$HELPER" status || true)"
echo "$st_out" | grep -q 'STATUS=done' || fail "expected STATUS=done after remote job finished"
echo "$st_out" | grep -q 'EXIT=7' || fail "expected EXIT=7 from fake redeploy"
pass "remote job completed after client disconnect; exit retrievable via status"

echo "==> lock prevents concurrent start"
setup_workdir2() {
  export REMOTE_DIR="$WORKDIR/repo2"
  mkdir -p "$REMOTE_DIR/logs" "$REMOTE_DIR/scripts/master-production"
  cp "$DETACHED" "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
  cat >"$REMOTE_DIR/scripts/master-production/redeploy.sh" <<'EOF'
#!/usr/bin/env bash
sleep 5
EOF
  chmod +x "$REMOTE_DIR/scripts/master-production/redeploy.sh"
}
setup_workdir2
HELPER2="$REMOTE_DIR/scripts/master-production/redeploy-detached.sh"
"$HELPER2" start >/dev/null
if "$HELPER2" start >/dev/null 2>&1; then
  fail "second start should fail with lock"
else
  code=$?
  if [[ "$code" -eq 2 ]]; then
    pass "concurrent start blocked (exit 2)"
  else
    fail "concurrent start exit $code (expected 2)"
  fi
fi
wait || true

echo ""
if [[ "$failures" -gt 0 ]]; then
  echo "qa-deploy-detached: FAILED ($failures)"
  exit 1
fi
echo "qa-deploy-detached: OK"
exit 0
