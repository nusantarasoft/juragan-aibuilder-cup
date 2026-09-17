#!/usr/bin/env python3
"""Clean leftover middleware kasir bot surface; keep admin pair/QR only.

- Rebuild middleware without StudioKasirController
- Update kasir-pipe: no webhook forward (agent-only inbound)
- Recreate hermes + middleware; verify /pair/status

Usage:
  python scripts/master-production/deploy-middleware-pair-only.py
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

INCLUDE = [
    "docker-compose.master-production.yml",
    ".env.master-production.example",
    "middleware/src/main.ts",
    "middleware/src/studio/studio.module.ts",
    "scripts/master-production/hermes-plugins/kasir-pipe",
    "scripts/master-production/hermes-plugins/kasir-tools",
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
        print(f"\n>>> {cmd[:240]}", flush=True)
        _, o, e = client.exec_command(cmd, timeout=timeout)
        o.channel.settimeout(timeout)
        out = o.read().decode("utf-8", "replace")
        err = e.read().decode("utf-8", "replace")
        code = o.channel.recv_exit_status()
        if out.strip():
            print(out[-4500:], flush=True)
        if err.strip():
            print("STDERR " + err[-1500:], flush=True)
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
    # Explicitly delete removed controller on server after unpack
    sftp = client.open_sftp()
    sftp.put(str(tar_path), f"{REMOTE}/.tmp-pair-only.tar.gz")
    sftp.close()
    tar_path.unlink(missing_ok=True)

    run(f"cd {REMOTE} && tar xzf .tmp-pair-only.tar.gz && rm -f .tmp-pair-only.tar.gz")
    run(
        f"rm -f {REMOTE}/middleware/src/studio/studio-kasir.controller.ts "
        f"{REMOTE}/middleware/src/studio/studio-kasir.controller.spec.ts"
    )
    run(
        f"mkdir -p {REMOTE}/volumes/hermes/plugins && "
        f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe "
        f"{REMOTE}/scripts/master-production/hermes-plugins/kasir-tools "
        f"{REMOTE}/volumes/hermes/plugins/"
    )

    code, _ = run(
        f"{COMPOSE} build middleware && "
        f"{COMPOSE} up -d --force-recreate --no-deps middleware hermes",
        timeout=2400,
    )
    if code != 0:
        client.close()
        return code

    run("sleep 25")
    run("docker restart nsoft3-nginx >/dev/null || true")
    run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
    run(
        "docker exec nsoft3-hermes sh -lc "
        "'grep -iE \"kasir-pipe registered|middleware pipe|kasir-tools registered\" "
        "/opt/data/logs/agent.log | tail -n 15' || true"
    )
    # Confirm kasir tools route is gone (404) while webhook may still 404/405 on GET
    run(
        "docker exec nsoft3-middleware sh -lc "
        "'wget -q -O - --method=POST http://127.0.0.1:4001/api/studio/kasir/tools 2>&1 "
        "| head -c 200 || true'"
    )
    client.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
