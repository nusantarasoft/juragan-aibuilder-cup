#!/usr/bin/env python3
"""Diagnose UMKM registration 'sistem sibuk' — REST fetch from Hermes."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

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
    timeout=40,
    allow_agent=False,
    look_for_keys=False,
)


def run(cmd: str, timeout: int = 90) -> str:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    safe = text.encode("utf-8", "replace").decode("utf-8")
    print((safe[-5000:] if safe.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return out


run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -iE \"fetch registration|save registration|studio_umkm|registration\" "
    "/opt/data/logs/agent.log | tail -n 40'"
)

# Probe REST exactly like kasir-pipe
probe = r'''
import json, os, urllib.error, urllib.parse, urllib.request
base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
key = (
    os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or ""
).strip()
print("SUPABASE_URL=", base)
print("KEY_LEN=", len(key), "KEY_PREFIX=", key[:12] if key else None)
url = (
    f"{base}/rest/v1/studio_umkm_registrations"
    f"?select=id,phone,status&limit=3"
)
req = urllib.request.Request(
    url,
    headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    },
    method="GET",
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode()
        print("HTTP", resp.status)
        print(raw[:800])
except urllib.error.HTTPError as e:
    body = e.read().decode("utf-8", "replace")
    print("HTTPError", e.code, body[:1200])
except Exception as e:
    print("ERR", type(e).__name__, e)
'''

sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-rest-probe.py", "w") as fh:
    fh.write(probe)
sftp.close()

run("docker exec nsoft3-hermes python3 /opt/data/umkm-rest-probe.py")

# PostgREST schema visibility
run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT table_name FROM information_schema.tables "
    "WHERE table_schema='public' AND table_name='studio_umkm_registrations';\""
)
run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT grantee, privilege_type FROM information_schema.role_table_grants "
    "WHERE table_name='studio_umkm_registrations' ORDER BY 1,2;\""
)
run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT n.nspname, c.relname, c.relrowsecurity "
    "FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
    "WHERE c.relname='studio_umkm_registrations';\""
)

# Does PostgREST expose it? try via kong from middleware network
run(
    "docker exec nsoft3-middleware sh -lc "
    "'wget -qO- --header=\"apikey: $SERVICE_ROLE_KEY\" "
    "--header=\"Authorization: Bearer $SERVICE_ROLE_KEY\" "
    "http://kong:8000/rest/v1/studio_umkm_registrations?select=id&limit=1 2>&1 | head -c 800' "
    "|| true"
)

c.close()
