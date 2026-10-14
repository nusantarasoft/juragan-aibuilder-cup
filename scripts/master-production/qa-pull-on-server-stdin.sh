#!/usr/bin/env bash
# QA: pull-on-server.sh via bash -s (same path as deploy.ps1 / _ssh.py script).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PULL="$ROOT/scripts/master-production/pull-on-server.sh"
QA_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/qa-pull-stdin.XXXXXX")"
MOCK_BIN="$QA_ROOT/mock-bin"
REMOTE_DIR="$QA_ROOT/opt-nusantarasoft-3"
BARE="$QA_ROOT/bare.git"
FAIL=0

cleanup() { rm -rf "$QA_ROOT"; }
trap cleanup EXIT

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; FAIL=1; }

echo "==> bash -n pull-on-server.sh"
bash -n "$PULL"
pass "bash -n pull-on-server.sh"

# --- git: bare origin + server checkout (master-production) ---
git init --bare -b master-production "$BARE"
WORK="$QA_ROOT/worktree"
mkdir -p "$WORK"
git -C "$WORK" init -b master-production
echo "seed" >"$WORK/README.md"
git -C "$WORK" add README.md
git -C "$WORK" commit -m "seed"
git -C "$WORK" remote add origin "$BARE"
git -C "$WORK" push -u origin master-production

git clone --branch master-production "file://$BARE" "$REMOTE_DIR"
mkdir -p "$REMOTE_DIR/volumes/hermes"
echo 'config' >"$REMOTE_DIR/volumes/hermes/config.yaml"
echo 'live' >"$REMOTE_DIR/volumes/hermes/state-marker.txt"

# --- mock tar: staging path exit 1 + file-changed (deploy must continue) ---
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
exec /usr/bin/tar "$@"
MOCK
chmod +x "$MOCK_BIN/tar"

DEPLOY_GIT_URL="file://$BARE"
BRANCH="master-production"
HERMES_BACKUP_DIR="$REMOTE_DIR/backups/hermes-runtime"

pull_body="$(tr -d '\r' <"$PULL" | sed '1s/^\xEF\xBB\xBF//')"
header="$(cat <<EOF
set -euo pipefail
export BRANCH='$BRANCH'
export REMOTE_DIR='$REMOTE_DIR'
export DEPLOY_GIT_URL='$DEPLOY_GIT_URL'
export HERMES_BACKUP_DIR='$HERMES_BACKUP_DIR'
export PATH='$MOCK_BIN':\$PATH
export MOCK_TAR_MODE=exit1-changed

EOF
)"

combined="$QA_ROOT/combined.sh"
# deploy.ps1 concatenates header + body; ensure a newline so exports are not glued to shebang.
printf '%s\n%s' "$header" "$pull_body" >"$combined"
if ! grep -q "$MOCK_BIN" "$combined"; then
  fail "combined script missing mock tar PATH export"
fi

echo "==> bash -s (deploy.ps1 stdin path) with Hermes volumes + tar exit1 file-changed"
export PATH="$MOCK_BIN:$PATH"
export MOCK_TAR_MODE=exit1-changed
if bash -s <"$combined" >"$QA_ROOT/stdout.log" 2>"$QA_ROOT/stderr.log"; then
  pass "bash -s pull-on-server completes under set -u (no BASH_SOURCE / source)"
else
  fail "bash -s pull-on-server exited non-zero (see $QA_ROOT/stderr.log)"
  cat "$QA_ROOT/stderr.log" >&2 || true
fi

if grep -q 'file changed' "$QA_ROOT/stderr.log" "$QA_ROOT/stdout.log" 2>/dev/null; then
  pass "tar file-changed warning surfaced (mock tar exit 1)"
else
  fail "expected tar file-changed warning in pull logs"
  echo "--- stdout ---" >&2
  cat "$QA_ROOT/stdout.log" >&2 || true
  echo "--- stderr ---" >&2
  cat "$QA_ROOT/stderr.log" >&2 || true
fi

shopt -s nullglob
archives=( "$HERMES_BACKUP_DIR"/hermes-runtime-*.tar.gz )
if [[ ${#archives[@]} -ge 1 && -f "${archives[0]}" ]]; then
  pass "Hermes runtime tar backup created via stdin path"
else
  fail "no hermes-runtime-*.tar.gz under backups"
fi

if [[ -f "$REMOTE_DIR/volumes/hermes/config.yaml" ]]; then
  pass "volumes/hermes preserved after pull"
else
  fail "volumes/hermes missing after pull"
fi

CUR="$(git -C "$REMOTE_DIR" rev-parse --abbrev-ref HEAD)"
if [[ "$CUR" == "$BRANCH" ]]; then
  pass "server repo still on $BRANCH after stdin pull"
else
  fail "expected branch $BRANCH, got $CUR"
fi

if [[ "$FAIL" -eq 0 ]]; then
  echo ""
  echo "QA verdict: PASS"
  exit 0
fi
echo ""
echo "QA verdict: FAIL"
exit 1
