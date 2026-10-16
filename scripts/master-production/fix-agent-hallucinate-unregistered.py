#!/usr/bin/env python3
"""Reset Hermes WA session for Bu Kades + update SOUL + show last reply."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
REMOTE = "/opt/nusantarasoft-3"
COMPOSE = (
    f"cd {REMOTE} && docker compose -f docker-compose.master-production.yml "
    f"--env-file .env.master-production"
)
PHONE = "628568713897"

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parent / "deploy.local.env").read_text(
    encoding="utf-8"
).splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

# Strengthen SOUL locally first
soul = ROOT / "scripts/master-production/hermes-home/SOUL.md"
text = soul.read_text(encoding="utf-8")
marker = "## Data toko (wajib tool)"
if marker not in text:
    text = text.rstrip() + (
        "\n\n## Data toko (wajib tool)\n"
        "- Stok / daftar barang / laporan / jual-beli **harus** lewat tool kasir.\n"
        "- Jangan mengarang bahwa nomor belum terdaftar jika user sudah bisa chat kasir.\n"
        "- Kalau tool bilang stok kosong / belum ada data, itu artinya katalog toko ini "
        "masih kosong — **bukan** nomor salah atau belum approve.\n"
        "- Jangan mengulang error lama dari percakapan sebelumnya; panggil tool lagi.\n"
    )
    soul.write_text(text, encoding="utf-8")

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


def run(cmd: str, timeout: int = 300) -> tuple[int, str]:
    print(f"\n>>> {cmd[:220]}", flush=True)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out = o.read().decode("utf-8", "replace")
    err = e.read().decode("utf-8", "replace")
    code = o.channel.recv_exit_status()
    text_out = out + (("\nSTDERR " + err) if err.strip() else "")
    print((text_out[-4000:] if text_out.strip() else "(empty)") + f"\nexit={code}", flush=True)
    return code, out


# Upload SOUL
sftp = c.open_sftp()
sftp.put(str(soul), f"{REMOTE}/scripts/master-production/hermes-home/SOUL.md")
sftp.close()
run(
    f"cp -f {REMOTE}/scripts/master-production/hermes-home/SOUL.md "
    f"{REMOTE}/volumes/hermes/SOUL.md"
)

# Extract last model response around 03:23
run(
    "docker exec nsoft3-hermes sh -lc "
    "\"python3 - <<'PY'\\n"
    "from pathlib import Path\\n"
    "t=Path('/opt/data/logs/agent.log').read_text(encoding='utf-8',errors='replace')\\n"
    "idx=t.rfind(\\\"msg='Cek stok'\\\")\\n"
    "print(t[idx:idx+2500] if idx>=0 else 'NO')\\n"
    "PY\""
)

# Reset session mapping + try hermes sessions reset if CLI exists
reset = f'''
import json
from pathlib import Path
p = Path("/opt/data/sessions/sessions.json")
d = json.loads(p.read_text(encoding="utf-8"))
key = "agent:main:whatsapp:dm:{PHONE}"
old = d.pop(key, None)
p.write_text(json.dumps(d, indent=2), encoding="utf-8")
print("removed", key, "old_sid", (old or {{}}).get("session_id"))
# also clear runtime stamp so next message re-stamps cleanly
rp = Path("/opt/data/runtime/kasir_active_sender.json")
if rp.exists():
    rp.unlink()
    print("cleared stamp")
'''
sftp = c.open_sftp()
with sftp.file(f"{REMOTE}/volumes/hermes/reset-bu-kades-session.py", "w") as fh:
    fh.write(reset)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/reset-bu-kades-session.py")

# Try DB session clear if state.db accessible
run(
    "docker exec -e HERMES_HOME=/opt/data nsoft3-hermes sh -lc "
    f"'hermes sessions list 2>&1 | tail -30; "
    f"hermes sessions reset --help 2>&1 | head -20 || true; "
    f"hermes gateway session-reset 2>&1 | head || true'"
)

# Recreate hermes to pick SOUL + clear in-memory agent cache
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
run("sleep 20")
run("docker exec nsoft3-hermes curl -sS http://127.0.0.1:8765/pair/status || true")
run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -n \"Data toko\" /opt/data/SOUL.md | head; "
    "test -f /opt/data/plugins/kasir-tools/identity.py && echo identity_ok'"
)

c.close()
print(
    "\nDONE — session Bu Kades di-reset. Chat lagi: cek stok "
    "(harusnya 'Belum ada data stok' / kosong, BUKAN belum terdaftar).",
    flush=True,
)
