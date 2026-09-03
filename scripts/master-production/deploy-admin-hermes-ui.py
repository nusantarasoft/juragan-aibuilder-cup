#!/usr/bin/env python3
"""Upload Hermes-first admin UI sources and rebuild nsoft3-admin on production."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
ROOT = Path(__file__).resolve().parents[2]
p = Path(__file__).resolve().parent / "deploy.local.env"
env: dict[str, str] = {}
for line in p.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

FILES = [
    "admin/src/app/admin/ai-studio/umkm/page.tsx",
    "admin/src/app/admin/ai-studio/umkm/WhatsAppSimChatDrawer.tsx",
    "admin/src/app/admin/ai-studio/ai-gateway/page.tsx",
    "docker-compose.master-production.yml",
]

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
tr = c.get_transport()
if tr is not None:
    tr.set_keepalive(30)


def run(cmd: str, timeout: int = 600) -> tuple[int, str]:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip()[-4000:], flush=True)
    if err.strip():
        print("STDERR", err.rstrip()[-1500:], flush=True)
    print(f"exit={code}", flush=True)
    return code, out


sftp = c.open_sftp()
for rel in FILES:
    local = ROOT / rel
    remote = f"/opt/nusantarasoft-3/{rel}"
    print(f"put {rel}", flush=True)
    sftp.put(str(local), remote)
sftp.close()

code, _ = run(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production build admin",
    timeout=900,
)
if code != 0:
    print("ABORT: admin build failed", flush=True)
    c.close()
    sys.exit(code)

run(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production up -d admin",
    timeout=180,
)

time.sleep(5)
run("docker ps --filter name=nsoft3-admin --format '{{.Names}} {{.Status}}'")
run(
    "docker exec nsoft3-middleware node -e \"console.log('provider', process.env.WHATSAPP_PROVIDER)\""
)
run('docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true')
run("docker ps -a --filter name=nsoft3-waha --format '{{.Names}} {{.Status}}' || echo 'no legacy container'")

print("\nDONE: admin rebuilt with Hermes UI; legacy WhatsApp container should stay gone.", flush=True)
c.close()
