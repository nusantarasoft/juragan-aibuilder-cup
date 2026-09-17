#!/usr/bin/env python3
"""Verify UMKM registration deploy health."""
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
    "docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true",
    "docker exec nsoft3-hermes sh -lc 'grep -E \"^version:\" /opt/data/plugins/kasir-pipe/plugin.yaml; ls /opt/data/plugins/kasir-pipe/register.py'",
    "docker exec nsoft3-hermes sh -lc 'grep -iE \"kasir-pipe registered|plugins\" /opt/data/logs/agent.log | tail -n 25' || true",
    "docker exec nsoft3-hermes printenv KASIR_REGISTRATION || true",
    "docker inspect -f '{{.State.Status}} {{.State.Health.Status}}' nsoft3-middleware nsoft3-admin nsoft3-nginx 2>/dev/null || true",
    "docker ps --filter name=nsoft3-nginx --format '{{.Names}} {{.Status}}'",
]

for cmd in cmds:
    print("\n>>>", cmd[:120], flush=True)
    _, o, e = c.exec_command(cmd, timeout=60)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    print(out if out.strip() else "(empty)")
    if err.strip():
        print("STDERR", err[-800:])

c.close()
