#!/usr/bin/env python3
"""Deep-diagnose registration busy after schema reload."""
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


def run(cmd: str, timeout: int = 120) -> str:
    print(f"\n>>> {cmd[:260]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-6000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return out


# Fresh errors with traceback
run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -n \"fetch registration failed\" /opt/data/logs/agent.log | tail -n 5; "
    "echo ====; "
    "tail -n 120 /opt/data/logs/agent.log | grep -A8 -E \"fetch registration failed|allowlist deny\"'"
)

# Full traceback dump
run(
    "docker exec nsoft3-hermes sh -lc "
    "\"python3 - <<'PY'\\n"
    "from pathlib import Path\\n"
    "t=Path('/opt/data/logs/agent.log').read_text(encoding='utf-8', errors='replace')\\n"
    "idx=t.rfind('fetch registration failed')\\n"
    "print(t[max(0,idx-200):idx+2500] if idx>=0 else 'NO FAIL')\\n"
    "PY\""
)

# Exact open-registration query as pipe
probe2 = r'''
import json, os, urllib.error, urllib.parse, urllib.request, traceback
from pathlib import Path

base = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
key = (os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()

def rest(method, path, query=None):
    url = f"{base}/rest/v1/{path}"
    if query:
        url += "?" + urllib.parse.urlencode(query)
    print("URL", url)
    req = urllib.request.Request(url, method=method, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            print("OK", resp.status, raw[:500])
            return json.loads(raw) if raw else None
    except Exception as e:
        if isinstance(e, urllib.error.HTTPError):
            print("HTTP", e.code, e.read().decode("utf-8", "replace")[:800])
        else:
            print("EXC", type(e).__name__, e)
            traceback.print_exc()
        raise

# LID map check
lid = "184860442402958"
session = Path("/opt/data/whatsapp/session")
print("SESSION_DIR", session, "exists", session.is_dir())
if session.is_dir():
    hits = []
    for name in os.listdir(session):
        if not (name.startswith("lid-mapping-") and name.endswith(".json")):
            continue
        phone = "".join(ch for ch in name[len("lid-mapping-"):-len(".json")] if ch.isdigit())
        try:
            mapped = Path(session, name).read_text(encoding="utf-8")
            mapped_lid = "".join(ch for ch in mapped if ch.isdigit())
        except Exception:
            continue
        if mapped_lid == lid or lid in mapped:
            hits.append((name, phone, mapped[:80]))
    print("LID_HITS", hits[:5], "count", len(hits))

# Try fetch like pipe with LID digits as phone (worst case)
for phone in [lid, "6280000000888"]:
    print("--- phone", phone)
    try:
        rest("GET", "studio_umkm_registrations", {
            "select": "*",
            "phone": f"eq.{phone}",
            "status": "in.(draft,pending)",
            "order": "created_at.desc",
            "limit": "1",
        })
    except Exception:
        pass

# Import pipe helpers if possible
import importlib.util
spec = importlib.util.spec_from_file_location("kasir_pipe", "/opt/data/plugins/kasir-pipe/__init__.py")
mod = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(mod)
    print("pipe loaded")
    # fake event
    class E:
        text = "DAFTAR"
        chat_id = "184860442402958@lid"
        sender_id = "184860442402958@lid"
        internal = False
        platform = "whatsapp"
    try:
        phone = mod._resolve_sender_phone(E())
        print("resolved_phone", phone)
        row = mod._fetch_open_registration(phone)
        print("row", row)
    except Exception:
        traceback.print_exc()
except Exception:
    traceback.print_exc()
'''

sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-rest-probe2.py", "w") as fh:
    fh.write(probe2)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/umkm-rest-probe2.py")

# Confirm rest still sees table
run("docker exec nsoft3-hermes python3 /opt/data/umkm-rest-probe.py")

c.close()
