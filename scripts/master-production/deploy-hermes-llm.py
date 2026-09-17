#!/usr/bin/env python3
"""Point the production Hermes agent at an LLM provider.

Until now production Hermes ran as a WhatsApp socket only: the agent was always
skipped, so no inference provider was ever configured. The moment a number is
added to KASIR_AGENT_PHONES that stops being true, and the agent fails with
"No inference provider configured" instead of answering. This script closes
that gap.

It never handles the API key itself. Put the key in the server's
.env.master-production by hand; this only checks that it is there, tells Hermes
which provider and model to use, and proves end to end that the model will
actually call a tool.

Usage:
  python scripts/master-production/deploy-hermes-llm.py --status
  python scripts/master-production/deploy-hermes-llm.py --list-models
  python scripts/master-production/deploy-hermes-llm.py --apply
  python scripts/master-production/deploy-hermes-llm.py --apply \\
      --provider openrouter --model google/gemini-2.5-flash

Only the hermes container is recreated, so the blast radius stays at the one
service being changed. The WhatsApp session lives in the volume and survives,
meaning no QR re-pairing.

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
# Hermes reads its home from HERMES_HOME; a bare `docker exec` lands in root's
# HOME and would silently operate on an empty, unrelated config.
HERMES_EXEC = "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes"
AGENT_LOG = "/opt/data/logs/agent.log"
SMOKE = "/opt/data/hermes-llm-smoke.py"

INCLUDE = [
    "docker-compose.master-production.yml",
    ".env.master-production.example",
    "scripts/master-production/hermes-llm-smoke.py",
]

# Base URLs Hermes expects per provider. Kept here rather than left to the
# provider default so config.yaml records the endpoint explicitly and a future
# reader does not have to go spelunking in the plugin tree.
BASE_URLS = {
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
    "openrouter": "https://openrouter.ai/api/v1",
}


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
            tar.add(
                path,
                arcname=rel,
                filter=lambda info: None if "__pycache__" in info.name else info,
            )

    remote_tar = f"{REMOTE}/.tmp-hermes-llm.tar.gz"
    sftp = client.open_sftp()
    print(f"put {remote_tar}", flush=True)
    sftp.put(str(tar_path), remote_tar)
    sftp.close()
    tar_path.unlink(missing_ok=True)
    run(f"cd {REMOTE} && tar xzf .tmp-hermes-llm.tar.gz && rm -f .tmp-hermes-llm.tar.gz")
    # The volume is the container's /opt/data, so this is how the smoke test
    # gets somewhere `docker exec python3` can reach it.
    run(
        f"cp {REMOTE}/scripts/master-production/hermes-llm-smoke.py "
        f"{REMOTE}/volumes/hermes/hermes-llm-smoke.py"
    )


# Env vars each provider needs in .env.master-production (checked without echoing).
PROVIDER_KEYS = {
    "openrouter": ("OPENROUTER_API_KEY",),
    "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
}


def check_key(run, provider: str) -> bool:
    """Report whether a usable key sits in the server env file, without echoing it."""
    keys = PROVIDER_KEYS[provider]
    keys_repr = ", ".join(repr(k) for k in keys)
    script = f"""python3 - <<'PY'
from pathlib import Path
p = Path('{REMOTE}/.env.master-production')
wanted = [{keys_repr}]
found = {{}}
for line in p.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, value = line.split('=', 1)
    key = key.strip()
    if key in wanted:
        found[key] = value.strip()
ok = False
for key in wanted:
    value = found.get(key)
    if value is None:
        print(f'{{key}}: absent')
    elif not value or value == 'CHANGE_ME':
        print(f'{{key}}: present but empty/placeholder')
    else:
        print(f'{{key}}: set (length {{len(value)}})')
        ok = True
print('KEY_OK' if ok else 'KEY_MISSING')
PY"""
    _, out = run(script)
    return "KEY_OK" in out


def show_config(run) -> None:
    run(
        f"docker exec nsoft3-hermes sh -lc "
        f"'grep -n -A5 \"^model:\" /opt/data/config.yaml || echo \"(no model section)\"'"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Configure and recreate hermes.")
    parser.add_argument(
        "--status",
        action="store_true",
        help="Report only. Copies the smoke test to the server but leaves the container alone.",
    )
    parser.add_argument(
        "--list-models", action="store_true", help="List models the key can generate with."
    )
    parser.add_argument("--provider", default="openrouter", choices=sorted(BASE_URLS))
    parser.add_argument("--model", default="google/gemini-2.5-flash")
    args = parser.parse_args()

    if not (args.apply or args.status or args.list_models):
        parser.error("pass --status, --list-models, or --apply")

    # Direct Gemini uses bare model ids; OpenRouter needs the google/ prefix.
    if args.provider == "gemini" and args.model.startswith("google/"):
        args.model = args.model.removeprefix("google/")

    client = connect(load_env())
    run = make_runner(client)
    needed = " or ".join(PROVIDER_KEYS[args.provider])

    try:
        if args.status or args.list_models:
            ship(client, run)
            has_key = check_key(run, args.provider)
            show_config(run)
            if not has_key:
                print(f"\nNo usable {needed} on the server yet — add one before --apply.")
                return 1
            flag = "--list" if args.list_models else f"--model {args.model}"
            code, _ = run(
                f"{HERMES_EXEC} python3 {SMOKE} --provider {args.provider} {flag}"
            )
            return code

        ship(client, run)
        if not check_key(run, args.provider):
            print(
                f"\nRefusing to apply: no {needed} in "
                f"{REMOTE}/.env.master-production.\n"
                "Add the key there first — this script deliberately never carries it."
            )
            return 1

        base_url = BASE_URLS[args.provider]
        run(f"{HERMES_EXEC} hermes config set model.provider {args.provider}")
        run(f"{HERMES_EXEC} hermes config set model.default {args.model}")
        run(f"{HERMES_EXEC} hermes config set model.base_url {base_url}")
        show_config(run)

        # --no-deps so the recreate cannot cascade into postgres/middleware.
        code, _ = run(f"{COMPOSE} up -d --force-recreate --no-deps hermes", timeout=900)
        if code != 0:
            return code

        run(
            "sleep 25 && docker exec nsoft3-hermes env | "
            "grep -c -E '^(OPENROUTER|GEMINI|GOOGLE)_API_KEY=.' || true"
        )
        show_config(run)

        # The decisive check: key + model + tool-calling, before anyone burns a
        # WhatsApp round trip finding out one of them is wrong.
        smoke, _ = run(
            f"{HERMES_EXEC} python3 {SMOKE} "
            f"--provider {args.provider} --model {args.model}"
        )

        # Pairing must survive the recreate, otherwise the agent has no mouth.
        run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
        run(f"docker exec nsoft3-hermes sh -lc 'tail -n 15 {AGENT_LOG}' || true")
        return smoke
    finally:
        client.close()


if __name__ == "__main__":
    sys.exit(main())
