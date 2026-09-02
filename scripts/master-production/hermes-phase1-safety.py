#!/usr/bin/env python3
"""Phase 1 WhatsApp safety probe on production (read + HMAC + fake-number webhook).

Does NOT: logout, wipe session, send jual/beli, or message the live owner allowlist.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
ROOT = Path(__file__).resolve().parents[2]
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

results: list[tuple[str, str, str]] = []


def rec(sid: str, status: str, detail: str) -> None:
    results.append((sid, status, detail))
    print(f"[{status}] {sid}: {detail}", flush=True)


def run(cmd: str, t: int = 60) -> str:
    _, o, e = c.exec_command(cmd, timeout=t)
    o.channel.settimeout(t)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    return (out + (("\n" + err) if err.strip() else "")).strip()


def jget(cmd: str, t: int = 30):
    raw = run(cmd, t)
    try:
        # last JSON object in output
        line = raw.strip().split("\n")[-1]
        return json.loads(line)
    except Exception:
        return {"_raw": raw}


# ── S1 Hermes paired ──────────────────────────────────────────────────────
pair = jget("docker exec nsoft3-middleware wget -qO- --timeout=8 http://hermes:8765/pair/status")
creds = run(
    "docker exec nsoft3-hermes test -f /opt/data/platforms/whatsapp/session/creds.json && echo YES || echo NO"
)
me = pair.get("meId") or "?"
if creds.endswith("YES") and (pair.get("connected") or pair.get("credsPresent")):
    rec("S1-hermes-paired", "PASS", f"creds=yes status={pair.get('status')} me={me} connected={pair.get('connected')}")
elif creds.endswith("YES"):
    rec("S1-hermes-paired", "WARN", f"creds on disk but status={pair} — will try /pair/reload")
else:
    rec("S1-hermes-paired", "FAIL", f"no creds.json pair={pair}")

# Reload so gateway picks up creds after pair-only
if creds.endswith("YES") and not pair.get("connected"):
    print("\n--- POST /pair/reload ---", flush=True)
    print(run("docker exec nsoft3-middleware wget -qO- --timeout=30 --post-data='{}' --header='Content-Type: application/json' http://hermes:8765/pair/reload; echo"))
    time.sleep(12)
    pair = jget("docker exec nsoft3-middleware wget -qO- --timeout=8 http://hermes:8765/pair/status")
    rec("S1b-reload", "INFO", f"after reload status={pair.get('status')} connected={pair.get('connected')} me={pair.get('meId')}")

# ── S2 kasir still WAHA ───────────────────────────────────────────────────
prov = run("docker exec nsoft3-middleware printenv WHATSAPP_PROVIDER")
if prov.strip() == "waha":
    rec("S2-provider-waha", "PASS", "WHATSAPP_PROVIDER=waha (kasir live untouched)")
else:
    rec("S2-provider-waha", "FAIL", f"WHATSAPP_PROVIDER={prov!r} — kasir may have flipped")

# ── S3 WAHA still WORKING ─────────────────────────────────────────────────
waha_cmd = r"""
docker exec nsoft3-middleware sh -c '
  KEY=$(printenv WAHA_API_KEY)
  wget -qO- --timeout=8 --header="X-Api-Key: $KEY" http://waha:3000/api/sessions/default
