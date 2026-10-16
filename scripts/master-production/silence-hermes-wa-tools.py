#!/usr/bin/env python3
"""Silence Hermes tool-progress bubbles on WhatsApp (kasir chat UX).

Hermes defaults to sending mid-turn chrome like ``⚙️ kasir_daily_report...``
into WhatsApp. For kasir that is noise — only the final reply should appear.

  python scripts/master-production/silence-hermes-wa-tools.py
  python scripts/master-production/silence-hermes-wa-tools.py --status

Creds: scripts/master-production/deploy.local.env (gitignored).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)

HERMES_EXEC = "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes"
REMOTE_CONFIG = "/opt/nusantarasoft-3/volumes/hermes/config.yaml"

# Keys hermes config set handles as booleans without coercing mode strings.
BOOL_SETS = [
    ("display.interim_assistant_messages", "false"),
    ("display.show_commentary", "false"),
    ("display.tool_progress_command", "false"),
    ("display.cleanup_progress", "true"),
    ("display.long_running_notifications", "false"),
    ("display.busy_ack_detail", "false"),
    ("display.streaming", "false"),
]

GETS = [
    "display.tool_progress",
    "display.platforms.whatsapp.tool_progress",
    "display.interim_assistant_messages",
    "display.show_commentary",
    "display.tool_progress_command",
    "display.cleanup_progress",
    "display.long_running_notifications",
    "display.busy_ack_detail",
    "display.streaming",
]

DISPLAY_KEYS = {
    "tool_progress": "off",
    "interim_assistant_messages": "false",
    "show_commentary": "false",
    "tool_progress_command": "false",
    "cleanup_progress": "true",
    "long_running_notifications": "false",
    "busy_ack_detail": "false",
    "streaming": "false",
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
    if client.get_transport():
        client.get_transport().set_keepalive(30)
    return client


def make_runner(client: paramiko.SSHClient):
    def run(cmd: str, timeout: int = 120) -> tuple[int, str]:
        print(f"\n>>> {cmd[:240]}", flush=True)
        _, out_s, err_s = client.exec_command(cmd, timeout=timeout)
        out_s.channel.settimeout(timeout)
        out = out_s.read().decode("utf-8", "replace")
        err = err_s.read().decode("utf-8", "replace")
        code = out_s.channel.recv_exit_status()
        if out.strip():
            print(out[-3500:], flush=True)
        if err.strip():
            print("STDERR " + err[-1200:], flush=True)
        print(f"exit={code}", flush=True)
        return code, out

    return run


def status(run) -> None:
    for key in GETS:
        run(f"{HERMES_EXEC} hermes config get {key}")
    run(f"grep -n -A60 '^display:' {REMOTE_CONFIG} | head -80")


def _set_display_key(block: str, key: str, value: str) -> str:
    # Only top-level display keys (exactly two spaces) — never platforms.*.
    pattern = rf"(?m)^  {re.escape(key)}:.*$"
    if re.search(pattern, block):
        return re.sub(pattern, f"  {key}: {value}", block, count=1)
    insert = f"  {key}: {value}\n"
    if re.search(r"(?m)^  platforms:\s*$", block):
        return re.sub(r"(?m)^(  platforms:\s*)$", insert + r"\1", block, count=1)
    return block.rstrip("\n") + "\n" + insert


def patch_display_yaml(client: paramiko.SSHClient) -> None:
    """Surgical edit of display.* — keeps the rest of config.yaml intact."""
    sftp = client.open_sftp()
    with sftp.file(REMOTE_CONFIG, "r") as fh:
        text = fh.read().decode("utf-8")

    match = re.search(r"(?ms)^(display:\n)(.*?)(?=^[a-zA-Z_][\w]*:|\Z)", text)
    if not match:
        raise SystemExit("display: block not found in config.yaml")

    head, body = match.group(1), match.group(2)
    for key, value in DISPLAY_KEYS.items():
        body = _set_display_key(body, key, value)

    # Ensure platforms.whatsapp.tool_progress: off
    if re.search(r"(?m)^  platforms:\s*$", body):
        if re.search(r"(?m)^    whatsapp:\s*$", body):
            if re.search(
                r"(?ms)^    whatsapp:\n(?:      .*\n)*?      tool_progress:\s*",
                body,
            ):
                body = re.sub(
                    r"(?ms)(^    whatsapp:\n(?:      .*\n)*?      tool_progress:\s*)\S*",
                    r"\1off",
                    body,
                    count=1,
                )
            else:
                body = re.sub(
                    r"(?m)^(    whatsapp:\s*)$",
                    r"\1\n      tool_progress: off",
                    body,
                    count=1,
                )
        else:
            body = re.sub(
                r"(?m)^(  platforms:\s*)$",
                r"\1\n    whatsapp:\n      tool_progress: off",
                body,
                count=1,
            )
    else:
        body = (
            body.rstrip("\n")
            + "\n  platforms:\n    whatsapp:\n      tool_progress: off\n"
        )

    if not body.endswith("\n"):
        body += "\n"

    new_text = text[: match.start()] + head + body + text[match.end() :]
    # Guard against accidental glue if a prior bad patch ran.
    new_text = new_text.replace("tool_progress: offstt:", "tool_progress: off\nstt:")
    # Never ship a config that dropped kasir plugins (display-block regex can
    # swallow later sections if a prior edit glued `offstt:` without newline).
    if not re.search(r"(?m)^plugins:\s*$", new_text):
        raise SystemExit(
            "refusing to write config.yaml: plugins: section missing after patch"
        )
    if "kasir-tools" not in new_text or "kasir-pipe" not in new_text:
        raise SystemExit(
            "refusing to write config.yaml: kasir plugins missing from enabled list"
        )
    with sftp.file(REMOTE_CONFIG, "w") as fh:
        fh.write(new_text)
    sftp.close()
    print("patched display.tool_progress=off (+ silence flags)", flush=True)


def apply(client: paramiko.SSHClient, run) -> None:
    for key, value in BOOL_SETS:
        code, _ = run(f"{HERMES_EXEC} hermes config set {key} {value}")
        if code != 0:
            raise SystemExit(f"config set failed: {key}={value}")
    patch_display_yaml(client)
    compose = (
        "cd /opt/nusantarasoft-3 && docker compose "
        "-f docker-compose.master-production.yml "
        "--env-file .env.master-production up -d --force-recreate --no-deps hermes"
    )
    code, _ = run(compose, timeout=180)
    if code != 0:
        raise SystemExit("hermes recreate failed")
    run("sleep 20")
    run("docker ps --filter name=nsoft3-hermes --format '{{.Names}} {{.Status}}'")
    status(run)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--status",
        action="store_true",
        help="Print current display settings only (no changes)",
    )
    args = parser.parse_args()
    env = load_env()
    client = connect(env)
    try:
        run = make_runner(client)
        if args.status:
            status(run)
        else:
            apply(client, run)
            print(
                "\nOK — WhatsApp tool-progress silenced. "
                "Send a kasir Q that needs a tool (no ⚙️ bubbles)."
            )
    finally:
        client.close()


if __name__ == "__main__":
    main()
