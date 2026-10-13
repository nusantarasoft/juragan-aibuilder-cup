#!/usr/bin/env bash
# QA: Hermes volume ownership (kanban.db root:644 / s6-log EPERM guard).
# Run from repo root: bash scripts/master-production/qa-hermes-kanban-volume-ownership.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

failures=0
pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; failures=$((failures + 1)); }

echo "==> bash -n deploy scripts"
for s in scripts/master-production/up-hermes.sh scripts/master-production/redeploy.sh; do
  if bash -n "$s"; then pass "bash -n $s"; else fail "bash -n $s"; fi
done

echo "==> python compile hermes-kasir-posture.py"
if python3 -m py_compile scripts/master-production/hermes-kasir-posture.py; then
  pass "py_compile hermes-kasir-posture.py"
else
  fail "py_compile hermes-kasir-posture.py"
fi

echo "==> simulate wrong kanban ownership (check must FAIL)"
python3 - <<'PY'
import os
import stat
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

import importlib.util

spec = importlib.util.spec_from_file_location(
    "hermes_kasir_posture",
    "scripts/master-production/hermes-kasir-posture.py",
)
posture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(posture)

want_uid, want_gid = 1000, 1000

class RootKanbanStat:
    st_uid = 0
    st_gid = 0
    st_mode = stat.S_IFREG | 0o644

with tempfile.TemporaryDirectory() as td:
    home = Path(td)
    kanban = home / "kanban.db"
    kanban.write_text("sqlite", encoding="utf-8")
    real_stat = Path.stat

    def stat_wrong_owner(self):
        if self == kanban:
            return RootKanbanStat()
        return real_stat(self)

    with patch.object(Path, "stat", stat_wrong_owner):
        results = posture.check_volume_ownership(home, want_uid, want_gid)
    if not results or results[0][0]:
        print("FAIL  expected check_volume_ownership to fail for root:644 kanban.db")
        sys.exit(1)
    print("PASS  check fails on simulated root-owned kanban.db (uid=0 mode=644)")

# Writable after harden on real fixture (current user as Hermes uid)
with tempfile.TemporaryDirectory() as td:
    home = Path(td)
    (home / "kanban.db").write_text("x", encoding="utf-8")
    os.chmod(home / "kanban.db", 0o644)
    uid, gid = os.getuid(), os.getgid()
    posture.harden_volume_ownership(home, uid, gid)
    results = posture.check_volume_ownership(home, uid, gid)
    if not results[0][0]:
        print("FAIL  check should pass after harden:", results)
        sys.exit(1)
    mode = stat.S_IMODE((home / "kanban.db").stat().st_mode)
    if mode != 0o640:
        print(f"FAIL  kanban.db mode {oct(mode)} want 0o640")
        sys.exit(1)
    print("PASS  harden + check on temp volume (uid=%s mode=640)" % uid)
PY

if [[ "$failures" -gt 0 ]]; then
  echo "QA FAILED ($failures)"
  exit 1
fi
echo "QA OK"
