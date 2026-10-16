#!/usr/bin/env python3
"""Restore nginx.master-production.conf from repo and recreate nginx."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
LOCAL_CONF = ROOT / "volumes" / "nginx" / "nginx.master-production.conf"
REMOTE_CONF = "/opt/nusantarasoft-3/volumes/nginx/nginx.master-production.conf"

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


def run(cmd: str, timeout: int = 120) -> int:
    print(f"\n>>> {cmd[:200]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    safe = text.encode("ascii", "replace").decode("ascii")
    print((safe[-4000:] if safe.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return code


run(f"head -n 45 {REMOTE_CONF} | cat -A")
run(f"cp -a {REMOTE_CONF} {REMOTE_CONF}.bak.$(date +%Y%m%d%H%M%S)")
sftp = c.open_sftp()
sftp.put(str(LOCAL_CONF), REMOTE_CONF)
sftp.close()
print(f"uploaded {LOCAL_CONF.name} ({LOCAL_CONF.stat().st_size} bytes)", flush=True)

run(f"head -n 45 {REMOTE_CONF}")
run(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production up -d --force-recreate --no-deps nginx",
    timeout=180,
)
run("sleep 4")
run("docker ps --filter name=nsoft3-nginx --format '{{.Names}} {{.Status}}'")
run("docker exec nsoft3-nginx nginx -t 2>&1 || true")
run("curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/health || true")

c.close()
