#!/usr/bin/env bash
# QA: deploy.ps1 must mkdir server logs/ before SFTP pull-script upload (no live SSH).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PULL_SRC="$ROOT/scripts/master-production/pull-on-server.sh"
failures=0

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }

echo "==> simulate fresh server tree (no logs/)"
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/nsoft3-deploy-logs-dir-qa.XXXXXX")"
REMOTE_DIR="$WORKDIR/opt/nusantarasoft-3"
mkdir -p "$REMOTE_DIR/scripts/master-production"
# Intentionally omit logs/ — reproduces PR #29 prod SFTP "No such file"

if [[ -d "$REMOTE_DIR/logs" ]]; then
  fail "setup: logs/ should not exist yet"
else
  pass "setup: logs/ absent (fresh target)"
fi

remote_pull="$REMOTE_DIR/logs/.deploy-pull-test.sh"
if ( : >"$remote_pull" ) 2>/dev/null; then
  fail "SFTP path writable without logs/ (unexpected)"
else
  pass "pull script path blocked without logs/ (expected SFTP failure)"
fi

echo "==> Ensure-RemoteDeployDirs equivalent (mkdir -p)"
mkdir -p "$REMOTE_DIR/logs" "$REMOTE_DIR/scripts/master-production"
[[ -d "$REMOTE_DIR/logs" ]] || fail "mkdir -p did not create logs/"
[[ -d "$REMOTE_DIR/scripts/master-production" ]] || fail "mkdir -p did not create scripts/master-production/"

pull_body="$(tr -d '\r' <"$PULL_SRC")"
header=$'set -euo pipefail\nexport BRANCH=master-production\nexport REMOTE_DIR='"$REMOTE_DIR"$'\n'
remote_script="$header$pull_body"
pull_file="$WORKDIR/nsoft3-pull-on-server.sh"
printf '%s' "$remote_script" >"$pull_file"

cp "$pull_file" "$remote_pull"
chmod +x "$remote_pull"
[[ -f "$remote_pull" ]] || fail "pull script not written after mkdir"
pass "pull script upload path OK after mkdir"

if bash -n "$remote_pull"; then
  pass "bash -n generated pull script (with header)"
else
  fail "bash -n generated pull script"
fi

rm -rf "$WORKDIR"

echo ""
if [[ "$failures" -gt 0 ]]; then
  echo "qa-deploy-logs-dir-hotfix: FAILED ($failures)"
  exit 1
fi
echo "qa-deploy-logs-dir-hotfix: OK"
exit 0
