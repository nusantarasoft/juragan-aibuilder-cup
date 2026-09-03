#!/usr/bin/env python3
"""Deploy meId display fix: admin gateway page + middleware phone util; rebuild both."""
from __future__ import annotations

import sys
import time
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
    "admin/src/app/admin/ai-studio/ai-gateway/page.tsx",
    "middleware/src/studio/studio-whatsapp.util.ts",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["SSH_HOST"], username=env.get("SSH_USER", "root"), password=env["SSH_PASS"], timeout=40, allow_agent=False, look_for_keys=False)
tr = c.get_transport()
if tr:
    tr.set_keepalive(30)


def run(cmd: str, timeout: int = 900) -> int:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip()[-2500:], flush=True)
    if err.strip():
        print("STDERR", err.rstrip()[-1200:], flush=True)
    print(f"exit={code}", flush=True)
    return code


sftp = c.open_sftp()
for rel in FILES:
    print(f"put {rel}", flush=True)
    sftp.put(str(ROOT / rel), f"/opt/nusantarasoft-3/{rel}")
sftp.close()

for svc in ("middleware", "admin"):
    code = run(
        f"cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
        f"--env-file .env.master-production build {svc}",
        timeout=900,
    )
    if code != 0:
        print(f"ABORT build {svc}", flush=True)
        c.close()
        sys.exit(code)
    run(
        f"cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
        f"--env-file .env.master-production up -d {svc}",
        timeout=180,
    )

time.sleep(5)
run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true", timeout=30)
run("docker exec nsoft3-middleware node -e \"console.log(process.env.WHATSAPP_PROVIDER)\"", timeout=30)
print("\nDONE", flush=True)
c.close()
