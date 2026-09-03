#!/usr/bin/env python3
"""Deploy kasir-pipe pair.py (meId from creds) and restart Hermes gateway."""
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

LOCAL = ROOT / "scripts/master-production/hermes-plugins/kasir-pipe/pair.py"
REMOTE = "/opt/nusantarasoft-3/volumes/hermes/plugins/kasir-pipe/pair.py"

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


def run(cmd: str, timeout: int = 180) -> str:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out.rstrip()[:3000], flush=True)
    if err.strip():
        print("STDERR", err.rstrip()[:800], flush=True)
    print(f"exit={code}", flush=True)
    return out


# Show whether fix is already present on server
run(f"grep -n '_me_id_from_creds\\|meId' {REMOTE} | head -20")

sftp = c.open_sftp()
sftp.put(str(LOCAL), REMOTE)
sftp.close()
print(f"uploaded {LOCAL.name} -> {REMOTE}", flush=True)

run(f"grep -n '_me_id_from_creds' {REMOTE} | head -5")
run("chown hermes:hermes /opt/nusantarasoft-3/volumes/hermes/plugins/kasir-pipe/pair.py || true")

# Restart gateway so plugin code reloads (creds stay on volume)
run("docker restart nsoft3-hermes", timeout=120)
time.sleep(12)
run("docker ps --filter name=nsoft3-hermes --format '{{.Names}} {{.Status}}'")

# Wait for bridge /pair
for i in range(12):
    out = run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
    if "WORKING" in out or "credsPresent" in out:
        break
    time.sleep(5)

run(
    "docker exec nsoft3-middleware node -e "
    "\"fetch('http://hermes:8765/pair/status').then(r=>r.text()).then(console.log).catch(e=>console.error(e))\""
)

# Peek creds me.id (digits only summary)
run(
    "docker exec nsoft3-hermes python3 -c "
    "\"import json; d=json.load(open('/opt/data/platforms/whatsapp/session/creds.json')); "
    "me=(d.get('me') or (d.get('creds') or {}).get('me') or {}); "
    "print('creds_me', me.get('id') or me)\""
)

print("\nDONE: pair.py deployed; check meId in /pair/status above.", flush=True)
c.close()
