#!/usr/bin/env python3
"""T7: apply kasir_period_report migration + deploy Hermes period path + smoke.

Ships SQL + kasir-tools + SOUL (no full stack rebuild). Then runs
deploy-kasir-tools.py recreate/health, then period-preset smoke.

Usage:
  python scripts/master-production/deploy-kasir-period-rpc.py
  python scripts/master-production/deploy-kasir-period-rpc.py --smoke-phone 6287859031592
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
REMOTE = "/opt/nusantarasoft-3"
MIG = "supabase/migrations/20261006120000_kasir_period_report.sql"
MIG_ID = f"supabase/migrations/{Path(MIG).name}"

INCLUDE = [
    MIG,
    "scripts/master-production/hermes-plugins/kasir-tools",
    "scripts/master-production/hermes-home/SOUL.md",
    "scripts/master-production/apply-migrations.sh",
]


def load_env() -> dict[str, str]:
    path = Path(__file__).resolve().parent / "deploy.local.env"
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def connect(env: dict[str, str]) -> paramiko.SSHClient:
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
    return client


def make_runner(client: paramiko.SSHClient):
    def run(cmd: str, timeout: int = 900) -> tuple[int, str]:
        print(f"\n>>> {cmd[:240]}", flush=True)
        _, out_s, err_s = client.exec_command(cmd, timeout=timeout)
        out_s.channel.settimeout(timeout)
        out = out_s.read().decode("utf-8", "replace")
        err = err_s.read().decode("utf-8", "replace")
        code = out_s.channel.recv_exit_status()
        if out.strip():
            print(out[-5000:], flush=True)
        if err.strip():
            print("STDERR " + err[-1500:], flush=True)
        print(f"exit={code}", flush=True)
        return code, out

    return run


def ship_migration(client: paramiko.SSHClient, run) -> None:
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as handle:
        tar_path = Path(handle.name)
    with tarfile.open(tar_path, "w:gz") as tar:
        for rel in INCLUDE:
            path = ROOT / rel
            if not path.exists():
                raise SystemExit(f"MISSING {rel}")
            tar.add(
                path,
                arcname=rel,
                filter=lambda info: None if "__pycache__" in info.name else info,
            )
            print(f"  + {rel}", flush=True)
    remote_tar = f"{REMOTE}/.tmp-period-rpc.tar.gz"
    sftp = client.open_sftp()
    sftp.put(str(tar_path), remote_tar)
    sftp.close()
    tar_path.unlink(missing_ok=True)
    run(f"cd {REMOTE} && tar xzf .tmp-period-rpc.tar.gz && rm -f .tmp-period-rpc.tar.gz")


def apply_migration(run) -> int:
    # Idempotent: apply SQL then mark schema_migrations (CREATE OR REPLACE safe).
    code, _ = run(
        f"docker exec -i nsoft3-postgres psql -U supabase_admin -d nusantarasoft "
        f"-v ON_ERROR_STOP=1 < {REMOTE}/{MIG}"
    )
    if code != 0:
        return code
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -q -c "
        "\"CREATE TABLE IF NOT EXISTS public.schema_migrations "
        "(id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()); "
        f"INSERT INTO public.schema_migrations (id) VALUES ('{MIG_ID}') "
        "ON CONFLICT (id) DO NOTHING;\""
    )
    code, out = run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -tAc "
        "\"SELECT proname FROM pg_proc WHERE proname='kasir_period_report';\""
    )
    if code != 0 or "kasir_period_report" not in out:
        print("FAIL: kasir_period_report missing after migrate", flush=True)
        return 1
    # Best-effort PostgREST schema reload (NOTIFY already in migration).
    run(
        "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -q -c "
        "\"NOTIFY pgrst, 'reload schema';\" || true"
    )
    run(
        "docker ps --format '{{.Names}}' | grep -E 'rest|postgrest|kong' || true"
    )
    return 0


def period_smoke(client: paramiko.SSHClient, run, phone: str) -> int:
    smoke = f'''#!/usr/bin/env python3
import importlib.util, os, sys, types
root = "/opt/data/plugins/kasir-tools"
pkg = types.ModuleType("kasir_tools")
pkg.__path__ = [root]
sys.modules["kasir_tools"] = pkg

def load(name, file):
    full = f"kasir_tools.{{name}}" if name else "kasir_tools"
    spec = importlib.util.spec_from_file_location(full, f"{{root}}/{{file}}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[full] = mod
    if not name:
        sys.modules["kasir_tools"] = mod
        mod.__path__ = [root]
    spec.loader.exec_module(mod)
    return mod

ident = load("identity", "identity.py")
period = load("period", "period.py")
mod = load("", "__init__.py")
phone = {phone!r}
chat = f"{{phone}}@s.whatsapp.net"
print("KASIR_PERIOD_RPC", os.environ.get("KASIR_PERIOD_RPC", "<default>"))
print("period.py", period.__file__)
print("presets", period.PERIOD_PRESETS)

# Refuse matrix (no DB)
for raw, expect in [("2024", "refuse"), ("dari 1 jan sampai 15 mar", "refuse"), ("triwulan", "ambig")]:
    try:
        period.compile_period(raw, "today")
        print("FAIL compile should refuse", raw)
        sys.exit(1)
    except period.PeriodRefuse:
        if expect != "refuse":
            print("FAIL expected ambig got refuse", raw)
            sys.exit(1)
        print("ok refuse", raw)
    except period.PeriodAmbiguous:
        if expect != "ambig":
            print("FAIL expected refuse got ambig", raw)
            sys.exit(1)
        print("ok ambig", raw)

# Eng E7: report strips model phone — stamp + JID kwargs (prod path).
ident.remember_sender(chat_id=chat, phone=phone)
tenant = mod._resolve_tenant(phone)
print("tenant", tenant)

fails = []
for preset in ("today", "month", "year", "last_3_months", "quarter", "quarter_last", "last_year"):
    # Direct RPC path (SoT)
    label, payload = mod._fetch_period_payload(tenant, preset, top_n=5)
    print(f"=== rpc {{preset}} label={{label}} orders={{payload.get('order_count')}} ===")
    for key in ("order_count", "revenue", "purchase_total", "top_products"):
        if key not in payload:
            fails.append(f"{{preset}}:missing:{{key}}")
    text = mod._handle_report({{"period": preset}}, chat_id=chat)
    head = (text or "").replace("\\n", " ")[:180]
    print(f"=== report {{preset}} ===")
    print(head)
    if not text or "KASIR_" in text or "traceback" in text.lower() or "kasir_period_report" in text:
        fails.append(preset)
    if "Nomor pengirim tidak dikenali" in text:
        fails.append(preset + ":nostamp")
    if "Laporan" not in text and "Penjualan" not in text:
        fails.append(preset + ":shape")

if fails:
    print("FAIL presets", fails)
    sys.exit(1)
print("PERIOD_SMOKE_OK")
'''
    sftp = client.open_sftp()
    remote = f"{REMOTE}/volumes/hermes/period-rpc-smoke.py"
    with sftp.file(remote, "w") as f:
        f.write(smoke)
    sftp.close()
    code, out = run(
        "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes "
        "python3 /opt/data/period-rpc-smoke.py",
        timeout=180,
    )
    if code != 0 or "PERIOD_SMOKE_OK" not in out:
        print("FAIL period smoke", flush=True)
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke-phone", default="6287859031592")
    parser.add_argument(
        "--skip-tools-deploy",
        action="store_true",
        help="Only apply migration + period smoke (plugins already on host)",
    )
    args = parser.parse_args()
    phone = "".join(ch for ch in args.smoke_phone if ch.isdigit())

    client = connect(load_env())
    run = make_runner(client)
    try:
        print("=== T7a ship + apply migration ===", flush=True)
        ship_migration(client, run)
        if apply_migration(run) != 0:
            return 1
    finally:
        client.close()

    if not args.skip_tools_deploy:
        print("=== T7b deploy-kasir-tools ===", flush=True)
        code = subprocess.call(
            [
                sys.executable,
                str(ROOT / "scripts/master-production/deploy-kasir-tools.py"),
            ],
            cwd=str(ROOT),
        )
        if code != 0:
            print("FAIL deploy-kasir-tools", flush=True)
            return code

    print("=== T7c period smoke ===", flush=True)
    client = connect(load_env())
    run = make_runner(client)
    try:
        # Ensure latest period modules are on volume even if tools deploy skipped.
        run(
            f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-tools "
            f"{REMOTE}/volumes/hermes/plugins/ && "
            f"cp -f {REMOTE}/scripts/master-production/hermes-home/SOUL.md "
            f"{REMOTE}/volumes/hermes/SOUL.md"
        )
        return period_smoke(client, run, phone)
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
