#!/usr/bin/env python3
"""Deploy Hermes-only purge: middleware + admin + kasir-pipe + compose HMAC rename."""
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

# Paths relative to repo root to ship (WAHA purge + Hermes-only GraphQL)
INCLUDE = [
    "docker-compose.master-production.yml",
    ".env.master-production.example",
    "middleware/src/app.module.ts",
    "middleware/src/studio/studio.module.ts",
    "middleware/src/studio/studio.resolver.ts",
    "middleware/src/studio/studio-whatsapp.service.ts",
    "middleware/src/studio/studio-whatsapp.controller.ts",
    "middleware/src/studio/studio-whatsapp.util.ts",
    "middleware/src/whatsapp",
    "middleware/src/ai/ai-settings.types.ts",
    "middleware/src/ai/ai-settings.service.ts",
    "middleware/src/docker/docker.service.ts",
    "middleware/src/notifications/notification.dispatcher.ts",
    "admin/src/lib/studioService.ts",
    "admin/src/app/admin/ai-studio/ai-gateway/page.tsx",
    "admin/src/app/admin/ai-studio/umkm/page.tsx",
    "admin/src/app/admin/ai-studio/settings",
    "admin/src/components/layout/CMSLayoutImpl.tsx",
    "admin/Dockerfile",
    "scripts/master-production/hermes-plugins/kasir-pipe",
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


def run(cmd: str, timeout: int = 1200) -> tuple[int, str]:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out[-3000:], flush=True)
    if err.strip():
        print("STDERR", err[-1500:], flush=True)
    print(f"exit={code}", flush=True)
    return code, out


with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tf:
    tar_path = Path(tf.name)

print(f"pack {tar_path}", flush=True)
with tarfile.open(tar_path, "w:gz") as tar:
    for rel in INCLUDE:
        path = ROOT / rel
        if not path.exists():
            print(f"MISSING {rel}", flush=True)
            continue
        tar.add(path, arcname=rel)

sftp = c.open_sftp()
remote_tar = f"{REMOTE}/.tmp-hermes-purge.tar.gz"
print(f"put {remote_tar}", flush=True)
sftp.put(str(tar_path), remote_tar)
sftp.close()
tar_path.unlink(missing_ok=True)

run(f"cd {REMOTE} && tar xzf .tmp-hermes-purge.tar.gz && rm -f .tmp-hermes-purge.tar.gz")
# Remove deleted WAHA Nest module if still on server
run(f"rm -rf {REMOTE}/middleware/src/waha")
run(
    f"rm -f {REMOTE}/middleware/src/whatsapp/waha.provider.ts "
    f"{REMOTE}/middleware/src/whatsapp/hermes-to-waha-webhook.normalizer.ts "
    f"{REMOTE}/middleware/src/whatsapp/hermes-to-waha-webhook.normalizer.spec.ts"
)

# Ensure HMAC env: copy legacy → new key if missing
run(
    f"""python3 - <<'PY'
from pathlib import Path
p = Path('{REMOTE}/.env.master-production')
text = p.read_text(encoding='utf-8')
lines = text.splitlines()
vals = {{}}
for line in lines:
    if '=' in line and not line.strip().startswith('#'):
        k,v = line.split('=',1)
        vals[k.strip()] = v.strip()
legacy = vals.get('WAHA_WEBHOOK_HMAC_KEY','')
new = vals.get('WHATSAPP_WEBHOOK_HMAC_KEY','')
changed = False
if legacy and not new:
    lines.append('WHATSAPP_WEBHOOK_HMAC_KEY=' + legacy)
    changed = True
    print('added WHATSAPP_WEBHOOK_HMAC_KEY from legacy')
elif new:
    print('WHATSAPP_WEBHOOK_HMAC_KEY already set')
else:
    print('WARN: no HMAC key found')
if changed:
    p.write_text('\\n'.join(lines)+'\\n', encoding='utf-8')
PY"""
)

# Sync kasir-pipe into Hermes volume plugins
run(
    f"mkdir -p {REMOTE}/volumes/hermes/plugins/kasir-pipe && "
    f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe/. "
    f"{REMOTE}/volumes/hermes/plugins/kasir-pipe/"
)

code, _ = run(
    f"cd {REMOTE} && docker compose -f docker-compose.master-production.yml "
    f"--env-file .env.master-production build middleware admin && "
    f"docker compose -f docker-compose.master-production.yml --env-file .env.master-production "
    f"up -d middleware admin hermes --force-recreate --remove-orphans",
    timeout=1800,
)

run(
    "docker exec nsoft3-middleware node -e "
    "\"console.log('provider='+process.env.WHATSAPP_PROVIDER);"
    "console.log('hmac_new='+(process.env.WHATSAPP_WEBHOOK_HMAC_KEY?'set':'empty'));"
    "console.log('hmac_legacy='+(process.env.WAHA_WEBHOOK_HMAC_KEY?'set':'empty'))\""
)
run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")

c.close()
sys.exit(0 if code == 0 else code)
