#!/usr/bin/env python3
"""Restore lid-mapping for Bu Kades after accidental cleanup."""
from __future__ import annotations

import json
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

PHONE = "628568713897"
LID = "184860442402958"  # from prior prod logs/stamp

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

script = f'''
import json
from pathlib import Path
session = Path("/opt/data/platforms/whatsapp/session")
session.mkdir(parents=True, exist_ok=True)
# Baileys lid-mapping files store the LID as JSON string/number
path = session / "lid-mapping-{PHONE}.json"
path.write_text(json.dumps("{LID}"), encoding="utf-8")
print("wrote", path, "->", path.read_text())
# also common reverse filename used by some bridges
rev = session / f"lid-mapping-{LID}.json"
if not rev.exists():
    # do not write reverse phone into lid-named file if format differs; skip
    print("skip reverse")
print("ok")
'''
# Fix - use proper content
script = (
    "import json\n"
    "from pathlib import Path\n"
    f"phone = '{PHONE}'\n"
    f"lid = '{LID}'\n"
    "session = Path('/opt/data/platforms/whatsapp/session')\n"
    "session.mkdir(parents=True, exist_ok=True)\n"
    "path = session / f'lid-mapping-{phone}.json'\n"
    "path.write_text(json.dumps(lid), encoding='utf-8')\n"
    "print('wrote', path, path.read_text())\n"
)

sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/restore-lid-map.py", "w") as fh:
    fh.write(script)
sftp.close()
_, o, e = c.exec_command(
    "docker exec nsoft3-hermes python3 /opt/data/restore-lid-map.py", timeout=30
)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err)
# restart hermes so allowlist cache refreshes with new lid map
_, o, e = c.exec_command(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml "
    "--env-file .env.master-production up -d --force-recreate --no-deps hermes",
    timeout=300,
)
print(o.read().decode("utf-8", "replace")[-1500:])
print(e.read().decode("utf-8", "replace")[-1500:])
import time

time.sleep(18)
_, o, e = c.exec_command(
    "docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status", timeout=30
)
print(o.read().decode("utf-8", "replace"))
c.close()
