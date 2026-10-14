#!/usr/bin/env bash
# QA: Hermes runtime backup tar exit handling (no live Hermes / no server).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HELPER="$ROOT/scripts/master-production/hermes-runtime-backup.sh"
PULL="$ROOT/scripts/master-production/pull-on-server.sh"
QA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/qa-hermes-backup.XXXXXX")"
MOCK_BIN="$QA_DIR/mock-bin"
FAIL=0

cleanup() { rm -rf "$QA_DIR"; }
trap cleanup EXIT

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; FAIL=1; }

echo "==> bash -n"
bash -n "$HELPER"
bash -n "$PULL"
pass "bash -n pull-on-server.sh + hermes-runtime-backup.sh"

if command -v shellcheck >/dev/null 2>&1; then
  shellcheck -x "$HELPER" "$PULL"
  pass "shellcheck"
else
  echo "SKIP  shellcheck not installed"
fi

# --- tar exit acceptable (unit) ---
# shellcheck source=hermes-runtime-backup.sh
source "$HELPER"

err_ok="$QA_DIR/err-ok.txt"
echo 'tar: hermes/state.db: file changed as we read it' >"$err_ok"
if hermes_tar_exit_acceptable 1 "$err_ok"; then
  pass "exit 1 + file changed → acceptable"
else
  fail "exit 1 + file changed should be acceptable"
fi

err_fatal="$QA_DIR/err-fatal.txt"
echo 'tar: Cannot open: Permission denied' >"$err_fatal"
if hermes_tar_exit_acceptable 2 "$err_fatal"; then
  fail "exit 2 should be fatal"
else
  pass "exit 2 → fatal"
fi

if hermes_tar_exit_acceptable 1 "$err_fatal"; then
  fail "exit 1 without file-changed message should be fatal"
else
  pass "exit 1 without file-changed → fatal"
fi

# --- simulate deploy continues on tar exit 1 (mock tar) ---
mkdir -p "$MOCK_BIN"
cat >"$MOCK_BIN/tar" <<'MOCK'
#!/usr/bin/env bash
if [[ "${MOCK_TAR_MODE:-}" == "exit1-changed" ]]; then
  prev=""
  for arg in "$@"; do
    if [[ "$prev" == -czf ]]; then
      : >"$arg"
      break
    fi
    prev="$arg"
  done
  echo "tar: hermes: file changed as we read it" >&2
  exit 1
fi
if [[ "${MOCK_TAR_MODE:-}" == "exit2" ]]; then
  echo "tar: hermes: Cannot open: No such file or directory" >&2
  exit 2
fi
exec /usr/bin/tar "$@"
MOCK
chmod +x "$MOCK_BIN/tar"

HERMES_VOL="$QA_DIR/volumes/hermes"
BACKUP_DIR="$QA_DIR/backups/hermes-runtime"
mkdir -p "$HERMES_VOL" "$BACKUP_DIR"
echo 'live-config' >"$HERMES_VOL/config.yaml"
ARCHIVE="$BACKUP_DIR/hermes-runtime-test.tar.gz"

export PATH="$MOCK_BIN:$PATH"
export MOCK_TAR_MODE=exit1-changed
rm -f "$ARCHIVE"
if hermes_backup_direct_tar "$HERMES_VOL" "$ARCHIVE"; then
  if [[ -f "$ARCHIVE" ]]; then
    pass "tar exit 1 file-changed → backup OK, archive exists"
  else
    fail "tar exit 1 acceptable but archive missing"
  fi
else
  fail "tar exit 1 file-changed should not fail deploy backup"
fi

export MOCK_TAR_MODE=exit2
rm -f "$ARCHIVE"
if hermes_backup_direct_tar "$HERMES_VOL" "$ARCHIVE"; then
  fail "tar exit 2 should fail backup"
else
  pass "tar exit 2 → backup fails (deploy would abort)"
fi

# Staging path with real tar
unset MOCK_TAR_MODE
rm -f "$ARCHIVE"
if hermes_backup_via_staging "$HERMES_VOL" "$ARCHIVE" && [[ -f "$ARCHIVE" ]]; then
  pass "staging copy-then-tar creates archive"
else
  fail "staging backup"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo ""
  echo "QA verdict: PASS"
  exit 0
fi
echo ""
echo "QA verdict: FAIL"
exit 1
