#!/usr/bin/env python3
"""Dump broken nginx.conf around line 39 from prod container volume."""
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
    "docker inspect nsoft3-nginx --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'",
    "nl -ba /opt/nusantarasoft-3/nginx/nginx.conf 2>/dev/null | sed -n '1,80p' || true",
    "find /opt/nusantarasoft-3 -name 'nginx.conf' 2>/dev/null | head",
    "ls -la /opt/nusantarasoft-3/nginx /opt/nusantarasoft-3/deploy/nginx 2>/dev/null || true",
]

for cmd in cmds:
    print("\n>>>", cmd[:140], flush=True)
    _, o, e = c.exec_command(cmd, timeout=60)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    print(out[-5000:] if out.strip() else "(empty)")
    if err.strip():
        print("STDERR", err[-800:])

c.close()
