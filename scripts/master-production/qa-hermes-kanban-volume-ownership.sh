#!/usr/bin/env bash
# QA: Hermes volume ownership (kanban.db root:644 guard; no chown -R / no docker exec id).
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

echo "==> ownership reproduction cases"
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

HERMES_UID, HERMES_GID = 10000, 10000

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
        results = posture.check_volume_ownership(home, HERMES_UID, HERMES_GID)
    if not results or results[0][0]:
        print("FAIL  expected check_volume_ownership to fail for root:644 kanban.db")
        sys.exit(1)
    print("PASS  check fails on simulated root-owned kanban.db (uid=0 mode=644)")

class FakeStat:
    def __init__(self, uid, gid, mode):
        self.st_uid = uid
        self.st_gid = gid
        self.st_mode = mode


def _can_host_chown() -> bool:
    try:
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / "t"
            p.write_text("x", encoding="utf-8")
            os.chown(p, 0, 0)
        return True
    except OSError:
        return False


HOST_CHOWN = _can_host_chown()

# Volume 10000, .env 600, root kanban → only kanban fixed; .env untouched
with tempfile.TemporaryDirectory() as td:
    home = Path(td)
    env = home / ".env"
    env.write_text("SECRET=1\n", encoding="utf-8")
    os.chmod(env, 0o600)
    config = home / "config.yaml"
    config.write_text("x: 1\n", encoding="utf-8")
    os.chmod(config, 0o644)
    kanban = home / "kanban.db"
    kanban.write_text("db", encoding="utf-8")
    os.chmod(kanban, 0o644)
    env_mode_before = stat.S_IMODE(env.stat().st_mode)
    cfg_mode_before = stat.S_IMODE(config.stat().st_mode)

    real_stat = Path.stat
    kanban_uid = 0 if HOST_CHOWN else os.getuid()

    def stat_hermes_layout(self):
        if self == env:
            return FakeStat(HERMES_UID, HERMES_GID, stat.S_IFREG | 0o600)
        if self == home:
            return FakeStat(HERMES_UID, HERMES_GID, stat.S_IFDIR | 0o700)
        if self == kanban:
            st = real_stat(self)
            return FakeStat(
                kanban_uid,
                0 if HOST_CHOWN else st.st_gid,
                st.st_mode,
            )
        return real_stat(self)

    chown_calls: list[list[str]] = []
    real_call = posture.subprocess.call

    def track_chown(cmd, *a, **kw):
        if cmd and cmd[0] == "chown":
            chown_calls.append(list(cmd))
            if HOST_CHOWN:
                return real_call(cmd, *a, **kw)
            return 0
        return real_call(cmd, *a, **kw)

    with patch.object(Path, "stat", stat_hermes_layout):
        uid_gid = posture.resolve_hermes_uid_gid(home=home)
    if uid_gid != (HERMES_UID, HERMES_GID):
        print(f"FAIL  resolve_hermes_uid_gid want {HERMES_UID}:{HERMES_GID} got {uid_gid}")
        sys.exit(1)

    with patch.object(Path, "stat", stat_hermes_layout):
        with patch.object(posture.subprocess, "call", side_effect=track_chown):
            notes = posture.harden_volume_ownership(home, HERMES_UID, HERMES_GID)

    if not chown_calls or len(chown_calls) != 1:
        print("FAIL  expected exactly one chown call, got", chown_calls)
        sys.exit(1)
    if str(kanban) not in chown_calls[0][-1] and kanban.name not in chown_calls[0][-1]:
        print("FAIL  chown must target kanban.db only:", chown_calls[0])
        sys.exit(1)
    if f"{HERMES_UID}:{HERMES_GID}" not in chown_calls[0][1]:
        print("FAIL  chown uid:gid", chown_calls[0])
        sys.exit(1)
    if "kanban.db.chown" not in notes and "kanban.db.chmod" not in notes:
        print("FAIL  expected kanban.db fix notes, got", notes)
        sys.exit(1)
    if stat.S_IMODE(env.stat().st_mode) != env_mode_before:
        print("FAIL  .env mode changed")
        sys.exit(1)
    if stat.S_IMODE(config.stat().st_mode) != cfg_mode_before:
        print("FAIL  config.yaml mode changed")
        sys.exit(1)
    if stat.S_IMODE(kanban.stat().st_mode) != 0o640:
        print("FAIL  kanban.db should be mode 640 after harden")
        sys.exit(1)
    print("PASS  volume 10000/.env 600: only root kanban.db → 10000:10000 640")

