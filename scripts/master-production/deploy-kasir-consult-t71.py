#!/usr/bin/env python3
"""T7.1 deploy: pull master-production, rebuild middleware, deploy kasir tools.

Keeps KASIR_CONSULT=0. Does not set KEY/NOTEBOOK (T7.3).
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

spec = importlib.util.spec_from_file_location(
    "dkt", ROOT / "scripts/master-production/deploy-kasir-tools.py"
)
dkt = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(dkt)

REMOTE = dkt.REMOTE
COMPOSE = dkt.COMPOSE


def main() -> int:
    env = dkt.load_env()
    client = dkt.connect(env)
    run = dkt.make_runner(client)

    print("=== T7.1a git pull ===", flush=True)
    code, _ = run(
        f"cd {REMOTE} && bash scripts/master-production/pull-on-server.sh",
        timeout=300,
    )
    if code != 0:
        print("pull script failed; fallback fetch/reset", flush=True)
        code, _ = run(
            f"cd {REMOTE} && git fetch origin master-production && "
            f"git checkout -f -B master-production origin/master-production",
            timeout=180,
        )
    if code != 0:
        return code

    print("=== T7.1b force KASIR_CONSULT=0 (add if missing) ===", flush=True)
    # Write a small remote helper to avoid quoting hell
    helper = r'''
from pathlib import Path
p = Path(".env.master-production")
text = p.read_text(encoding="utf-8") if p.exists() else ""
lines = text.splitlines()
keys_seen = set()
out = []
for line in lines:
    if not line.strip() or line.strip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    k = line.split("=", 1)[0].strip()
    keys_seen.add(k)
    if k == "KASIR_CONSULT":
        out.append("KASIR_CONSULT=0")
        print("set KASIR_CONSULT=0")
    else:
        out.append(line)
if "KASIR_CONSULT" not in keys_seen:
    out.append("KASIR_CONSULT=0")
    print("added KASIR_CONSULT=0")
p.write_text("\n".join(out) + "\n", encoding="utf-8")
print("env ok")
'''
    sftp = client.open_sftp()
    with sftp.file(f"{REMOTE}/.tmp-set-consult-off.py", "w") as f:
        f.write(helper)
    sftp.close()
    run(f"cd {REMOTE} && python3 .tmp-set-consult-off.py && rm -f .tmp-set-consult-off.py")

    print("=== T7.1c build+recreate middleware ===", flush=True)
    code, _ = run(f"{COMPOSE} build middleware", timeout=1800)
    if code != 0:
        return code
    code, _ = run(
        f"{COMPOSE} up -d --force-recreate --no-deps middleware",
        timeout=600,
    )
    if code != 0:
        return code
    run("sleep 25")
    run(
        "docker exec nsoft3-middleware node -e "
        "\"console.log('PORT',process.env.PORT,'KASIR_CONSULT',process.env.KASIR_CONSULT)\""
    )

    print("=== T7.1d route check (expect 401 without key) ===", flush=True)
    run(
        "docker exec nsoft3-middleware node -e "
        "\"fetch('http://127.0.0.1:4001/internal/kasir-consult',{"
        "method:'POST',headers:{'Content-Type':'application/json'},"
        "body:JSON.stringify({question:'x'})})"
        ".then(r=>console.log('status',r.status))"
        ".catch(e=>{console.error(String(e));process.exit(1);})\""
    )

    client.close()

    print("=== T7.1e deploy-kasir-tools ===", flush=True)
    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts/master-production/deploy-kasir-tools.py")],
        cwd=str(ROOT),
    )
    return r.returncode


if __name__ == "__main__":
    raise SystemExit(main())
