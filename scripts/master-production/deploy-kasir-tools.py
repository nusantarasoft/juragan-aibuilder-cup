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

        # Eager kasir tools — no deferred catalog / ⚙️ tool_search bubbles.
        run(
            f"{HERMES_EXEC} hermes config set tools.tool_search.enabled off || true"
        )

        # Ensure plugins.enabled survives display silence patches.
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

        # Kasir chat UX: never leak ⚙️ tool_progress / interim chrome to WhatsApp.
        for key, value in (
            ("display.interim_assistant_messages", "false"),
            ("display.show_commentary", "false"),
            ("display.tool_progress_command", "false"),
            ("display.cleanup_progress", "true"),
            ("display.long_running_notifications", "false"),
            ("display.busy_ack_detail", "false"),
            ("display.streaming", "false"),
        ):
            run(f"{HERMES_EXEC} hermes config set {key} {value} || true")
        # Write documented string mode with exact display-level indent (do not
        # touch platforms.whatsapp.tool_progress via a loose \\s* match).
        run(
            "python3 - <<'PY'\n"
            "from pathlib import Path\n"
            "import re\n"
            "p = Path('/opt/nusantarasoft-3/volumes/hermes/config.yaml')\n"
            "t = p.read_text(encoding='utf-8')\n"
            "m = re.search(r'(?ms)^(display:\\n)(.*?)(?=^[a-zA-Z_][\\\\w]*:|\\\\Z)', t)\n"
            "if not m:\n"
            "    raise SystemExit('no display block')\n"
            "head, body = m.group(1), m.group(2)\n"
            "def set_top(block, key, value):\n"
            "    pat = rf'(?m)^  {re.escape(key)}:.*$'\n"
            "    if re.search(pat, block):\n"
            "        return re.sub(pat, f'  {key}: {value}', block, count=1)\n"
            "    return block.rstrip('\\\\n') + f'\\\\n  {key}: {value}\\\\n'\n"
            "body = set_top(body, 'tool_progress', 'off')\n"
            "body = set_top(body, 'interim_assistant_messages', 'false')\n"
            "body = set_top(body, 'streaming', 'false')\n"
            "if re.search(r'(?m)^  platforms:\\\\s*$', body):\n"
            "    if re.search(r'(?m)^    whatsapp:\\\\s*$', body):\n"
            "        if re.search(r'(?ms)^    whatsapp:\\\\n(?:      .*\\\\n)*?      tool_progress:', body):\n"
            "            body = re.sub(r'(?ms)(^    whatsapp:\\\\n(?:      .*\\\\n)*?      tool_progress:\\\\s*)\\\\S*', r'\\\\1off', body, count=1)\n"
            "        else:\n"
            "            body = re.sub(r'(?m)^(    whatsapp:\\\\s*)$', r'\\\\1\\\\n      tool_progress: off', body, count=1)\n"
            "    else:\n"
            "        body = re.sub(r'(?m)^(  platforms:\\\\s*)$', r'\\\\1\\\\n    whatsapp:\\\\n      tool_progress: off', body, count=1)\n"
            "else:\n"
            "    body += '  platforms:\\\\n    whatsapp:\\\\n      tool_progress: off\\\\n'\n"
            "if not body.endswith('\\\\n'):\n"
            "    body += '\\\\n'\n"
            "t2 = t[:m.start()] + head + body + t[m.end():]\n"
            "t2 = t2.replace('tool_progress: offstt:', 'tool_progress: off\\\\nstt:')\n"
            "if not re.search(r'(?m)^plugins:\\\\s*$', t2) or 'kasir-tools' not in t2:\n"
            "    raise SystemExit('silence patch would drop plugins — abort')\n"
            "p.write_text(t2, encoding='utf-8')\n"
            "print('silenced tool_progress=off')\n"
            "PY"
        )

        # Re-assert plugins.enabled after silence (belt + suspenders).
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
            "print('plugins.enabled ok')\n"
            "PY"
        )

        # Recreate so SUPABASE_* env from compose is injected (+ display silence).
        code, _ = run(f"{COMPOSE} up -d --force-recreate --no-deps hermes", timeout=900)
        if code != 0:
            return code
        run("sleep 25")
        run(
            "docker exec nsoft3-hermes sh -lc "
            "'echo SUPABASE_URL=$SUPABASE_URL; "
            "echo SERVICE_KEY_LEN=${#SUPABASE_SERVICE_KEY}'"
        )
        # G2: refuse open gateway (*) without kasir-pipe/tools enabled.
        code, _ = run(
            "HERMES_HOME=/opt/nusantarasoft-3/volumes/hermes "
            "python3 /opt/nusantarasoft-3/scripts/master-production/hermes-kasir-health.py"
        )
        if code != 0:
            print(
                "FAIL G2: kasir plugins missing/disabled — "
                "WHATSAPP_ALLOWED_USERS=* would be ungated",
                flush=True,
            )
            return code
        run(
            f"docker exec nsoft3-hermes sh -lc "
            f"'grep -Ei \"kasir-pipe: allowlist|kasir-tools registered\" {AGENT_LOG} | tail -n 15' || true"
        )
        run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")

        # Allowlist unit smoke inside hermes (DB + LID expand).
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
            phone = "".join(ch for ch in args.smoke_phone if ch.isdigit())
            smoke = f'''#!/usr/bin/env python3
import importlib.util, re, sys, types

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
m = re.search(r"draft_id:\\s*`([a-f0-9]+)`", draft)
if not m:
    print("FAIL: no draft_id")
    sys.exit(1)
draft_id = m.group(1)
print("--- confirm sale ---")
print(writes.handle_confirm_sale({{"phone": phone, "draft_id": draft_id}}))
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
                timeout=180,
            )
        else:
            # Lightweight read smoke: top products for known pilot phone if present.
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
                "docker exec nsoft3-hermes curl -sS --max-time 5 "
                "http://127.0.0.1:8765/pair/status || true"
            )
            run(
                f"{HERMES_EXEC} hermes config get tools.tool_search.enabled || true"
            )
            run(
                "head -n 20 /opt/nusantarasoft-3/volumes/hermes/SOUL.md || true"
            )
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