# docker exec id returns root must NOT drive chown to 0
with tempfile.TemporaryDirectory() as td:
    home = Path(td)
    kanban = home / "kanban.db"
    kanban.write_text("db", encoding="utf-8")
    os.chmod(kanban, 0o644)

    real_stat2 = Path.stat

    def stat_home_10000(self):
        if self == home:
            return FakeStat(HERMES_UID, HERMES_GID, stat.S_IFDIR | 0o700)
        if self == kanban:
            st = real_stat2(self)
            return FakeStat(0 if HOST_CHOWN else st.st_uid, 0, st.st_mode)
        return real_stat2(self)

    def fake_exec(cmd, *a, **kw):
        if len(cmd) >= 4 and cmd[0:2] == ["docker", "exec"] and cmd[-1] in ("-u", "-g"):
            return b"0\n"
        raise AssertionError(f"unexpected docker exec: {cmd}")

    with patch.object(Path, "stat", stat_home_10000):
        with patch.object(posture.subprocess, "check_output", side_effect=fake_exec):
            uid_gid = posture.resolve_hermes_uid_gid(home=home)
    if uid_gid != (HERMES_UID, HERMES_GID):
        print(f"FAIL  exec-id-returns-root: resolve must use stat not docker, got {uid_gid}")
        sys.exit(1)

    chown_calls = []

    def track_chown2(cmd, *a, **kw):
        if cmd and cmd[0] == "chown":
            chown_calls.append(list(cmd))
            if "0:0" in cmd[1]:
                print("FAIL  exec-id-returns-root: must not chown to 0:0")
                sys.exit(1)
            if HOST_CHOWN:
                return real_call(cmd, *a, **kw)
            return 0
        return real_call(cmd, *a, **kw)

    with patch.object(Path, "stat", stat_home_10000):
        with patch.object(posture.subprocess, "call", side_effect=track_chown2):
            posture.harden_volume_ownership(home, uid_gid[0], uid_gid[1])
    if chown_calls and "0:0" in chown_calls[0][1]:
        print("FAIL  exec-id-returns-root: chown to 0:0")
        sys.exit(1)
    print("PASS  exec-id-returns-root does not chown kanban to 0")

# All-root volume → skip harden (no chown to 0)
with tempfile.TemporaryDirectory() as td:
    home = Path(td)
    kanban = home / "kanban.db"
    kanban.write_text("db", encoding="utf-8")

    def stat_all_root(self):
        if self in (home, kanban):
            mode = stat.S_IFREG | 0o644 if self == kanban else stat.S_IFDIR | 0o755
            return FakeStat(0, 0, mode)
        return real_stat(self)

    for _k in ("HERMES_VOLUME_UID", "HERMES_VOLUME_GID"):
        os.environ.pop(_k, None)

    notes = posture.harden_volume_ownership(home, 0, 0)
    if notes:
        print("FAIL  should not harden when target uid is 0, got", notes)
        sys.exit(1)
    with patch.object(Path, "stat", stat_all_root):
        uid_gid = posture.resolve_hermes_uid_gid(home=home)
    if uid_gid is not None:
        print(f"FAIL  all-root volume should skip resolve, got {uid_gid}")
        sys.exit(1)
    print("PASS  all-root volume: resolve None / harden noop")

PY

if [[ "$failures" -gt 0 ]]; then
  echo "QA FAILED ($failures)"
  exit 1
fi
echo "QA OK"
