#!/usr/bin/env python3
"""Inspect and try to recover nsoft3-nginx after UMKM deploy."""
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

cmds = [
    "docker logs nsoft3-nginx --tail 80 2>&1",
    "docker inspect -f '{{json .State}}' nsoft3-nginx",
    # Recreate nginx from compose (safer than blind restart loop)
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production up -d --force-recreate --no-deps nginx",
    "sleep 5",
    "docker ps --filter name=nsoft3-nginx --format '{{.Names}} {{.Status}}'",
    "docker logs nsoft3-nginx --tail 40 2>&1",
]

for cmd in cmds:
    print("\n>>>", cmd[:160], flush=True)
    _, o, e = c.exec_command(cmd, timeout=180)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = (out or "") + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-4500:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)

c.close()
