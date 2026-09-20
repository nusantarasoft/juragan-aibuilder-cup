#!/usr/bin/env python3
"""Deploy Hermes kasir-tools (Supabase-direct). Recreate hermes only.

Middleware is not rebuilt: kasir business logic no longer goes through it.
Admin WhatsApp QR pairing stays on middleware GraphQL → Hermes /pair/*.

Usage:
  python scripts/master-production/deploy-kasir-tools.py
  python scripts/master-production/deploy-kasir-tools.py --smoke-phone 6287859031592
"""
from __future__ import annotations

import argparse
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
AGENT_LOG = "/opt/data/logs/agent.log"

INCLUDE = [
    "docker-compose.master-production.yml",
    ".env.master-production.example",
    "scripts/master-production/hermes-plugins/kasir-tools",
    "scripts/master-production/hermes-plugins/kasir-pipe",
    "scripts/master-production/hermes-home/SOUL.md",
    "scripts/master-production/hermes-kasir-health.py",
    "scripts/master-production/hermes-wa-tool-allowlist.py",
    "scripts/master-production/hermes-kasir-platform-locks.py",
    "scripts/master-production/hermes-kasir-posture.py",
    "scripts/master-production/hermes-multimodal-smoke.py",
    "scripts/master-production/hermes-consult-smoke.py",
    "scripts/master-production/prune-nsoft3-images.sh",
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
            print(out[-4500:], flush=True)
        if err.strip():
            print("STDERR " + err[-1500:], flush=True)
        print(f"exit={code}", flush=True)
        return code, out

    return run


def ship(client: paramiko.SSHClient, run) -> None:
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as handle:
        tar_path = Path(handle.name)
    with tarfile.open(tar_path, "w:gz") as tar:
        for rel in INCLUDE:
            path = ROOT / rel
            if not path.exists():
                print(f"MISSING {rel}", flush=True)
                continue
            tar.add(
                path,
                arcname=rel,
                filter=lambda info: None if "__pycache__" in info.name else info,
            )
            print(f"  + {rel}", flush=True)
    remote_tar = f"{REMOTE}/.tmp-kasir-tools.tar.gz"
    sftp = client.open_sftp()
    sftp.put(str(tar_path), remote_tar)
    sftp.close()
    tar_path.unlink(missing_ok=True)
    run(f"cd {REMOTE} && tar xzf .tmp-kasir-tools.tar.gz && rm -f .tmp-kasir-tools.tar.gz")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke-phone", default="")
    args = parser.parse_args()
    smoke_phone = "".join(ch for ch in (args.smoke_phone or "6287859031592") if ch.isdigit())

    client = connect(load_env())
    run = make_runner(client)
    try:
        ship(client, run)
        run(
            f"mkdir -p {REMOTE}/volumes/hermes/plugins && "
            f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-tools "
            f"{REMOTE}/volumes/hermes/plugins/ && "
            f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe "
            f"{REMOTE}/volumes/hermes/plugins/ && "
            f"cp -f {REMOTE}/scripts/master-production/hermes-home/SOUL.md "
            f"{REMOTE}/volumes/hermes/SOUL.md"
        )
        run(f"{HERMES_EXEC} hermes plugins doctor kasir-tools 2>&1 | tail -20 || true")
        run(f"{HERMES_EXEC} hermes plugins enable kasir-tools 2>&1 | tail -5 || true")
        run(f"{HERMES_EXEC} hermes plugins doctor kasir-pipe 2>&1 | tail -20 || true")
        run(f"{HERMES_EXEC} hermes plugins enable kasir-pipe 2>&1 | tail -5 || true")
        run(f"{HERMES_EXEC} hermes config set tools.tool_search.enabled off || true")

        # Host volume: plugins.enabled + display silence (creates display: if missing).
        run(
            f"HERMES_HOME={REMOTE}/volumes/hermes "
            f"python3 {REMOTE}/scripts/master-production/hermes-kasir-posture.py "
            f"apply --sync-plugins --skip-side"
        )

        code, _ = run(f"{COMPOSE} up -d --force-recreate --no-deps hermes", timeout=900)
        if code != 0:
            return code
        run("sleep 25")
        run(
            "docker exec nsoft3-hermes sh -lc "
            "'echo SUPABASE_URL=$SUPABASE_URL; "
            "echo SERVICE_KEY_LEN=${#SUPABASE_SERVICE_KEY}'"
        )

        # After recreate: re-assert posture + allowlist + platform locks + health.
        code, _ = run(
            f"HERMES_HOME={REMOTE}/volumes/hermes HERMES_CONTAINER=nsoft3-hermes "
            f"python3 {REMOTE}/scripts/master-production/hermes-kasir-posture.py "
            f"apply --docker --container nsoft3-hermes"
        )
        if code != 0:
            print(
                "FAIL posture/G2/G13 — see hermes-kasir-posture.py / hermes-gaps",
                flush=True,
            )
            return code

        run(
            f"docker exec nsoft3-hermes sh -lc "
            f"'grep -Ei \"kasir-pipe: allowlist|kasir-tools registered\" {AGENT_LOG} | tail -n 15' || true"
        )
        run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")

        run(
            f"docker cp {REMOTE}/scripts/master-production/hermes-multimodal-smoke.py "
            f"nsoft3-hermes:/opt/data/multimodal-smoke.py"
        )
        run(
            f"docker cp {REMOTE}/scripts/master-production/hermes-consult-smoke.py "
            f"nsoft3-hermes:/opt/data/consult-smoke.py"
        )
        code, _ = run(
            "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes "
            f"python3 /opt/data/multimodal-smoke.py off --phone {smoke_phone}",
            timeout=60,
        )
        if code != 0:
            print("FAIL multimodal OFF smoke", flush=True)
            return code

        allow_smoke = r'''#!/usr/bin/env python3
import importlib.util, sys, types
root = "/opt/data/plugins/kasir-pipe"
pkg = types.ModuleType("kasir_pipe"); pkg.__path__ = [root]; sys.modules["kasir_pipe"] = pkg
spec = importlib.util.spec_from_file_location("kasir_pipe", f"{root}/__init__.py")
mod = importlib.util.module_from_spec(spec); sys.modules["kasir_pipe"] = mod
spec.loader.exec_module(mod)
phones = sorted(mod._fetch_db_owner_phones())
print("db_owner_phones", phones)
ids = mod._allowed_identities()
print("allowed_identities_count", len(ids))
for p in phones[:5]:
    print("allowed", p, mod._sender_allowed(p))
print("denied_random", mod._sender_allowed("6280000000000"))
'''
        sftp = client.open_sftp()
        with sftp.file(f"{REMOTE}/volumes/hermes/allowlist-smoke.py", "w") as f:
            f.write(allow_smoke)
        sftp.close()
        run(
            "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes "
            "python3 /opt/data/allowlist-smoke.py",
            timeout=60,
        )

        if args.smoke_phone:
            phone = smoke_phone
            smoke = f'''#!/usr/bin/env python3
import importlib.util, sys, types

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

writes = load("writes", "writes.py")
mod = load("", "__init__.py")
writes.bind(
    with_tenant=mod._with_tenant,
    active_products=mod._active_products,
    idr=mod._idr,
)

phone = {phone!r}
print("phone", phone)
print("--- list ---")
print(mod._handle_products({{"phone": phone}}))
print("--- stock before ---")
print(mod._handle_stock({{"phone": phone}}))
print("--- draft sale ---")
draft = writes.handle_draft_sale({{
    "phone": phone,
    "items": [{{"name": "indomie", "quantity": 1, "unit_price": 0}}],
    "payment_method": "tunai",
}})
print(draft)
if "draft_id" in draft.lower() or "kasir_" in draft.lower():
    print("FAIL: draft text leaked internal tokens")
    sys.exit(1)
print("--- confirm sale (latest draft, no draft_id) ---")
print(writes.handle_confirm_sale({{"phone": phone}}))
print("--- stock after ---")
print(mod._handle_stock({{"phone": phone, "product_query": "indomie"}}))
print("--- report ---")
print(mod._handle_report({{"phone": phone, "period": "today"}}))
print("--- top products month ---")
print(mod._handle_top_products({{"phone": phone, "period": "month"}}))
'''
            sftp = client.open_sftp()
            with sftp.file(f"{REMOTE}/volumes/hermes/fase2-write-smoke.py", "w") as f:
                f.write(smoke)
            sftp.close()
            run(
                "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes "
                "python3 /opt/data/fase2-write-smoke.py",
                timeout=120,
            )
        else:
            top_smoke = r'''#!/usr/bin/env python3
import importlib.util, os, sys, types
root = "/opt/data/plugins/kasir-tools"
pkg = types.ModuleType("kasir_tools"); pkg.__path__ = [root]; sys.modules["kasir_tools"] = pkg
spec = importlib.util.spec_from_file_location("kasir_tools", f"{root}/__init__.py")
mod = importlib.util.module_from_spec(spec); sys.modules["kasir_tools"] = mod
spec.loader.exec_module(mod)
phone = (os.environ.get("KASIR_SMOKE_PHONE") or "6287859031592").strip()
print("=== top ===")
print(mod._handle_top_products({"phone": phone, "period": "month"}))
print("=== low stock ===")
print(mod._handle_low_stock({"phone": phone, "threshold": 40}))
print("=== report ===")
print(mod._handle_report({"phone": phone, "period": "month"}))
'''
            sftp = client.open_sftp()
            with sftp.file(f"{REMOTE}/volumes/hermes/top-products-smoke.py", "w") as f:
                f.write(top_smoke)
            sftp.close()
            run(
                "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes "
                "python3 /opt/data/top-products-smoke.py",
                timeout=120,
            )

        run(
            f"bash {REMOTE}/scripts/master-production/prune-nsoft3-images.sh || true",
            timeout=300,
        )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
