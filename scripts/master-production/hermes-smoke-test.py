#!/usr/bin/env python3
"""Production smoke: Hermes pair status + outbound send + middleware provider."""
from __future__ import annotations

import json
import sys
import time
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
results = []


def run(cmd: str, t: int = 60) -> str:
    _, o, e = c.exec_command(cmd, timeout=t)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    if err.strip():
        print("ERR", err[:300], flush=True)
    return out


def check(name: str, ok: bool, detail: str) -> None:
    status = "PASS" if ok else "FAIL"
    results.append({"name": name, "status": status, "detail": detail[:240]})
    print(f"{status} {name}: {detail[:240]}", flush=True)


# Stack containers (legacy WhatsApp container name must not appear)
ps = run("docker ps -a --format '{{.Names}} {{.Status}}'")
print(ps, flush=True)
check("no-legacy-wa-container", "nsoft3-waha" not in ps, ps.replace("\n", " | ")[:200])
check("hermes-up", "nsoft3-hermes" in ps and "Up" in ps, "hermes listed")
check("middleware-up", "nsoft3-middleware" in ps, "middleware listed")
check("admin-up", "nsoft3-admin" in ps, "admin listed")

prov = run("docker exec nsoft3-middleware node -e \"console.log(process.env.WHATSAPP_PROVIDER)\"").strip()
check("provider-hermes", prov == "hermes", prov)

pair_raw = run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true").strip()
print("pair", pair_raw, flush=True)
try:
    pair = json.loads(pair_raw)
except Exception:
    pair = {}
check("pair-working", pair.get("status") == "WORKING" and pair.get("connected") is True, pair_raw[:200])
me = str(pair.get("meId") or "")
check("meId-present", me.startswith("62811924689"), me)

# Outbound via Hermes bridge (to paired business jid — transport smoke)
send_out = run(
    r"""docker exec nsoft3-middleware node -e '
const body={chatId:"62811924689@s.whatsapp.net",message:"[nsoft-smoke] Hermes transport "+Date.now()};
fetch("http://hermes:8765/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
  .then(async r=>{const t=await r.text(); console.log(JSON.stringify({status:r.status, body:t.slice(0,200)}));})
  .catch(e=>{console.error(String(e)); process.exit(1);});
' """
).strip()
print("send", send_out, flush=True)
try:
    send = json.loads(send_out)
except Exception:
    send = {}
check("outbound-send", send.get("status") == 200, send_out[:200])

# Middleware can reach pair through network
mw_pair = run(
    r"""docker exec nsoft3-middleware node -e 'fetch("http://hermes:8765/pair/status").then(r=>r.text()).then(console.log).catch(e=>{console.error(e);process.exit(1);})' """
).strip()
check("middleware-reach-hermes", "WORKING" in mw_pair, mw_pair[:160])

failed = [r for r in results if r["status"] == "FAIL"]
print(json.dumps({"failed": len(failed), "results": results}, indent=2), flush=True)
c.close()
sys.exit(1 if failed else 0)
