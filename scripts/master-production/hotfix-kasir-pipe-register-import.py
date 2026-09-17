#!/usr/bin/env python3
"""Hotfix kasir-pipe register import shadow + recreate hermes."""
from __future__ import annotations

import sys
import tarfile
import tempfile
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
REMOTE = "/opt/nusantarasoft-3"
COMPOSE = (
    f"cd {REMOTE} && docker compose -f docker-compose.master-production.yml "
    f"--env-file .env.master-production"
)

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
if c.get_transport():
    c.get_transport().set_keepalive(30)


def run(cmd: str, timeout: int = 600) -> tuple[int, str]:
    print(f"\n>>> {cmd[:240]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text[-4000:] if text.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return code, out


with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tf:
    tar_path = Path(tf.name)
with tarfile.open(tar_path, "w:gz") as tar:
    tar.add(
        ROOT / "scripts/master-production/hermes-plugins/kasir-pipe",
        arcname="scripts/master-production/hermes-plugins/kasir-pipe",
        filter=lambda info: None if "__pycache__" in info.name else info,
    )

sftp = c.open_sftp()
sftp.put(str(tar_path), f"{REMOTE}/.tmp-kasir-pipe-fix.tar.gz")
sftp.close()
tar_path.unlink(missing_ok=True)

run(f"cd {REMOTE} && tar xzf .tmp-kasir-pipe-fix.tar.gz && rm -f .tmp-kasir-pipe-fix.tar.gz")
run(
    f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe "
    f"{REMOTE}/volumes/hermes/plugins/"
)

# Keep plugins.enabled
run(
    "python3 - <<'PY'\n"
    "from pathlib import Path\n"
    "import re\n"
    "p = Path('/opt/nusantarasoft-3/volumes/hermes/config.yaml')\n"
    "t = p.read_text(encoding='utf-8')\n"
    "block = '''plugins:\\n"
    "  enabled:\\n"
    "    - kasir-pipe\\n"
    "    - kasir-probe\\n"
    "    - kasir-tools\\n"
    "  disabled: []\\n"
    "  entries:\\n"
    "    kasir-probe:\\n"
    "      allow_tool_override: false\\n"
    "    kasir-tools:\\n"
    "      allow_tool_override: false\\n"
    "    kasir-pipe:\\n"
    "      allow_tool_override: false\\n"
    "'''\n"
    "if re.search(r'(?m)^plugins:\\s*$', t):\n"
    "    t2 = re.sub(r'(?ms)^plugins:\\n.*?(?=^[a-zA-Z_]|\\Z)', block + '\\n', t, count=1)\n"
    "else:\n"
    "    t2 = t.rstrip() + '\\n\\n' + block\n"
    "p.write_text(t2, encoding='utf-8')\n"
    "print('plugins ok')\n"
    "PY"
)

run(f"{COMPOSE} up -d --force-recreate --no-deps hermes", timeout=300)
run("sleep 22")
run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")

# Verify import no longer shadows
verify = r'''
from importlib.util import spec_from_file_location, module_from_spec
# Simulate what _run_registration does after fix: from .register import is_status
import sys
sys.path.insert(0, "/opt/data/plugins")
from kasir_pipe.register import is_status, advance_wizard, msg_intro
assert callable(is_status)
assert "DAFTAR" in msg_intro()
reply, patch = advance_wizard(text="DAFTAR", phone="6281111111111", row=None)
assert patch and patch.get("_action") == "create"
print("import_fix_ok")
'''
sftp = c.open_sftp()
with sftp.file(f"{REMOTE}/volumes/hermes/umkm-import-verify.py", "w") as fh:
    fh.write(verify)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/umkm-import-verify.py")

# LID resolve smoke for the failing chat
lid_probe = r'''
import os, json
from pathlib import Path
SESSION = Path(os.environ.get("KASIR_WA_SESSION_DIR") or "/opt/data/platforms/whatsapp/session")
lid = "184860442402958"
print("session", SESSION, "exists", SESSION.is_dir())
if SESSION.is_dir():
    for name in os.listdir(SESSION):
        if not (name.startswith("lid-mapping-") and name.endswith(".json")):
            continue
        phone = "".join(ch for ch in name[len("lid-mapping-"):-5] if ch.isdigit())
        try:
            mapped = "".join(ch for ch in Path(SESSION, name).read_text(encoding="utf-8") if ch.isdigit())
        except Exception:
            continue
        if mapped == lid:
            print("FOUND_PHONE", phone)
            break
    else:
        print("LID_NOT_MAPPED")
'''
sftp = c.open_sftp()
with sftp.file(f"{REMOTE}/volumes/hermes/umkm-lid-probe.py", "w") as fh:
    fh.write(lid_probe)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/umkm-lid-probe.py")

c.close()
print("\nDONE — retry DAFTAR on WhatsApp", flush=True)
