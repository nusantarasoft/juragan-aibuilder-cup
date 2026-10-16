#!/usr/bin/env python3
"""Probe tool kwargs shape + find session/chat identity sources in Hermes."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parent / "deploy.local.env").read_text(
    encoding="utf-8"
).splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    env["SSH_HOST"],
    username=env.get("SSH_USER", "root"),
    password=env["SSH_PASS"],
    timeout=40,
    allow_agent=False,
    look_for_keys=False,
)


def run(cmd: str, timeout: int = 90) -> str:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    print((out + (("\nSTDERR " + err) if err.strip() else ""))[-5000:])
    print("exit", o.channel.recv_exit_status(), flush=True)
    return out


# Find hermes plugin tool invocation signature
run(
    "docker exec nsoft3-hermes sh -lc "
    "\"find /opt/hermes /usr -name '*.py' 2>/dev/null | xargs grep -l 'pre_tool_call' 2>/dev/null | head -10\""
)
run(
    "docker exec nsoft3-hermes sh -lc "
    "\"grep -RIn --include='*.py' 'def.*pre_tool_call\\|session_id\\|chat_id' /opt/hermes/hermes_cli/plugins*.py /opt/hermes/plugins 2>/dev/null | head -40\""
)
run(
    "docker exec nsoft3-hermes sh -lc "
    "\"ls /opt/data/sessions 2>/dev/null | head; ls /opt/data/conversations 2>/dev/null | head; "
    "find /opt/data -maxdepth 2 -type d 2>/dev/null | head -40\""
)

c.close()
