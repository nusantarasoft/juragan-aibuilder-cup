#!/usr/bin/env python3
"""Upload nav label fixes and rebuild admin only."""
from __future__ import annotations
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
ROOT = Path(__file__).resolve().parents[2]
p = Path(__file__).resolve().parent / "deploy.local.env"
env = {}
for line in p.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

FILES = [
    "admin/src/components/layout/CMSLayoutImpl.tsx",
    "admin/src/config/menuConfig.tsx",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["SSH_HOST"], username=env.get("SSH_USER", "root"), password=env["SSH_PASS"], timeout=40, allow_agent=False, look_for_keys=False)
tr = c.get_transport()
if tr:
    tr.set_keepalive(30)

sftp = c.open_sftp()
for rel in FILES:
    print("put", rel, flush=True)
    sftp.put(str(ROOT / rel), f"/opt/nusantarasoft-3/{rel}")
sftp.close()

_, o, e = c.exec_command(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production build admin && "
    "docker compose -f docker-compose.master-production.yml --env-file .env.master-production up -d admin",
    timeout=900,
)
o.channel.settimeout(900)
out = o.read().decode("utf-8", "replace")
err = e.read().decode("utf-8", "replace")
code = o.channel.recv_exit_status()
print(out[-2000:] if out else "", flush=True)
if err.strip():
    print("STDERR", err[-1000:], flush=True)
print("exit", code, flush=True)
c.close()
sys.exit(code)
