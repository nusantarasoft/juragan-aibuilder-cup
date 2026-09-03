#!/usr/bin/env python3
"""Disable production WAHA — Hermes-only WhatsApp stack.

- Stops and removes container nsoft3-waha (keeps docker volume waha-sessions)
- Uploads compose with waha behind profile waha-rollback
- Recreates middleware+hermes without starting WAHA
- Verifies WHATSAPP_PROVIDER=hermes and Hermes /pair/status WORKING

Does NOT: wipe Hermes creds, logout Baileys, delete waha-sessions volume.
"""
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
t = c.get_transport()
if t is not None:
    t.set_keepalive(30)


def run(cmd: str, timeout: int = 300) -> tuple[int, str]:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip()[:4000], flush=True)
    if err.strip():
        print("STDERR", err.rstrip()[:800], flush=True)
    print(f"exit={code}", flush=True)
    return code, out


# ── Preflight ─────────────────────────────────────────────────────────────
code, prov = run(
    "grep -E '^WHATSAPP_PROVIDER=' /opt/nusantarasoft-3/.env.master-production || true"
)
if "WHATSAPP_PROVIDER=hermes" not in prov:
    print("ABORT: WHATSAPP_PROVIDER is not hermes — refuse to remove WAHA", flush=True)
    c.close()
    sys.exit(2)

code, pair = run(
    'docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true'
)
if '"status": "WORKING"' not in pair and '"status":"WORKING"' not in pair:
    print(f"ABORT: Hermes pair status not WORKING — refuse to remove WAHA\n{pair[:500]}", flush=True)
    c.close()
    sys.exit(3)

# ── Stop + remove WAHA container (keep volume) ─────────────────────────────
run("docker stop nsoft3-waha || true", timeout=120)
run("docker rm nsoft3-waha || true", timeout=60)
run("docker ps -a --filter name=nsoft3-waha --format '{{.Names}} {{.Status}}' || true")
run("docker volume ls | grep -i waha || true")

# ── Upload compose (waha profile) + recreate without WAHA ──────────────────
compose_local = ROOT / "docker-compose.master-production.yml"
sftp = c.open_sftp()
sftp.put(str(compose_local), "/opt/nusantarasoft-3/docker-compose.master-production.yml")
sftp.close()
print("uploaded compose", flush=True)

run(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production up -d middleware hermes",
    timeout=300,
)

time.sleep(8)

# ── Postflight ────────────────────────────────────────────────────────────
run("docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'nsoft3-(waha|hermes|middleware)' || true")
run(
    "grep -E '^WHATSAPP_PROVIDER=' /opt/nusantarasoft-3/.env.master-production"
)
run(
    r"""docker exec nsoft3-middleware node -e "console.log('provider', process.env.WHATSAPP_PROVIDER)" """
)
run('docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true')
run(
    """docker exec nsoft3-middleware node -e "fetch('http://hermes:8765/pair/status').then(r=>r.text()).then(console.log).catch(e=>{console.error(e); process.exit(1);})" """
)

print("\nDONE: WAHA container removed; Hermes remains live. Volume waha-sessions retained for rollback.", flush=True)
c.close()
