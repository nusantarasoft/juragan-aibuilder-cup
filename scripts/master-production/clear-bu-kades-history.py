#!/usr/bin/env python3
"""Clear persisted Hermes conversation history for Bu Kades phone."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

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

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    env["SSH_HOST"],
    username=env.get("SSH_USER", "root"),
    password=env["SSH_PASS"],
    timeout=30,
    allow_agent=False,
    look_for_keys=False,
)

script = f'''
import os, sqlite3
from pathlib import Path

phone = "{PHONE}"
home = Path("/opt/data")
# Find sqlite dbs
dbs = list(home.rglob("*.db"))
print("dbs", [str(p) for p in dbs[:20]])
for db in dbs:
    try:
        con = sqlite3.connect(str(db))
        cur = con.cursor()
        tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if not tables:
            con.close()
            continue
        interesting = [t for t in tables if any(x in t.lower() for x in ("session", "message", "conv", "gateway", "rout"))]
        if not interesting:
            con.close()
            continue
        print("DB", db, "tables", interesting)
        for t in interesting:
            cols = [r[1] for r in cur.execute(f"PRAGMA table_info({{t}})").fetchall()]
            print(" ", t, cols[:12])
            # delete rows mentioning phone
            for col in cols:
                try:
                    n = cur.execute(f"SELECT count(*) FROM {{t}} WHERE cast({{col}} as text) LIKE ?", (f"%{{phone}}%",)).fetchone()[0]
                    if n:
                        cur.execute(f"DELETE FROM {{t}} WHERE cast({{col}} as text) LIKE ?", (f"%{{phone}}%",))
                        print("  deleted", n, "from", t, col)
                except Exception as e:
                    pass
        con.commit()
        con.close()
    except Exception as e:
        print("skip", db, e)

# Also remove transcript files containing phone
removed = 0
for p in home.rglob("*"):
    if not p.is_file():
        continue
    if phone in p.name:
        p.unlink(missing_ok=True)
        removed += 1
        print("rm", p)
print("removed_files", removed)
'''
# Fix the script - I used wrong escaping for f-strings inside. Rewrite cleanly.
script = r'''
import sqlite3
from pathlib import Path

phone = "628568713897"
home = Path("/opt/data")
dbs = list(home.rglob("*.db"))
print("dbs", [str(p) for p in dbs[:30]])
for db in dbs:
    try:
        con = sqlite3.connect(str(db))
        cur = con.cursor()
        tables = [r[0] for r in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()]
        interesting = [
            t for t in tables
            if any(x in t.lower() for x in ("session", "message", "conv", "gateway", "rout"))
        ]
        if not interesting:
            con.close()
            continue
        print("DB", db, "tables", interesting)
        for t in interesting:
            cols = [r[1] for r in cur.execute(f"PRAGMA table_info({t})").fetchall()]
            print(" ", t, cols[:12])
            for col in cols:
                try:
                    n = cur.execute(
                        f"SELECT count(*) FROM {t} WHERE cast({col} as text) LIKE ?",
                        (f"%{phone}%",),
                    ).fetchone()[0]
                    if n:
                        cur.execute(
                            f"DELETE FROM {t} WHERE cast({col} as text) LIKE ?",
                            (f"%{phone}%",),
                        )
                        print("  deleted", n, "from", t, ".", col)
                except Exception:
                    pass
        con.commit()
        con.close()
    except Exception as e:
        print("skip", db, e)

removed = 0
for p in home.rglob("*"):
    if p.is_file() and phone in p.name:
        p.unlink(missing_ok=True)
        removed += 1
        print("rm", p)
print("removed_files", removed)
'''

sftp = c.open_sftp()
with sftp.file("/opt/nusantarasoft-3/volumes/hermes/clear-bu-kades-history.py", "w") as fh:
    fh.write(script)
sftp.close()
_, o, e = c.exec_command(
    "docker exec nsoft3-hermes python3 /opt/data/clear-bu-kades-history.py", timeout=120
)
print(o.read().decode("utf-8", "replace")[-5000:])
err = e.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR", err[-1000:])
c.close()
