#!/usr/bin/env python3
"""Deploy UMKM WA registration (DAFTAR → admin approve).

- Apply studio_umkm_registrations migration
- Ship middleware registration GraphQL + admin UI + kasir-pipe wizard
- Rebuild middleware + admin; recreate hermes; verify pair + table

Usage:
  python scripts/master-production/deploy-umkm-registration.py
"""
from __future__ import annotations

import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
REMOTE = "/opt/nusantarasoft-3"
COMPOSE = (
    f"cd {REMOTE} && docker compose -f docker-compose.master-production.yml "
    f"--env-file .env.master-production"
)
HERMES_EXEC = "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes"
MIGRATION = "supabase/migrations/00000000000104_studio_umkm_registrations.sql"

INCLUDE = [
    MIGRATION,
    "docker-compose.master-production.yml",
    ".env.master-production.example",
    "middleware/src/studio/studio.module.ts",
    "middleware/src/studio/studio.resolver.ts",
    "middleware/src/studio/studio-umkm-registration.service.ts",
    "admin/src/lib/studioService.ts",
    "admin/src/app/admin/ai-studio/umkm/page.tsx",
    "scripts/master-production/hermes-plugins/kasir-pipe",
    "scripts/master-production/hermes-home/SOUL.md",
]


def load_env() -> dict[str, str]:
    path = Path(__file__).resolve().parent / "deploy.local.env"
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> int:
    env = load_env()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["SSH_HOST"],
        username=env.get("SSH_USER", "root"),
        password=env["SSH_PASS"],
        timeout=40,
        allow_agent=False,
        look_for_keys=False,
    )
    if client.get_transport():
        client.get_transport().set_keepalive(30)

    def run(cmd: str, timeout: int = 2400) -> tuple[int, str]:
        print(f"\n>>> {cmd[:280]}", flush=True)
        _, o, e = client.exec_command(cmd, timeout=timeout)
        o.channel.settimeout(timeout)
        out = o.read().decode("utf-8", "replace")
        err = e.read().decode("utf-8", "replace")
        code = o.channel.recv_exit_status()
        if out.strip():
            print(out[-5000:], flush=True)
        if err.strip():
            print("STDERR " + err[-2000:], flush=True)
        print(f"exit={code}", flush=True)
        return code, out

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tf:
        tar_path = Path(tf.name)
    with tarfile.open(tar_path, "w:gz") as tar:
        for rel in INCLUDE:
            path = ROOT / rel
            if not path.exists():
                print("MISSING", rel, flush=True)
                continue
            tar.add(
                path,
                arcname=rel,
                filter=lambda info: None if "__pycache__" in info.name else info,
            )
            print("+", rel, flush=True)

    sftp = client.open_sftp()
    sftp.put(str(tar_path), f"{REMOTE}/.tmp-umkm-reg.tar.gz")
    sftp.close()
    tar_path.unlink(missing_ok=True)

    run(f"cd {REMOTE} && tar xzf .tmp-umkm-reg.tar.gz && rm -f .tmp-umkm-reg.tar.gz")

    # Migration (idempotent CREATE IF NOT EXISTS)
    code, _ = run(
        f"docker exec -i nsoft3-postgres psql -U supabase_admin -d nusantarasoft "
        f"-v ON_ERROR_STOP=1 < {REMOTE}/{MIGRATION}"
    )
    if code != 0:
        client.close()
        return code
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -tAc "
        "\"SELECT to_regclass('public.studio_umkm_registrations');\""
    )
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
        "\"INSERT INTO public.schema_migrations (id) "
        "VALUES ('supabase/migrations/00000000000104_studio_umkm_registrations.sql') "
        "ON CONFLICT (id) DO NOTHING;\""
    )
    # PostgREST only sees new tables after schema reload
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
        "\"NOTIFY pgrst, 'reload schema';\""
    )
    run("docker restart nsoft3-supabase-rest || true")
    run("sleep 6")

    # Ensure KASIR_REGISTRATION on server env if missing
    run(
        "python3 - <<'PY'\n"
        "from pathlib import Path\n"
        "p = Path('/opt/nusantarasoft-3/.env.master-production')\n"
        "t = p.read_text(encoding='utf-8')\n"
        "if 'KASIR_REGISTRATION=' not in t:\n"
        "    p.write_text(t.rstrip() + '\\nKASIR_REGISTRATION=1\\n', encoding='utf-8')\n"
        "    print('appended KASIR_REGISTRATION=1')\n"
        "else:\n"
        "    print('KASIR_REGISTRATION already set')\n"
        "PY"
    )

    # Plugins + SOUL into Hermes volume
    run(
        f"mkdir -p {REMOTE}/volumes/hermes/plugins && "
        f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe "
        f"{REMOTE}/volumes/hermes/plugins/ && "
        f"cp -f {REMOTE}/scripts/master-production/hermes-home/SOUL.md "
        f"{REMOTE}/volumes/hermes/SOUL.md"
    )

    # Restore plugins.enabled before recreate
    run(
        "python3 - <<'PY'\n"
        "from pathlib import Path\n"
        "import re\n"
        "p = Path('/opt/nusantarasoft-3/volumes/hermes/config.yaml')\n"
        "t = p.read_text(encoding='utf-8')\n"
        "block = '''plugins:\\n"
        "  enabled:\\n"
        "    - kasir-pipe\\n"
        "    - kasir-probe\\n"
        "    - kasir-tools\\n"
        "  disabled: []\\n"
        "  entries:\\n"
        "    kasir-probe:\\n"
        "      allow_tool_override: false\\n"
        "    kasir-tools:\\n"
        "      allow_tool_override: false\\n"
        "    kasir-pipe:\\n"
        "      allow_tool_override: false\\n"
        "'''\n"
        "if re.search(r'(?m)^plugins:\\s*$', t):\n"
        "    t2 = re.sub(r'(?ms)^plugins:\\n.*?(?=^[a-zA-Z_]|\\Z)', block + '\\n', t, count=1)\n"
        "else:\n"
        "    t2 = t.rstrip() + '\\n\\n' + block\n"
        "p.write_text(t2, encoding='utf-8')\n"
        "print('plugins.enabled restored')\n"
        "PY"
    )

    code, _ = run(
        f"{COMPOSE} build middleware admin && "
        f"{COMPOSE} up -d --force-recreate --no-deps middleware admin hermes",
        timeout=2400,
    )
    if code != 0:
        client.close()
        return code

    run("sleep 28")
    run("docker restart nsoft3-nginx >/dev/null || true")

    # Verify
    run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
    run(
        "docker exec nsoft3-hermes sh -lc "
        "'ls /opt/data/plugins/kasir-pipe/register.py && "
        "grep -E \"^version:\" /opt/data/plugins/kasir-pipe/plugin.yaml' || true"
    )
    run(
        "docker exec nsoft3-hermes sh -lc "
        "'grep -iE \"kasir-pipe registered|registration\" /opt/data/logs/agent.log | tail -n 20' || true"
    )
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
        "\"\\d public.studio_umkm_registrations\""
    )
    # Confirm GraphQL schema has new fields (middleware healthy)
    run(
        "docker exec nsoft3-middleware sh -lc "
        "'wget -q -O - http://127.0.0.1:4001/health 2>&1 | head -c 300 || "
        "wget -q -O - http://127.0.0.1:4001/api/health 2>&1 | head -c 300 || true'"
    )

    client.close()
    print("\nDONE — smoke: unlisted WA → DAFTAR → nama → YA → Approve di /admin/ai-studio/umkm", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
