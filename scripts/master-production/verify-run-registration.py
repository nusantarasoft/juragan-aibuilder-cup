#!/usr/bin/env python3
"""Upload and run registration fix verification inside Hermes."""
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

script = r'''
import importlib.util, sys, types
from pathlib import Path

root = Path("/opt/data/plugins/kasir-pipe")
pkg = types.ModuleType("kasir_pipe")
pkg.__path__ = [str(root)]
pkg.__file__ = str(root / "__init__.py")
sys.modules["kasir_pipe"] = pkg

spec_r = importlib.util.spec_from_file_location(
    "kasir_pipe.register", root / "register.py"
)
mod_r = importlib.util.module_from_spec(spec_r)
sys.modules["kasir_pipe.register"] = mod_r
spec_r.loader.exec_module(mod_r)

spec = importlib.util.spec_from_file_location(
    "kasir_pipe",
    root / "__init__.py",
    submodule_search_locations=[str(root)],
)
mod = importlib.util.module_from_spec(spec)
sys.modules["kasir_pipe"] = mod
mod.__path__ = [str(root)]
spec.loader.exec_module(mod)

class E:
    text = "DAFTAR"
    user_id = "184860442402958@lid"
    chat_id = "184860442402958@lid"
    sender_id = "184860442402958@lid"
    internal = False
    source = None

phone = mod._resolve_sender_phone(E())
print("phone_resolved", phone)
reply = mod._run_registration(E())
print("reply", (reply or "")[:200])
assert "sibuk" not in (reply or "").lower(), reply
assert "Nama toko" in (reply or ""), reply
print("run_registration_ok")
'''

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
sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-runreg-verify.py", "w") as fh:
    fh.write(script)
sftp.close()
_, o, e = c.exec_command(
    "docker exec nsoft3-hermes python3 /opt/data/umkm-runreg-verify.py", timeout=90
)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err)
print("exit", o.channel.recv_exit_status())
c.close()
