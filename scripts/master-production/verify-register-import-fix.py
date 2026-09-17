#!/usr/bin/env python3
"""Confirm deployed _run_registration uses .register submodule."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parent / "deploy.local.env").read_text(
    encoding="utf-8"
).splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    env["SSH_HOST"],
    username=env.get("SSH_USER", "root"),
    password=env["SSH_PASS"],
    timeout=30,
    allow_agent=False,
    look_for_keys=False,
)

cmds = [
    "grep -n \"from .register import\\|from . import register\" "
    "/opt/nusantarasoft-3/volumes/hermes/plugins/kasir-pipe/__init__.py | head",
    "grep -E '^version:' /opt/nusantarasoft-3/volumes/hermes/plugins/kasir-pipe/plugin.yaml",
    # Load package the way plugins do: as directory package named by folder
    """docker exec nsoft3-hermes python3 - <<'PY'
import importlib.util, sys, types
from pathlib import Path
root = Path('/opt/data/plugins/kasir-pipe')
pkg = types.ModuleType('kasir_pipe')
pkg.__path__ = [str(root)]
pkg.__file__ = str(root / '__init__.py')
sys.modules['kasir_pipe'] = pkg
# load register submodule first
spec_r = importlib.util.spec_from_file_location('kasir_pipe.register', root / 'register.py')
mod_r = importlib.util.module_from_spec(spec_r)
sys.modules['kasir_pipe.register'] = mod_r
spec_r.loader.exec_module(mod_r)
# load package init
spec = importlib.util.spec_from_file_location('kasir_pipe', root / '__init__.py', submodule_search_locations=[str(root)])
mod = importlib.util.module_from_spec(spec)
sys.modules['kasir_pipe'] = mod
mod.__path__ = [str(root)]
spec.loader.exec_module(mod)
class E:
    text='DAFTAR'
    chat_id='184860442402958@lid'
    sender_id='184860442402958@lid'
    internal=False
reply = mod._run_registration(E())
print('phone_resolved', mod._resolve_sender_phone(E()))
print('reply_head', (reply or '')[:120].replace('\\n',' | '))
assert 'sibuk' not in (reply or '').lower(), reply
assert 'Nama toko' in (reply or '') or 'DAFTAR' in (reply or '') or 'approve' in (reply or '').lower() or 'YA' in (reply or '')
print('run_registration_ok')
PY""",
]

for cmd in cmds:
    print(f"\n>>> {cmd[:200]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=90)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    print((out + (("\nSTDERR " + err) if err.strip() else ""))[-4000:])
    print(f"exit={code}", flush=True)

c.close()
