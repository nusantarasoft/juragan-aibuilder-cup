#!/usr/bin/env python3
"""Debug Hermes outbound /send from host container network."""
from __future__ import annotations
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
p = Path(__file__).resolve().parent / "deploy.local.env"
env = {}
for line in p.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["SSH_HOST"], username=env.get("SSH_USER", "root"), password=env["SSH_PASS"], timeout=40, allow_agent=False, look_for_keys=False)
tr = c.get_transport()
if tr:
    tr.set_keepalive(30)


def run(cmd: str, t: int = 90) -> str:
    print(f"\n>>> {cmd[:200]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=t)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    print(out[:2000] or "(empty)", flush=True)
    if err.strip():
        print("ERR", err[:800], flush=True)
    return out


run("docker exec nsoft3-hermes curl -sS -m 20 -X POST http://127.0.0.1:8765/send -H 'Content-Type: application/json' -d '{\"chatId\":\"62811924689@s.whatsapp.net\",\"message\":\"[smoke] local\"}' || true")
run("docker exec nsoft3-middleware node -e \"fetch('http://hermes:8765/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:'62811924689@s.whatsapp.net',message:'[smoke] mw'})}).then(async r=>console.log(r.status, await r.text())).catch(e=>console.error('FAIL',e.cause||e))\"")
run("docker exec nsoft3-middleware getent hosts hermes || true")
run("docker logs nsoft3-hermes --since 5m 2>&1 | tail -40")
c.close()
