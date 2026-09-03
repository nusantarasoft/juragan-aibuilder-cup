#!/usr/bin/env python3
"""Deploy kasir-pipe Content-Length fix and restart Hermes."""
from __future__ import annotations
import sys
import time
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
ROOT = Path(__file__).resolve().parents[2]
p = Path(__file__).resolve().parent / "deploy.local.env"
env = {}
for line in p.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

LOCAL = ROOT / "scripts/master-production/hermes-plugins/kasir-pipe/__init__.py"
REMOTE = "/opt/nusantarasoft-3/volumes/hermes/plugins/kasir-pipe/__init__.py"

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["SSH_HOST"], username=env.get("SSH_USER", "root"), password=env["SSH_PASS"], timeout=40, allow_agent=False, look_for_keys=False)
tr = c.get_transport()
if tr:
    tr.set_keepalive(30)

sftp = c.open_sftp()
sftp.put(str(LOCAL), REMOTE)
sftp.close()
print("uploaded __init__.py", flush=True)

_, o, e = c.exec_command("docker restart nsoft3-hermes", timeout=120)
print(o.read().decode(), flush=True)
time.sleep(15)

for i in range(18):
    _, o, _ = c.exec_command(
        "docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true",
        timeout=30,
    )
    out = o.read().decode()
    print(f"[{i}] {out.strip()[:180]}", flush=True)
    if '"status": "WORKING"' in out:
        break
    time.sleep(5)

_, o, e = c.exec_command(
    r"""docker exec nsoft3-middleware node -e "fetch('http://hermes:8765/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chatId:'62811924689@s.whatsapp.net',message:'[smoke] after CL fix '+Date.now()})}).then(async r=>console.log(JSON.stringify({status:r.status,body:(await r.text()).slice(0,180)}))).catch(e=>console.error('FAIL',e.cause||e))" """,
    timeout=60,
)
print("SEND", o.read().decode(), flush=True)
print("ERR", e.read().decode()[:500], flush=True)
c.close()
print("DONE", flush=True)
