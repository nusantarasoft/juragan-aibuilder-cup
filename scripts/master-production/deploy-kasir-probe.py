#!/usr/bin/env python3
"""Deploy the Fase 0 kasir probe: Hermes plugins + the KASIR_AGENT_PHONES switch.

Only the hermes container is recreated. No middleware or admin rebuild, because
nothing outside the plugin tree and the hermes service block changes — keeping
the blast radius to the one container we are experimenting on.

Usage:
  python scripts/master-production/deploy-kasir-probe.py --phones 628123456789
  python scripts/master-production/deploy-kasir-probe.py --phones ""    # roll back
  python scripts/master-production/deploy-kasir-probe.py --read-probe   # read findings

Creds come from scripts/master-production/deploy.local.env (gitignored).
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
PROBE_LOG = "/opt/data/logs/kasir-probe.jsonl"
# Hermes reads its home from HERMES_HOME; a bare `docker exec` lands in root's
# HOME and would silently operate on an empty, unrelated config.
HERMES_EXEC = "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes"
# Hermes writes its own logs to the volume, not to container stdout.
AGENT_LOG = "/opt/data/logs/agent.log"

INCLUDE = [
    "docker-compose.master-production.yml",
    ".env.master-production.example",
    "scripts/master-production/hermes-plugins",
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
    transport = client.get_transport()
    if transport:
        transport.set_keepalive(30)
    return client


def make_runner(client: paramiko.SSHClient):
    def run(cmd: str, timeout: int = 900) -> tuple[int, str]:
        print(f"\n>>> {cmd[:220]}", flush=True)
        _, out_s, err_s = client.exec_command(cmd, timeout=timeout)
        out_s.channel.settimeout(timeout)
        out = out_s.read().decode("utf-8", "replace")
        err = err_s.read().decode("utf-8", "replace")
        code = out_s.channel.recv_exit_status()
        if out.strip():
            print(out[-4000:], flush=True)
        if err.strip():
            print("STDERR " + err[-1500:], flush=True)
        print(f"exit={code}", flush=True)
        return code, out

    return run


def ship(client: paramiko.SSHClient, run) -> None:
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as handle:
        tar_path = Path(handle.name)
    print(f"pack {tar_path}", flush=True)
    with tarfile.open(tar_path, "w:gz") as tar:
        for rel in INCLUDE:
            path = ROOT / rel
            if not path.exists():
                print(f"MISSING {rel}", flush=True)
                continue
            # Host bytecode would shadow nothing useful in the container.
            tar.add(
                path,
                arcname=rel,
                filter=lambda info: None if "__pycache__" in info.name else info,
            )

    remote_tar = f"{REMOTE}/.tmp-kasir-probe.tar.gz"
    sftp = client.open_sftp()
    print(f"put {remote_tar}", flush=True)
    sftp.put(str(tar_path), remote_tar)
    sftp.close()
    tar_path.unlink(missing_ok=True)
    run(f"cd {REMOTE} && tar xzf .tmp-kasir-probe.tar.gz && rm -f .tmp-kasir-probe.tar.gz")


def set_phones(run, phones: str) -> None:
    """Upsert KASIR_AGENT_PHONES in the server env file, in place."""
    script = f"""python3 - <<'PY'
from pathlib import Path
p = Path('{REMOTE}/.env.master-production')
lines = p.read_text(encoding='utf-8').splitlines()
want = 'KASIR_AGENT_PHONES={phones}'
for i, line in enumerate(lines):
    if line.split('=', 1)[0].strip() == 'KASIR_AGENT_PHONES':
        if line == want:
            print('unchanged: ' + want)
        else:
            lines[i] = want
            p.write_text('\\n'.join(lines) + '\\n', encoding='utf-8')
            print('updated: ' + want)
        break
else:
    lines.append(want)
    p.write_text('\\n'.join(lines) + '\\n', encoding='utf-8')
    print('added: ' + want)
PY"""
    run(script)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--phones",
        help="Comma-separated senders routed to the Hermes agent. Empty string rolls back.",
    )
    parser.add_argument(
        "--read-probe",
        action="store_true",
        help="Only read the probe findings and recent plugin logs.",
    )
    args = parser.parse_args()

    if args.phones is None and not args.read_probe:
        parser.error("pass --phones (use --phones '' to roll back) or --read-probe")

    client = connect(load_env())
    run = make_runner(client)

    try:
        if args.read_probe:
            code, _ = run(
                f"docker exec nsoft3-hermes sh -lc "
                f"'test -f {PROBE_LOG} && tail -n 20 {PROBE_LOG} || echo NO_PROBE_LOG_YET'"
            )
            run(
                f"docker exec nsoft3-hermes sh -lc "
                f"'grep -i kasir {AGENT_LOG} | tail -n 30' || true"
            )
            return code

        ship(client, run)
        set_phones(run, args.phones)

        run(
            f"mkdir -p {REMOTE}/volumes/hermes/plugins && "
            f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe "
            f"{REMOTE}/scripts/master-production/hermes-plugins/kasir-probe "
            f"{REMOTE}/volumes/hermes/plugins/"
        )
        run(f"ls -la {REMOTE}/volumes/hermes/plugins/kasir-probe")

        # config.yaml carries an explicit plugins.enabled allowlist, so dropping
        # files into the plugins dir is not enough to load them. Validate first:
        # doctor checks the plugin against the real runtime contracts, which is
        # cheaper than finding out from a failed startup.
        run(f"{HERMES_EXEC} hermes plugins doctor kasir-probe 2>&1 | tail -25 || true")
        run(f"{HERMES_EXEC} hermes plugins enable kasir-probe 2>&1 | tail -5 || true")
        run(f"{HERMES_EXEC} hermes plugins list 2>&1 | grep -i kasir || true")

        # --no-deps so the recreate cannot cascade into postgres/middleware.
        code, _ = run(f"{COMPOSE} up -d --force-recreate --no-deps hermes", timeout=900)
        if code != 0:
            return code

        run("sleep 25 && docker exec nsoft3-hermes env | grep KASIR_ || true")
        run(
            f"docker exec nsoft3-hermes sh -lc "
            f"'grep -i kasir {AGENT_LOG} | tail -n 20' || true"
        )
        # Pairing must survive the recreate; a dead session breaks the probe.
        run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
