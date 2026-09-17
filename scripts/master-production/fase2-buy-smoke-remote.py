#!/usr/bin/env python3
"""One-shot: draft+confirm purchase smoke on production Hermes."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

REMOTE = "/opt/nusantarasoft-3"


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


SMOKE = r"""#!/usr/bin/env python3
import importlib.util, re, sys, types
root = "/opt/data/plugins/kasir-tools"
pkg = types.ModuleType("kasir_tools")
pkg.__path__ = [root]
sys.modules["kasir_tools"] = pkg

def load(name, file):
    full = f"kasir_tools.{name}" if name else "kasir_tools"
    spec = importlib.util.spec_from_file_location(full, f"{root}/{file}")
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
phone = "6287859031592"
print("--- stock before ---")
print(mod._handle_stock({"phone": phone, "product_query": "teh"}))
print("--- draft purchase ---")
draft = writes.handle_draft_purchase({
    "phone": phone,
    "items": [{"name": "teh", "quantity": 1, "unit_price": 2500}],
    "supplier_name": "smoke",
})
print(draft)
m = re.search(r"draft_id:\s*`([a-f0-9]+)`", draft)
if not m:
    print("FAIL: no draft_id")
    sys.exit(1)
print("--- confirm purchase ---")
print(writes.handle_confirm_purchase({"phone": phone, "draft_id": m.group(1)}))
print("--- stock after ---")
print(mod._handle_stock({"phone": phone, "product_query": "teh"}))
"""


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
    try:
        sftp = client.open_sftp()
        with sftp.file(f"{REMOTE}/volumes/hermes/fase2-buy-smoke.py", "w") as fh:
            fh.write(SMOKE)
        sftp.close()
        _, out_s, err_s = client.exec_command(
            "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes "
            "python3 /opt/data/fase2-buy-smoke.py",
            timeout=120,
        )
        out = out_s.read().decode("utf-8", "replace")
        err = err_s.read().decode("utf-8", "replace")
        code = out_s.channel.recv_exit_status()
        print(out)
        if err.strip():
            print("STDERR", err[-2000:])
        print(f"exit={code}")
        return code
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
