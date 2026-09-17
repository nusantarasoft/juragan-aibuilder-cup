#!/usr/bin/env python3
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


def run(cmd: str, timeout: int = 90) -> None:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    print((out[-5000:] if out.strip() else "(empty)"))
    if err.strip():
        print("STDERR", err[-1500:])
    print("exit", o.channel.recv_exit_status(), flush=True)


probe = r'''
import json
from pathlib import Path
p = Path("/opt/data/sessions/sessions.json")
d = json.loads(p.read_text(encoding="utf-8"))
print("type", type(d).__name__)
if isinstance(d, dict):
    print("nkeys", len(d))
    for i, (k, v) in enumerate(d.items()):
        if i >= 8:
            break
        print("KEY", k)
        print("VAL", json.dumps(v, default=str)[:400])
elif isinstance(d, list):
    print("n", len(d))
    print(json.dumps(d[:3], default=str)[:800])
'''
sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/dump-sessions.py", "w") as fh:
    fh.write(probe)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/dump-sessions.py")
run("docker exec nsoft3-hermes sed -n '6660,6760p' /opt/hermes/hermes_cli/plugins.py")
run(
    "docker exec nsoft3-hermes sh -lc "
    "\"grep -n 'pre_tool_call\\|session_id\\|chat_id\\|platform' /opt/hermes/agent/tool_executor.py | head -50\""
)

c.close()
