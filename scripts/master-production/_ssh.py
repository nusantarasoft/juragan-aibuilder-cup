#!/usr/bin/env python3
"""Tiny SSH/SFTP helper for the master-production deploy (password auth via env).

Env: SSH_HOST, SSH_USER, SSH_PASS, [SSH_PORT=22]
Usage:
  python _ssh.py run   "<remote shell command>"
  python _ssh.py script <local_script.sh>        # piped to `bash -s`
  python _ssh.py put   <local_path> <remote_path>

Requires: paramiko  (pip install paramiko)
"""
import os, sys, time, paramiko

HOST = os.environ["SSH_HOST"]
PORT = int(os.environ.get("SSH_PORT", "22"))
USER = os.environ.get("SSH_USER", "root")
PWD = os.environ["SSH_PASS"]


def connect():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, port=PORT, username=USER, password=PWD,
              timeout=30, banner_timeout=30, auth_timeout=30)
    return c


def run(cmd, script=False):
    c = connect()
    if script:
        with open(cmd, "r", encoding="utf-8", newline="") as f:
            body = f.read().replace("\r\n", "\n").replace("\r", "\n")
        stdin, stdout, stderr = c.exec_command("bash -s", timeout=int(os.environ.get("SSH_TIMEOUT", "3600")))
        stdin.write(body)
        stdin.channel.shutdown_write()
    else:
        stdin, stdout, stderr = c.exec_command(cmd, timeout=int(os.environ.get("SSH_TIMEOUT", "3600")))
    for line in iter(stdout.readline, ""):
        sys.stdout.write(line); sys.stdout.flush()
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if err.strip():
        sys.stderr.write("\n--- STDERR ---\n" + err)
    c.close()
    sys.exit(code)


def put(local, remote):
    t = paramiko.Transport((HOST, PORT))
    t.connect(username=USER, password=PWD)
    sftp = paramiko.SFTPClient.from_transport(t)
    size = os.path.getsize(local)
    st = {"last": 0, "t0": time.time()}

    def cb(sent, total):
        pct = sent * 100 // total if total else 100
        if pct >= st["last"] + 10 or sent == total:
            st["last"] = pct
            print(f"  {pct:3d}%  {sent/1048576:.1f}/{total/1048576:.1f} MB  {time.time()-st['t0']:.0f}s", flush=True)

    print(f"Uploading {local} ({size/1048576:.1f} MB) -> {remote}", flush=True)
    sftp.put(local, remote, callback=cb)
    sftp.close(); t.close()
    print("DONE", flush=True)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "run":
        run(sys.argv[2])
    elif mode == "script":
        run(sys.argv[2], script=True)
    elif mode == "put":
        put(sys.argv[2], sys.argv[3])
    else:
        print(__doc__); sys.exit(2)
