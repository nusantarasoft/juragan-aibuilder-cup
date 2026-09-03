#!/usr/bin/env python3
"""Apply session_name rename migration + redeploy Hermes-only GraphQL/UI."""
from __future__ import annotations

import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
ROOT = Path(__file__).resolve().parents[2]
REMOTE = "/opt/nusantarasoft-3"
p = Path(__file__).resolve().parent / "deploy.local.env"
env: dict[str, str] = {}
for line in p.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

INCLUDE = [
    "supabase/migrations/00000000000095_rename_session_name.sql",
    "middleware/sql/rename_session_name.sql",
    "middleware/sql/studio_whatsapp.sql",
    "middleware/sql/studio_whatsapp_multitenant.sql",
    "middleware/sql/studio_whatsapp_shared_inbox.sql",
    "middleware/sql/studio_umkm_setup.sql",
    "middleware/src/studio/studio-whatsapp.service.ts",
    "middleware/src/studio/studio-whatsapp.util.ts",
    "middleware/src/studio/studio.resolver.ts",
    "middleware/src/studio/studio-umkm.cron.ts",
    "middleware/src/whatsapp/whatsapp-provider.module.ts",
    "middleware/src/whatsapp/webhook-hmac.spec.ts",
    "admin/src/lib/studioService.ts",
    "admin/src/app/admin/ai-studio/ai-gateway/page.tsx",
    "admin/src/app/admin/ai-studio/umkm/page.tsx",
    "scripts/master-production/hermes-plugins/kasir-pipe",
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
if tr:
    tr.set_keepalive(30)


def run(cmd: str, timeout: int = 1800) -> tuple[int, str]:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out[-3500:], flush=True)
    if err.strip():
        print("STDERR", err[-1500:], flush=True)
    print(f"exit={code}", flush=True)
    return code, out


with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tf:
    tar_path = Path(tf.name)
with tarfile.open(tar_path, "w:gz") as tar:
    for rel in INCLUDE:
        path = ROOT / rel
        if path.exists():
            tar.add(path, arcname=rel)
            print("pack", rel, flush=True)

sftp = c.open_sftp()
remote_tar = f"{REMOTE}/.tmp-session-rename.tar.gz"
sftp.put(str(tar_path), remote_tar)
sftp.close()
tar_path.unlink(missing_ok=True)

run(f"cd {REMOTE} && tar xzf .tmp-session-rename.tar.gz && rm -f .tmp-session-rename.tar.gz")
run(
    f"mkdir -p {REMOTE}/volumes/hermes/plugins/kasir-pipe && "
    f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe/. "
    f"{REMOTE}/volumes/hermes/plugins/kasir-pipe/"
)

# Apply SQL via postgres container
code, _ = run(
    f"docker exec -i nsoft3-postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1 "
    f"< {REMOTE}/supabase/migrations/00000000000095_rename_session_name.sql"
)

run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -tAc "
    "\"SELECT column_name FROM information_schema.columns "
    "WHERE table_schema='public' AND table_name='studio_whatsapp_config' "
    "AND column_name IN ('session_name','waha_session') ORDER BY 1;\""
)

code, _ = run(
    f"cd {REMOTE} && docker compose -f docker-compose.master-production.yml "
    f"--env-file .env.master-production build middleware admin && "
    f"docker compose -f docker-compose.master-production.yml --env-file .env.master-production "
    f"up -d middleware admin hermes --force-recreate",
    timeout=1800,
)

run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
c.close()
sys.exit(0 if code == 0 else code)
