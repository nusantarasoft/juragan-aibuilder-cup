#!/usr/bin/env python3
"""Cutover production WhatsApp transport: WAHA → Hermes.

Keeps nsoft3-waha running for rollback. Flips WHATSAPP_PROVIDER=hermes,
recreates middleware, reloads Hermes gateway so the Baileys bridge serves creds.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
p = Path(__file__).resolve().parent / "deploy.local.env"
env: dict[str, str] = {}
for line in p.read_text(encoding="utf-8").splitlines():
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


def run(cmd: str, t: int = 180) -> str:
    print(f"\nCMD {cmd[:200]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=t)
    o.channel.settimeout(t)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    if out.strip():
        print(out.rstrip(), flush=True)
    if err.strip():
        print("ERR", err.rstrip()[:800], flush=True)
    return out


# Preflight: pending rows
run(
    r"""docker exec nsoft3-middleware node -e '
const { createClient } = require("@supabase/supabase-js");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
(async () => {
  const sb = createClient(url, key);
  const sales = await sb.from("studio_umkm_pending_sales").select("id,tenant_id,status").eq("status","pending");
  const buys = await sb.from("studio_umkm_pending_purchases").select("id,tenant_id,status").eq("status","pending");
  console.log(JSON.stringify({ pendingSales: sales.data||[], salesErr: sales.error, pendingPurchases: buys.data||[], buysErr: buys.error }));
})().catch(e => { console.error(String(e)); process.exit(1); });
'
"""
)

# Flip env (idempotent)
run(
    r"""python3 - <<'PY'
from pathlib import Path
p = Path("/opt/nusantarasoft-3/.env.master-production")
text = p.read_text()
if "WHATSAPP_PROVIDER=" in text:
    lines = []
    for line in text.splitlines(True):
        if line.startswith("WHATSAPP_PROVIDER="):
            lines.append("WHATSAPP_PROVIDER=hermes\n")
        else:
            lines.append(line)
    p.write_text("".join(lines))
else:
    p.write_text(text.rstrip() + "\nWHATSAPP_PROVIDER=hermes\n")
print("WHATSAPP_PROVIDER=", [l for l in p.read_text().splitlines() if l.startswith("WHATSAPP_PROVIDER=")][0])
PY"""
)

# Recreate middleware so env injects
run(
    "cd /opt/nusantarasoft-3 && docker compose -f docker-compose.master-production.yml --env-file .env.master-production up -d --force-recreate --no-deps middleware",
    t=180,
)
print("waiting middleware health...", flush=True)
for i in range(24):
    time.sleep(5)
    st = run("docker inspect -f '{{.State.Health.Status}}' nsoft3-middleware")
    if "healthy" in st:
        rec_ok = True
        break
else:
    rec_ok = False
print("middleware healthy" if rec_ok else "middleware NOT healthy yet", flush=True)

run("docker exec nsoft3-middleware printenv WHATSAPP_PROVIDER HERMES_BRIDGE_URL")

# Reload Hermes so gateway + Baileys bridge pick up creds
run(
    "docker exec nsoft3-middleware wget -qO- --timeout=30 --post-data='{}' --header='Content-Type: application/json' http://hermes:8765/pair/reload; echo"
)
time.sleep(18)

run("docker exec nsoft3-middleware wget -qO- --timeout=8 http://hermes:8765/pair/status; echo")
run("docker exec nsoft3-hermes pgrep -af bridge.js || echo NO_BRIDGE")
run(
    "docker exec nsoft3-hermes python3 -c \"import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:3000/health', timeout=4).read().decode())\""
)

# Synthetic inbound should now reply via Hermes, not WAHA session hermes
import hashlib
import hmac

key = run("docker exec nsoft3-hermes printenv WAHA_WEBHOOK_HMAC_KEY").strip().split("\n")[-1]
body = json.dumps(
    {
        "event": "message",
        "session": "hermes",
        "engine": "HERMES",
        "payload": {
            "id": "cutover-probe-1",
            "timestamp": int(time.time()),
            "from": "6280000000099@s.whatsapp.net",
            "fromMe": False,
            "body": "nsoft hermes cutover ping (ignore)",
            "notifyName": "cutover-probe",
            "source": "hermes-kasir-pipe",
        },
        "me": {"id": "hermes-pipe"},
    },
    separators=(",", ":"),
    ensure_ascii=False,
)
digest = hmac.new(key.encode(), body.encode(), hashlib.sha512).hexdigest()
sftp = c.open_sftp()
with sftp.file("/tmp/nsoft-cutover-body.json", "w") as f:
    f.write(body)
sftp.close()
run("docker cp /tmp/nsoft-cutover-body.json nsoft3-middleware:/tmp/nsoft-cutover-body.json")
run(
    "docker exec nsoft3-middleware wget -S -O- --timeout=15 "
    "--header='Content-Type: application/json' "
    f"--header='x-webhook-hmac: {digest}' "
    "--post-file=/tmp/nsoft-cutover-body.json "
    "http://127.0.0.1:4001/api/studio/whatsapp/webhook 2>&1 | tail -20"
)
time.sleep(3)
run(
    "docker logs nsoft3-middleware --since 2m 2>&1 | grep -iE 'HermesProvider|WahaClient|sendText|cutover|6280000000099|provider' | tail -25"
)

c.close()
print("\nDONE", flush=True)
