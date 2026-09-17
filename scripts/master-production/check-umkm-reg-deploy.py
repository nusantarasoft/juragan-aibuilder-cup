#!/usr/bin/env python3
"""Quick remote status for UMKM registration deploy."""
from __future__ import annotations

from pathlib import Path

import paramiko

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
cmd = (
    "ps -eo pid,etime,cmd | grep -E '[d]ocker|[c]ompose' | head -30; "
    "echo ---; "
    "docker ps --format 'table {{.Names}}\\t{{.Status}}' | head -30; "
    "echo ---; "
    "test -f /opt/nusantarasoft-3/volumes/hermes/plugins/kasir-pipe/register.py "
    "&& echo register.py=OK || echo register.py=MISSING; "
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -tAc "
    "\"SELECT to_regclass('public.studio_umkm_registrations');\" 2>/dev/null || true"
)
_, o, e = c.exec_command(cmd, timeout=90)
out = o.read().decode("utf-8", "replace")
err = e.read().decode("utf-8", "replace")
code = o.channel.recv_exit_status()
print(out if out else "(no stdout)")
if err.strip():
    print("STDERR", err)
print("exit", code)
c.close()
