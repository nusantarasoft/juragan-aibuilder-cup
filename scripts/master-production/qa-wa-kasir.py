#!/usr/bin/env python3
"""QA helper: baseline stock + recent Hermes agent log for kasir tools."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

REMOTE = "/opt/nusantarasoft-3"
PHONE = "6287859031592"


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


BASELINE = r"""#!/usr/bin/env python3
import importlib.util, sys, types
root = "/opt/data/plugins/kasir-tools"
pkg = types.ModuleType("kasir_tools"); pkg.__path__ = [root]; sys.modules["kasir_tools"] = pkg

def load(name, file):
    full = f"kasir_tools.{name}" if name else "kasir_tools"
    spec = importlib.util.spec_from_file_location(full, f"{root}/{file}")
    mod = importlib.util.module_from_spec(spec); sys.modules[full] = mod
    if not name:
        sys.modules["kasir_tools"] = mod; mod.__path__ = [root]
    spec.loader.exec_module(mod); return mod

mod = load("", "__init__.py")
phone = "6287859031592"
print("=== STOCK ===")
print(mod._handle_stock({"phone": phone}))
print("=== PRODUCTS ===")
print(mod._handle_products({"phone": phone}))
print("=== REPORT TODAY ===")
print(mod._handle_report({"phone": phone, "period": "today"}))
"""


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 90) -> tuple[int, str]:
    _, out_s, err_s = client.exec_command(cmd, timeout=timeout)
    out = out_s.read().decode("utf-8", "replace")
    err = err_s.read().decode("utf-8", "replace")
    code = out_s.channel.recv_exit_status()
    return code, out + (("\nSTDERR\n" + err) if err.strip() else "")


def main() -> int:
    mode = (sys.argv[1] if len(sys.argv) > 1 else "baseline").strip()
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
        if mode == "baseline":
            sftp = client.open_sftp()
            with sftp.file(f"{REMOTE}/volumes/hermes/qa-baseline.py", "w") as fh:
                fh.write(BASELINE)
            sftp.close()
            code, out = run(
                client,
                "docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status",
            )
            print("=== PAIR ===")
            print(out.strip())
            code, out = run(
                client,
                "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes python3 /opt/data/qa-baseline.py",
            )
            print(out)
            return code

        if mode == "logs":
            code, out = run(
                client,
                "docker exec nsoft3-hermes sh -lc "
                "'tail -n 120 /opt/data/logs/agent.log | "
                "grep -Ei \"kasir_|tool|error|exception|confirm|draft|628785\" | tail -n 80'",
            )
            print(out or "(no matching log lines)")
            code2, out2 = run(
                client,
                "docker exec nsoft3-hermes sh -lc "
                "'tail -n 40 /opt/data/logs/gateway.log 2>/dev/null || "
                "tail -n 40 /opt/data/logs/*.log 2>/dev/null | tail -n 40'",
            )
            print("=== GATEWAY TAIL ===")
            print(out2[-3000:])
            return code

        if mode == "after":
            sftp = client.open_sftp()
            with sftp.file(f"{REMOTE}/volumes/hermes/qa-baseline.py", "w") as fh:
                fh.write(BASELINE)
            sftp.close()
            code, out = run(
                client,
                "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes python3 /opt/data/qa-baseline.py",
            )
            print(out)
            return code

        print(f"unknown mode {mode}", file=sys.stderr)
        return 2
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
