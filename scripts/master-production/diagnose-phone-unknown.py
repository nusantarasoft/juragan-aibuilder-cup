#!/usr/bin/env python3
"""Diagnose why kasir-tools says nomor tidak dikenali after isolation fix."""
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
    print(f"\n>>> {cmd[:260]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-6000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return out


run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -iE \"tidak dikenali|kasir-tools tenant|session_start|pre_tool|nomor|resolve\" "
    "/opt/data/logs/agent.log | tail -n 50'"
)

# Dump recent tool call context shape if logged
run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -iE \"kasir_get_stock|tool_call|session_id|user_id|@lid\" /opt/data/logs/agent.log "
    "| tail -n 60'"
)

# Inspect how tools receive kwargs — look at hermes plugin tool wrapper if any
run(
    "docker exec nsoft3-hermes sh -lc "
    "'ls /opt/data/plugins/kasir-tools/; "
    "python3 -c \"import inspect,sys; sys.path.insert(0,\"/opt/data/plugins\"); "
    "print(\"ok\")\"'"
)

c.close()
