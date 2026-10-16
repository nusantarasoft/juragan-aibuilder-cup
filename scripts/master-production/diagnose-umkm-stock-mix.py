#!/usr/bin/env python3
"""Diagnose mixed UMKM stock — tenant configs + phone overlap + sample inv_items."""
from __future__ import annotations

import json
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
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-5000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return out


run("docker exec nsoft3-hermes printenv KASIR_AGENT_PHONES || true")

run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT tenant_id, enabled, business_phone, allowlist_phones, label, "
    "left(notebook_id::text,8) AS nb "
    "FROM studio_whatsapp_config ORDER BY tenant_id;\""
)

# phones appearing in more than one tenant
run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"WITH phones AS ("
    "  SELECT tenant_id, regexp_replace(coalesce(business_phone,''), '[^0-9]', '', 'g') AS phone "
    "  FROM studio_whatsapp_config WHERE coalesce(business_phone,'') <> '' "
    "  UNION ALL "
    "  SELECT c.tenant_id, regexp_replace(p, '[^0-9]', '', 'g') "
    "  FROM studio_whatsapp_config c, LATERAL jsonb_array_elements_text("
    "    CASE WHEN jsonb_typeof(to_jsonb(c.allowlist_phones))='array' "
    "         THEN to_jsonb(c.allowlist_phones) ELSE '[]'::jsonb END"
    "  ) AS p"
    ") "
    "SELECT phone, count(DISTINCT tenant_id) AS tenants, string_agg(DISTINCT tenant_id, ', ') "
    "FROM phones WHERE length(phone)>=8 "
    "GROUP BY phone HAVING count(DISTINCT tenant_id)>1 "
    "ORDER BY tenants DESC;\""
)

# product counts per tenant + null tenant
run(
    "docker exec nsoft3-postgres psql -U supabase_admin -d nusantarasoft -c "
    "\"SELECT coalesce(tenant_id,'(null)') AS tenant_id, count(*) "
    "FROM inv_items WHERE status='active' GROUP BY 1 ORDER BY 2 DESC LIMIT 30;\""
)

# recent agent tool logs for stock
run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -iE \"kasir_get_stock|resolve tenant|tenant_id|kasir-tools\" /opt/data/logs/agent.log "
    "| tail -n 40' || true"
)

# simulate resolve for known phones
probe = r'''
import json, os, urllib.parse, urllib.request, re

def digits(v):
    head=(v or "").split("@",1)[0].split(":",1)[0]
    return re.sub(r"\D","",head)

def phones_match(a,b):
    da,db=digits(a),digits(b)
    if len(da)<8 or len(db)<8: return False
    return da==db or da.endswith(db) or db.endswith(da)

base=(os.environ.get("SUPABASE_URL") or "").rstrip("/")
key=(os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
url=f"{base}/rest/v1/studio_whatsapp_config?select=tenant_id,enabled,notebook_id,business_phone,allowlist_phones,label"
req=urllib.request.Request(url, headers={"apikey":key,"Authorization":f"Bearer {key}","Accept":"application/json"})
rows=json.loads(urllib.request.urlopen(req, timeout=30).read().decode())

def owners(cfg):
    out=[]
    if cfg.get("business_phone"): out.append(digits(str(cfg["business_phone"])))
    allow=cfg.get("allowlist_phones") or []
    if isinstance(allow,str):
        try: allow=json.loads(allow)
        except Exception: allow=[allow]
    for p in allow if isinstance(allow,list) else []:
        d=digits(str(p))
        if d: out.append(d)
    return out

active=[c for c in rows if c.get("enabled") is not False and c.get("notebook_id")]
print("active_tenants", len(active))
for c in active:
    print(" -", c.get("tenant_id"), "label=", c.get("label"), "phones=", owners(c))

# endswith collision matrix
collisions=[]
for i,a in enumerate(active):
    for b in active[i+1:]:
        for pa in owners(a):
            for pb in owners(b):
                if pa!=pb and phones_match(pa,pb):
                    collisions.append((a["tenant_id"],pa,b["tenant_id"],pb))
print("endswith_collisions", collisions)

# agent phones fallback
ap=os.environ.get("KASIR_AGENT_PHONES") or ""
print("KASIR_AGENT_PHONES", ap)
'''
sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/umkm-tenant-mix-probe.py", "w") as fh:
    fh.write(probe)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/umkm-tenant-mix-probe.py")

c.close()
