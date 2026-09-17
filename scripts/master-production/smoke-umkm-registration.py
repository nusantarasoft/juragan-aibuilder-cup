#!/usr/bin/env python3
"""Production smoke for UMKM WA registration (DAFTAR → pending → reject).

Does NOT approve (avoids creating real tenant/notebook). Verifies:
- deploy artifacts (register.py, KASIR_REGISTRATION, pair)
- wizard state machine on the live plugin copy
- DB insert pending + unique open-phone index
- reject path via SQL (status flip) + cleanup

Usage:
  python scripts/master-production/smoke-umkm-registration.py
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

REMOTE = "/opt/nusantarasoft-3"
SMOKE_PHONE = "6280000000999"  # reserved synthetic; not a real owner


def load_env() -> dict[str, str]:
    path = Path(__file__).resolve().parent / "deploy.local.env"
    env: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def main() -> int:
    env = load_env()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        env["SSH_HOST"],
        username=env.get("SSH_USER", "root"),
        password=env["SSH_PASS"],
        timeout=40,
        allow_agent=False,
        look_for_keys=False,
    )
    if client.get_transport():
        client.get_transport().set_keepalive(30)

    failures: list[str] = []

    def run(cmd: str, timeout: int = 120) -> tuple[int, str]:
        print(f"\n>>> {cmd[:220]}", flush=True)
        _, o, e = client.exec_command(cmd, timeout=timeout)
        out = o.read().decode("utf-8", "replace")
        err = e.read().decode("utf-8", "replace")
        code = o.channel.recv_exit_status()
        text = out + (("\nSTDERR " + err) if err.strip() else "")
        safe = text.encode("utf-8", "replace").decode("utf-8", "replace")
        print((safe[-3500:] if safe.strip() else "(empty)") + f"\nexit={code}", flush=True)
        return code, out

    # 1) Health
    code, out = run(
        "docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status"
    )
    if '"status": "WORKING"' not in out and '"status":"WORKING"' not in out:
        failures.append("pair not WORKING")

    code, out = run("docker exec nsoft3-hermes printenv KASIR_REGISTRATION")
    if out.strip() != "1":
        failures.append(f"KASIR_REGISTRATION={out.strip()!r}")

    code, out = run(
        "docker exec nsoft3-hermes sh -lc "
        "'test -f /opt/data/plugins/kasir-pipe/register.py && "
        "grep -E \"^version:\" /opt/data/plugins/kasir-pipe/plugin.yaml'"
    )
    if "1.3.0" not in out:
        failures.append("kasir-pipe version != 1.3.0")

    # 2) Wizard on live plugin
    wizard = r'''
import sys
sys.path.insert(0, "/opt/data/plugins/kasir-pipe")
import register as r
phone = "6280000000999"
reply, patch = r.advance_wizard(text="halo", phone=phone, row=None)
assert "DAFTAR" in reply, reply
reply, patch = r.advance_wizard(text="DAFTAR", phone=phone, row=None)
assert patch and patch.get("_action") == "create", patch
row = {"status": "draft", "wizard_step": r.STEP_ASK_STORE, "phone": phone}
reply, patch = r.advance_wizard(text="Warung Smoke", phone=phone, row=row)
assert patch["wizard_step"] == r.STEP_CONFIRM, patch
row.update({k: v for k, v in patch.items() if k != "_action"})
reply, patch = r.advance_wizard(text="YA", phone=phone, row=row)
assert patch["status"] == "pending", patch
print("wizard_ok")
'''
    remote_py = f"{REMOTE}/volumes/hermes/umkm-reg-wizard-smoke.py"
    sftp = client.open_sftp()
    with sftp.file(remote_py, "w") as fh:
        fh.write(wizard)
    sftp.close()
    run(f"cp -f {remote_py} /opt/nusantarasoft-3/volumes/hermes/umkm-reg-wizard-smoke.py")
    code, out = run(
        "docker exec nsoft3-hermes python3 /opt/data/umkm-reg-wizard-smoke.py"
    )
    if code != 0 or "wizard_ok" not in out:
        failures.append("wizard smoke failed")

    # 3) DB pending insert + unique index + cleanup
    reg_id = str(uuid.uuid4())
    sql = f"""
BEGIN;
DELETE FROM public.studio_umkm_registrations WHERE phone = '{SMOKE_PHONE}';
INSERT INTO public.studio_umkm_registrations
  (id, phone, store_name, status, wizard_step, session_name)
VALUES
  ('{reg_id}', '{SMOKE_PHONE}', 'Warung Smoke', 'pending', 'done', 'hermes');
-- unique open-phone: second insert must fail
DO $$
BEGIN
  BEGIN
    INSERT INTO public.studio_umkm_registrations (phone, store_name, status, wizard_step)
    VALUES ('{SMOKE_PHONE}', 'Dup', 'pending', 'done');
    RAISE EXCEPTION 'unique_index_missing';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'unique_ok';
  END;
END $$;
UPDATE public.studio_umkm_registrations SET status='rejected', reject_reason='smoke', updated_at=now()
WHERE id = '{reg_id}';
SELECT id::text, status, store_name FROM public.studio_umkm_registrations WHERE id = '{reg_id}';
DELETE FROM public.studio_umkm_registrations WHERE phone = '{SMOKE_PHONE}';
COMMIT;
SELECT 'db_smoke_ok' AS ok;
"""
    sql_path = f"{REMOTE}/.tmp-umkm-reg-smoke.sql"
    sftp = client.open_sftp()
    with sftp.file(sql_path, "w") as fh:
        fh.write(sql)
    sftp.close()
    code, out = run(
        f"docker exec -i nsoft3-postgres psql -U supabase_admin -d nusantarasoft "
        f"-v ON_ERROR_STOP=1 < {sql_path}"
    )
    if code != 0 or "db_smoke_ok" not in out:
        failures.append("db smoke failed")

    # 4) nginx + containers
    code, out = run(
        "curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/health"
    )
    if out.strip() != "200":
        failures.append(f"nginx health={out.strip()!r}")

    code, out = run(
        "docker inspect -f '{{.Name}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "
        "nsoft3-middleware nsoft3-admin nsoft3-hermes nsoft3-nginx"
    )
    for name in ("middleware", "admin", "hermes", "nginx"):
        if f"nsoft3-{name}" not in out:
            failures.append(f"missing container {name}")

    # 5) recent registration log lines (informational)
    run(
        "docker exec nsoft3-hermes sh -lc "
        "'grep -iE \"registration|allowlist deny\" /opt/data/logs/agent.log | tail -n 15' || true"
    )

    client.close()
    print("\n" + "=" * 60, flush=True)
    if failures:
        print("SMOKE FAIL:", json.dumps(failures, ensure_ascii=False), flush=True)
        return 1
    print(
        "SMOKE OK — next: real WA phone → DAFTAR → YA → Approve di /admin/ai-studio/umkm",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