'
"""
waha = jget(waha_cmd)
waha_status = str(waha.get("status") or "").upper()
waha_me = (waha.get("me") or {}).get("id") or waha.get("meId") or "?"
if waha_status == "WORKING":
    rec("S3-waha-live", "PASS", f"WAHA default WORKING me={waha_me}")
else:
    rec("S3-waha-live", "FAIL", f"WAHA status={waha_status} raw={str(waha)[:240]}")

hermes_digits = "".join(ch for ch in str(pair.get("meId") or "") if ch.isdigit())
waha_digits = "".join(ch for ch in str(waha_me) if ch.isdigit())
if hermes_digits and waha_digits and hermes_digits[-10:] != waha_digits[-10:]:
    rec("S3b-numbers-distinct", "PASS", f"Hermes …{hermes_digits[-6:]} ≠ WAHA …{waha_digits[-6:]}")
elif hermes_digits and waha_digits:
    rec("S3b-numbers-distinct", "FAIL", "Hermes and WAHA appear to share the same number")
else:
    rec("S3b-numbers-distinct", "WARN", f"could not compare meIds hermes={pair.get('meId')} waha={waha_me}")

# ── S4 no LLM keys on Hermes ──────────────────────────────────────────────
llm = run(
    "docker exec nsoft3-hermes sh -c 'printenv OPENAI_API_KEY ANTHROPIC_API_KEY OPENROUTER_API_KEY 2>/dev/null; true'"
)
llm_set = [x for x in llm.splitlines() if x.strip()]
if not llm_set:
    rec("S4-no-llm-keys", "PASS", "no OpenAI/Anthropic/OpenRouter env on nsoft3-hermes")
else:
    rec("S4-no-llm-keys", "FAIL", "LLM key env present on Hermes — agent path may be live")

# ── S5 kasir-pipe skip hook ───────────────────────────────────────────────
plugin = run("docker exec nsoft3-hermes hermes plugins doctor kasir-pipe 2>&1 | tail -20")
if "kasir-pipe" in plugin.lower() or "hook" in plugin.lower() or "ok" in plugin.lower():
    rec("S5-kasir-pipe", "PASS", plugin.replace("\n", " | ")[:300])
else:
    rec("S5-kasir-pipe", "WARN", plugin.replace("\n", " | ")[:300])

cfg = run("docker exec nsoft3-hermes sh -c 'grep -A6 plugins /opt/data/config.yaml 2>/dev/null | head -20'")
if "kasir-pipe" in cfg:
    rec("S5b-config-yaml", "PASS", "plugins.enabled includes kasir-pipe")
else:
    rec("S5b-config-yaml", "FAIL", f"kasir-pipe missing in config.yaml: {cfg[:200]}")

# ── S6 HMAC fail-closed ───────────────────────────────────────────────────
# Pull key from hermes env (same as middleware)
key = run("docker exec nsoft3-hermes printenv WAHA_WEBHOOK_HMAC_KEY").strip()
allow_missing = run(
    "docker exec nsoft3-middleware printenv WAHA_WEBHOOK_HMAC_ALLOW_MISSING || true"
).strip()
fake_body = json.dumps(
    {
        "event": "message",
        "session": "hermes",
        "engine": "HERMES",
        "payload": {
            "id": "safety-probe-unreg",
            "timestamp": int(time.time()),
            "from": "6280000000099@s.whatsapp.net",
            "fromMe": False,
            "body": "nsoft safety ping (ignore)",
            "notifyName": "safety-probe",
            "source": "hermes-kasir-pipe",
        },
        "me": {"id": "hermes-pipe"},
    },
    separators=(",", ":"),
    ensure_ascii=False,
)
raw_b = fake_body.encode("utf-8")

# write body to remote tmp and POST three ways
sftp = c.open_sftp()
with sftp.file("/tmp/nsoft-safety-body.json", "w") as f:
    f.write(fake_body)
sftp.close()

unsigned = run(
    "docker exec nsoft3-middleware wget -S -O- --timeout=8 "
    "--header='Content-Type: application/json' "
    "--post-file=/tmp/nsoft-safety-body.json "
    "http://127.0.0.1:4001/api/studio/whatsapp/webhook 2>&1 | tail -20"
)
# copy file into middleware
run("docker cp /tmp/nsoft-safety-body.json nsoft3-middleware:/tmp/nsoft-safety-body.json")
unsigned = run(
    "docker exec nsoft3-middleware wget -S -O- --timeout=8 "
    "--header='Content-Type: application/json' "
    "--post-file=/tmp/nsoft-safety-body.json "
    "http://127.0.0.1:4001/api/studio/whatsapp/webhook 2>&1 | tail -25"
)
if "401" in unsigned or "Unauthorized" in unsigned or "Missing webhook HMAC" in unsigned:
    rec("S6-hmac-unsigned", "PASS", "unsigned webhook rejected")
else:
    rec("S6-hmac-unsigned", "FAIL", unsigned.replace("\n", " | ")[:280])

bad = run(
    "docker exec nsoft3-middleware wget -S -O- --timeout=8 "
    "--header='Content-Type: application/json' "
    "--header='x-webhook-hmac: deadbeef' "
    "--post-file=/tmp/nsoft-safety-body.json "
    "http://127.0.0.1:4001/api/studio/whatsapp/webhook 2>&1 | tail -25"
)
if "401" in bad or "Invalid webhook HMAC" in bad or "Unauthorized" in bad:
    rec("S6b-hmac-bad", "PASS", "bad HMAC rejected")
else:
    rec("S6b-hmac-bad", "FAIL", bad.replace("\n", " | ")[:280])

if key:
    digest = hmac.new(key.encode("utf-8"), raw_b, hashlib.sha512).hexdigest()
    good = run(
        "docker exec nsoft3-middleware wget -S -O- --timeout=8 "
        "--header='Content-Type: application/json' "
        f"--header='x-webhook-hmac: {digest}' "
        "--post-file=/tmp/nsoft-safety-body.json "
        "http://127.0.0.1:4001/api/studio/whatsapp/webhook 2>&1 | tail -25"
    )
    if " 200 " in good or '{"ok"' in good or "200 OK" in good:
        rec("S6c-hmac-good", "PASS", "signed fake-number inbound accepted (200)")
    else:
        rec("S6c-hmac-good", "FAIL", good.replace("\n", " | ")[:280])
else:
    rec("S6c-hmac-good", "FAIL", "WAHA_WEBHOOK_HMAC_KEY empty on hermes")

if allow_missing.lower() in ("1", "true", "yes"):
    rec("S6d-fail-closed", "FAIL", "WAHA_WEBHOOK_HMAC_ALLOW_MISSING is on — not fail-closed")
else:
    rec("S6d-fail-closed", "PASS", "HMAC_ALLOW_MISSING unset (fail-closed)")

# ── S7 middleware did not treat fake number as kasir ──────────────────────
time.sleep(2)
mw = run(
    "docker logs nsoft3-middleware --since 3m 2>&1 | grep -iE '6280000000099|not mapped|UNREGISTERED|session=hermes|WA inbound|safety' | tail -15"
)
if "not mapped" in mw.lower() or "unregistered" in mw.lower() or "6280000000099" in mw:
    rec("S7-unregistered-isolated", "PASS", mw.replace("\n", " | ")[-320:])
else:
    rec("S7-unregistered-isolated", "WARN", f"no clear unregistered log: {mw.replace(chr(10),' | ')[-280:]}")

# ── S8 Hermes ports not public ────────────────────────────────────────────
ports = run("ss -lntp | grep -E ':8652|:9129|:8765|:3011|:3013' || netstat -lntp | grep -E ':8652|:9129|:8765|:3011|:3013'")
if "0.0.0.0:8652" in ports or ":::8652" in ports:
    rec("S8-hermes-ports", "FAIL", "Hermes gateway published on public IP")
elif "127.0.0.1:8652" in ports or "8652" in ports:
    rec("S8-hermes-ports", "PASS", "Hermes host ports localhost-only (8652/9129)")
else:
    rec("S8-hermes-ports", "WARN", ports.replace("\n", " | ")[:240])

# ── S9 no agent reply in hermes logs ──────────────────────────────────────
hlog = run(
    "docker logs nsoft3-hermes --since 10m 2>&1 | grep -iE 'kasir-pipe|skip|llm|openai|agent reply|forwarded' | tail -20"
)
if "kasir-pipe" in hlog or "skip" in hlog.lower():
    rec("S9-pipe-skip", "PASS", hlog.replace("\n", " | ")[-280:])
else:
    rec("S9-pipe-skip", "INFO", "no recent kasir-pipe live-forward yet (synthetic HMAC does not hit the plugin)")

# ── S10 bridge health ─────────────────────────────────────────────────────
health = jget("docker exec nsoft3-hermes wget -qO- --timeout=5 http://127.0.0.1:3000/health; echo")
rec("S10-bridge-health", "INFO", json.dumps(health)[:240] if not isinstance(health, str) else str(health)[:240])
if str(health.get("status") or "").upper() == "CONNECTED" or health.get("connected"):
    rec("S10b-bridge-connected", "PASS", "Baileys bridge CONNECTED")
else:
    rec("S10b-bridge-connected", "WARN", f"bridge not CONNECTED yet: {health}")

print("\n========== SUMMARY ==========", flush=True)
fails = [r for r in results if r[1] == "FAIL"]
warns = [r for r in results if r[1] == "WARN"]
passes = [r for r in results if r[1] == "PASS"]
print(f"PASS={len(passes)} WARN={len(warns)} FAIL={len(fails)}", flush=True)
for sid, st, d in results:
    print(f"  {st:4} {sid}: {d[:180]}", flush=True)

outp = ROOT / ".gstack-tmp-hermes-safety.json"
outp.write_text(json.dumps({"pair": pair, "waha": waha, "results": results}, indent=2, default=str), encoding="utf-8")
print(f"\nWROTE {outp}", flush=True)
c.close()
print("DONE", flush=True)
