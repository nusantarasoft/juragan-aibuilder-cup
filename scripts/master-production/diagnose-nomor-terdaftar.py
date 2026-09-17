#!/usr/bin/env python3
"""Diagnose 'nomor belum terdaftar' after phone-resolve fix."""
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


def run(cmd: str, timeout: int = 90) -> str:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-6000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return out


run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -iE \"tidak terdaftar|tidak dikenali|kasir-tools tenant|Gagal resolve|"
    "allowlist ok|kasir_get_stock\" /opt/data/logs/agent.log | tail -n 40'"
)

run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT tenant_id, enabled, business_phone, allowlist_phones, label, "
    "notebook_id IS NOT NULL AS has_nb "
    "FROM studio_whatsapp_config ORDER BY tenant_id;\""
)

run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT phone, store_name, status, tenant_id, created_at "
    "FROM studio_umkm_registrations ORDER BY created_at DESC LIMIT 10;\""
)

# Live resolve like tools
probe = r'''
import importlib.util, sys, types, json
from pathlib import Path

root = Path("/opt/data/plugins/kasir-tools")
pkg = types.ModuleType("kasir_tools"); pkg.__path__=[str(root)]; sys.modules["kasir_tools"]=pkg
spec_i = importlib.util.spec_from_file_location("kasir_tools.identity", root/"identity.py")
mod_i = importlib.util.module_from_spec(spec_i); sys.modules["kasir_tools.identity"]=mod_i; spec_i.loader.exec_module(mod_i)
spec = importlib.util.spec_from_file_location("kasir_tools", root/"__init__.py", submodule_search_locations=[str(root)])
mod = importlib.util.module_from_spec(spec); sys.modules["kasir_tools"]=mod; mod.__path__=[str(root)]; spec.loader.exec_module(mod)

# dump sessions map
sess = json.loads(Path("/opt/data/sessions/sessions.json").read_text())
for k,v in sess.items():
    if k.startswith("_"): continue
    print("SESSION", k, "->", v.get("session_id"), "updated", v.get("updated_at"))

# try each recent session_id
for k,v in sess.items():
    if k.startswith("_") or not isinstance(v, dict): continue
    sid = str(v.get("session_id") or "")
    phone = mod._resolve_phone({}, {"session_id": sid})
    print("resolve_sid", sid, "phone", phone)
    if phone:
        try:
            print("  tenant", mod._resolve_tenant(phone))
        except Exception as e:
            print("  TENANT_ERR", e)

# active sender stamp
p = Path("/opt/data/runtime/kasir_active_sender.json")
print("stamp", p.read_text() if p.exists() else None)
'''
sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-terdaftar-probe.py", "w") as fh:
    fh.write(probe)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/umkm-terdaftar-probe.py")

c.close()
