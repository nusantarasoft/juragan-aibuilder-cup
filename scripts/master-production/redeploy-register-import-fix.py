#!/usr/bin/env python3
"""Redeploy kasir-pipe __init__ fix and verify DAFTAR path for LID chat."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
REMOTE = "/opt/nusantarasoft-3"
COMPOSE = (
    f"cd {REMOTE} && docker compose -f docker-compose.master-production.yml "
    f"--env-file .env.master-production"
)

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parent / "deploy.local.env").read_text(
    encoding="utf-8"
).splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

VERIFY = r'''
import importlib.util, sys, types
from pathlib import Path

root = Path("/opt/data/plugins/kasir-pipe")
pkg = types.ModuleType("kasir_pipe")
pkg.__path__ = [str(root)]
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
    chat_id = user_id
    sender_id = user_id
    internal = False
    source = None

phone = mod._resolve_sender_phone(E())
print("phone", phone)
reply = mod._run_registration(E())
print("reply", (reply or "")[:200])
assert "sibuk" not in (reply or "").lower(), reply
assert "Nama toko" in (reply or ""), reply
print("OK")
'''

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
if c.get_transport():
    c.get_transport().set_keepalive(30)


def run(cmd: str, timeout: int = 300) -> tuple[int, str]:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-4000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return code, out


sftp = c.open_sftp()
sftp.put(
    str(ROOT / "scripts/master-production/hermes-plugins/kasir-pipe/__init__.py"),
    f"{REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe/__init__.py",
)
sftp.put(
    str(ROOT / "scripts/master-production/hermes-plugins/kasir-pipe/plugin.yaml"),
    f"{REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe/plugin.yaml",
)
with sftp.file(f"{REMOTE}/volumes/hermes/umkm-runreg-verify.py", "w") as fh:
    fh.write(VERIFY)
sftp.close()

run(
    f"cp -f {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe/__init__.py "
    f"{REMOTE}/volumes/hermes/plugins/kasir-pipe/__init__.py && "
    f"cp -f {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe/plugin.yaml "
    f"{REMOTE}/volumes/hermes/plugins/kasir-pipe/plugin.yaml"
)
run(f"{COMPOSE} up -d --force-recreate --no-deps hermes", timeout=300)
run("sleep 22")
run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
code, _ = run("docker exec nsoft3-hermes python3 /opt/data/umkm-runreg-verify.py")
c.close()
sys.exit(0 if code == 0 else code)
