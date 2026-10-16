#!/usr/bin/env python3
"""Get actual WA reply text for recent cek stok failures."""
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
    timeout=40,
    allow_agent=False,
    look_for_keys=False,
)

script = r'''
from pathlib import Path
t = Path("/opt/data/logs/agent.log").read_text(encoding="utf-8", errors="replace")
# last 80KB
chunk = t[-80000:]
# find recent blocks with stok / terdaftar / tenant
lines = chunk.splitlines()
for i, line in enumerate(lines):
    low = line.lower()
    if any(x in low for x in (
        "terdaftar", "dikenali", "kasir-tools tenant", "kasir_get_stock",
        "allowlist ok", "inbound message", "response ready", "stamp",
        "gagal resolve", "tool result", "tool kasir",
    )):
        print(line[-400:])
'''
sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-reply-dump.py", "w") as fh:
    fh.write(script)
sftp.close()
_, o, e = c.exec_command(
    "docker exec nsoft3-hermes python3 /opt/data/umkm-reply-dump.py", timeout=60
)
print(o.read().decode("utf-8", "replace")[-8000:])
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err[-1000:])
print("exit", o.channel.recv_exit_status())

# Also simulate full stock handler with current stamp + session
sim = r'''
import importlib.util, sys, types, json
from pathlib import Path
root = Path("/opt/data/plugins/kasir-tools")
pkg = types.ModuleType("kasir_tools"); pkg.__path__=[str(root)]; sys.modules["kasir_tools"]=pkg
spec_i = importlib.util.spec_from_file_location("kasir_tools.identity", root/"identity.py")
mod_i = importlib.util.module_from_spec(spec_i); sys.modules["kasir_tools.identity"]=mod_i; spec_i.loader.exec_module(mod_i)
spec = importlib.util.spec_from_file_location("kasir_tools", root/"__init__.py", submodule_search_locations=[str(root)])
mod = importlib.util.module_from_spec(spec); sys.modules["kasir_tools"]=mod; mod.__path__=[str(root)]; spec.loader.exec_module(mod)

print("stamp_read", mod_i.read_sender())
# What session_id would agent pass? list from sessions.json
sess = json.loads(Path("/opt/data/sessions/sessions.json").read_text())
for k,v in sess.items():
    if "628568713897" in k:
        sid = v["session_id"]
        print("bu_kades_sid", sid)
        print("stock_via_sid", mod._handle_stock({}, session_id=sid)[:200])
print("stock_via_empty_kwargs", mod._handle_stock({})[:200])
print("stock_via_stamp_only", mod._handle_stock({}, session_id="unknown")[:200])
'''
sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-stock-sim.py", "w") as fh:
    fh.write(sim)
sftp.close()
_, o, e = c.exec_command(
    "docker exec nsoft3-hermes python3 /opt/data/umkm-stock-sim.py", timeout=60
)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err[-1500:])
c.close()
