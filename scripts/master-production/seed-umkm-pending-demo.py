#!/usr/bin/env python3
"""Insert one pending registration for admin UI smoke (synthetic phone)."""
from __future__ import annotations

import sys
import uuid
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

PHONE = "6280000000888"
STORE = "Warung Demo Approve"

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parent / "deploy.local.env").read_text(
    encoding="utf-8"
).splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

rid = str(uuid.uuid4())
sql = f"""
DELETE FROM public.studio_umkm_registrations WHERE phone = '{PHONE}';
INSERT INTO public.studio_umkm_registrations
  (id, phone, store_name, status, wizard_step, session_name)
VALUES
  ('{rid}', '{PHONE}', '{STORE}', 'pending', 'done', 'hermes');
SELECT id::text, phone, store_name, status, created_at
FROM public.studio_umkm_registrations WHERE status='pending' ORDER BY created_at DESC;
"""

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
sftp = c.open_sftp()
path = "/opt/nusantarasoft-3/.tmp-umkm-pending-demo.sql"
with sftp.file(path, "w") as fh:
    fh.write(sql)
sftp.close()
_, o, e = c.exec_command(
    f"docker exec -i nsoft3-postgres psql -U supabase_admin -d nusantarasoft "
    f"-v ON_ERROR_STOP=1 < {path}",
    timeout=60,
)
print(o.read().decode("utf-8", "replace"))
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err)
print("id=", rid)
print("Open: http://%s:3013/admin/ai-studio/umkm" % env["SSH_HOST"])
c.close()
