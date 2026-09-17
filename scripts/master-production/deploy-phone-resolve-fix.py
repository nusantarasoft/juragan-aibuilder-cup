#!/usr/bin/env python3
"""Deploy phone resolve via Hermes sessions.json + pipe stamp."""
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
    for rel in (
        "scripts/master-production/hermes-plugins/kasir-tools",
        "scripts/master-production/hermes-plugins/kasir-pipe",
    ):
        tar.add(
            ROOT / rel,
            arcname=rel,
            filter=lambda info: None if "__pycache__" in info.name else info,
        )

sftp = c.open_sftp()
sftp.put(str(tar_path), f"{REMOTE}/.tmp-kasir-phone-fix.tar.gz")
sftp.close()
tar_path.unlink(missing_ok=True)

run(f"cd {REMOTE} && tar xzf .tmp-kasir-phone-fix.tar.gz && rm -f .tmp-kasir-phone-fix.tar.gz")
run(
    f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-tools "
    f"{REMOTE}/volumes/hermes/plugins/ && "
    f"cp -a {REMOTE}/scripts/master-production/hermes-plugins/kasir-pipe "
    f"{REMOTE}/volumes/hermes/plugins/"
)
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

verify = r'''
import importlib.util, sys, types
from pathlib import Path
root = Path("/opt/data/plugins/kasir-tools")
pkg = types.ModuleType("kasir_tools")
pkg.__path__ = [str(root)]
sys.modules["kasir_tools"] = pkg
# identity submodule
spec_i = importlib.util.spec_from_file_location("kasir_tools.identity", root / "identity.py")
mod_i = importlib.util.module_from_spec(spec_i)
sys.modules["kasir_tools.identity"] = mod_i
spec_i.loader.exec_module(mod_i)
spec = importlib.util.spec_from_file_location(
    "kasir_tools", root / "__init__.py", submodule_search_locations=[str(root)]
)
mod = importlib.util.module_from_spec(spec)
sys.modules["kasir_tools"] = mod
mod.__path__ = [str(root)]
spec.loader.exec_module(mod)

sid = "20260912_030323_9b3ac97d"
phone = mod._phone_from_hermes_session(sid)
print("from_session", phone)
assert phone == "628568713897", phone
phone2 = mod._resolve_phone({}, {"session_id": sid})
print("resolve", phone2)
assert phone2 == "628568713897", phone2
tenant = mod._resolve_tenant(phone2)
print("tenant", tenant)
assert tenant == "umkm-warung-bu-kades", tenant
# still no agent-phone contamination when empty session
assert mod._resolve_phone({}, {"session_id": "nope"}) == ""
print("phone_resolve_ok")
'''
sftp = c.open_sftp()
with sftp.file(f"{REMOTE}/volumes/hermes/umkm-phone-resolve-verify.py", "w") as fh:
    fh.write(verify)
sftp.close()
run("docker exec nsoft3-hermes python3 /opt/data/umkm-phone-resolve-verify.py")
run(
    "docker exec nsoft3-hermes sh -lc "
    "'grep -E \"^version:\" /opt/data/plugins/kasir-tools/plugin.yaml "
    "/opt/data/plugins/kasir-pipe/plugin.yaml'"
)
c.close()
print("\nDONE — retry cek stok; Bu Kades should resolve, empty catalog OK", flush=True)
