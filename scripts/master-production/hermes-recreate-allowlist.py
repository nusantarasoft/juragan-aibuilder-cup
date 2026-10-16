#!/usr/bin/env python3
"""Recreate nsoft3-hermes with allowlist=* so adapter owns the Baileys bridge."""
import time
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
repo = Path(__file__).resolve().parents[2]
envp = Path(__file__).resolve().parent / "deploy.local.env"
env = {}
for line in envp.read_text(encoding="utf-8").splitlines():
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


def run(cmd, t=180):
    print(f"\nCMD {cmd[:200]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=t)
    o.channel.settimeout(t)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    if out.strip():
        print(out.rstrip()[:3000], flush=True)
    if err.strip():
        print("ERR", err.rstrip()[:800], flush=True)
    return out


# persist env
run(
    r"""python3 - <<'PY'
from pathlib import Path
p = Path("/opt/nusantarasoft-3/.env.master-production")
text = p.read_text()
wanted = {
    "WHATSAPP_PROVIDER": "hermes",
    "WHATSAPP_ALLOWED_USERS": "*",
    "WHATSAPP_MODE": "bot",
    "WHATSAPP_ENABLED": "true",
}
lines = text.splitlines(True)
keys_seen = set()
out = []
for line in lines:
    raw = line.strip()
    if not raw or raw.startswith("#") or "=" not in raw:
        out.append(line)
        continue
    k = raw.split("=", 1)[0]
    if k in wanted:
        out.append(f"{k}={wanted[k]}\n")
        keys_seen.add(k)
    else:
        out.append(line)
for k, v in wanted.items():
    if k not in keys_seen:
        out.append(f"{k}={v}\n")
p.write_text("".join(out))
print("ok", {k: wanted[k] for k in wanted})
PY"""
)

compose_local = repo / "docker-compose.master-production.yml"
sftp = c.open_sftp()
sftp.put(str(compose_local), "/opt/nusantarasoft-3/docker-compose.master-production.yml")
sftp.close()
print("uploaded compose", flush=True)

run(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml --env-file .env.master-production up -d --force-recreate --no-deps hermes",
    t=180,
)
print("waiting hermes...", flush=True)
time.sleep(22)

run("docker exec nsoft3-hermes printenv WHATSAPP_PROVIDER WHATSAPP_ALLOWED_USERS WHATSAPP_MODE | cat")
# provider is on middleware; hermes may not have WHATSAPP_PROVIDER
run("docker exec nsoft3-hermes printenv WHATSAPP_ALLOWED_USERS WHATSAPP_MODE WHATSAPP_ENABLED")
run("docker exec nsoft3-hermes ps aux | grep -E 'node|python' | grep -v grep")
run(
    "docker exec nsoft3-hermes python3 -c \"import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:3000/health', timeout=5).read().decode())\""
)
run("docker logs nsoft3-hermes --since 1m 2>&1 | tail -40")
run("docker exec nsoft3-middleware wget -qO- --timeout=8 http://hermes:8765/pair/status; echo")
run(
    "docker exec nsoft3-middleware wget -S -O- --timeout=15 --header='Content-Type: application/json' "
    "--post-data='{\"chatId\":\"6280000000099@s.whatsapp.net\",\"message\":\"ping\"}' "
    "http://hermes:8765/send 2>&1 | tail -20"
)

c.close()
print("DONE", flush=True)
