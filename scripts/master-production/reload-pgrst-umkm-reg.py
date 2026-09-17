#!/usr/bin/env python3
"""Reload PostgREST schema cache so studio_umkm_registrations is visible."""
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


def run(cmd: str, timeout: int = 90) -> tuple[int, str]:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-3000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return code, out


# Preferred: NOTIFY; also restart rest container as belt-and-suspenders
run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"NOTIFY pgrst, 'reload schema';\""
)
run("docker restart nsoft3-supabase-rest")
run("sleep 8")

# Verify from Hermes (same path as kasir-pipe)
code, out = run("docker exec nsoft3-hermes python3 /opt/data/umkm-rest-probe.py")
ok = "HTTP 200" in out or (out.strip().startswith("[") or "HTTP 200" in out)
# probe prints HTTP status line
if "HTTPError" in out or "PGRST205" in out:
    print("STILL BROKEN", flush=True)
    # try grant to authenticator/anon exposure via API schemas
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
        "\"GRANT ALL ON public.studio_umkm_registrations TO anon, authenticated, service_role, authenticator; "
        "NOTIFY pgrst, 'reload schema';\""
    )
    run("docker restart nsoft3-supabase-rest")
    run("sleep 8")
    run("docker exec nsoft3-hermes python3 /opt/data/umkm-rest-probe.py")
else:
    print("SCHEMA CACHE OK — retry DAFTAR on WhatsApp", flush=True)

c.close()
