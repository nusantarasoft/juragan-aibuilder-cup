#!/usr/bin/env python3
"""Mac/Linux deploy orchestrator (same flow as deploy.ps1).

Loads SSH + GitHub creds from deploy.local.env (gitignored). Example:

  python scripts/master-production/deploy.py --skip-merge --allow-dirty
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
SSH = SCRIPTS / "_ssh.py"
PULL = SCRIPTS / "pull-on-server.sh"
DETACHED = SCRIPTS / "redeploy-detached.sh"
REMOTE_DIR = "/opt/nusantarasoft-3"
BRANCH = "master-production"


def load_env_file() -> None:
    path = SCRIPTS / "deploy.local.env"
    if not path.is_file():
        sys.exit(f"Missing {path} — copy from team vault / example comments in docs.")
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def git(*args: str) -> str:
    r = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if r.returncode != 0:
        sys.stderr.write(r.stderr or r.stdout)
        raise SystemExit(r.returncode)
    return (r.stdout or "").strip()


def deploy_git_url() -> str:
    if os.environ.get("DEPLOY_GIT_URL"):
        return os.environ["DEPLOY_GIT_URL"].strip()
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        origin = git("remote", "get-url", "origin")
        m = re.search(r"github\.com[:/](.+?)(?:\.git)?\s*$", origin)
        if not m:
            sys.exit(f"GITHUB_TOKEN set but origin is not github.com: {origin}")
        return f"https://x-access-token:{token}@github.com/{m.group(1)}.git"
    return git("remote", "get-url", "origin")


def ssh_capture(cmd: str, timeout: str = "120") -> tuple[int, str]:
    env = {**os.environ, "SSH_TIMEOUT": timeout}
    r = subprocess.run(
        [sys.executable, str(SSH), "capture", cmd],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def ssh_put(local: Path, remote: str) -> None:
    r = subprocess.run(
        [sys.executable, str(SSH), "put", str(local), remote],
        cwd=ROOT,
        env=os.environ,
    )
    if r.returncode != 0:
        raise SystemExit(r.returncode)


def parse_kv(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        m = re.match(r"^([A-Z_]+)=(.*)$", line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def build_pull_script(deploy_url: str, target_sha: str) -> str:
    body = PULL.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    url_esc = deploy_url.replace("'", "'\\''")
    sha_esc = target_sha.replace("'", "'\\''")
    header = (
        "set -euo pipefail\n"
        f"export BRANCH='{BRANCH}'\n"
        f"export REMOTE_DIR='{REMOTE_DIR}'\n"
        f"export DEPLOY_GIT_URL='{url_esc}'\n"
        f"export TARGET_SHA='{sha_esc}'\n\n"
    )
    footer = (
        "\n"
        f"CUR=$(git -C '{REMOTE_DIR}' rev-parse --abbrev-ref HEAD)\n"
        f"test \"$CUR\" = '{BRANCH}' || {{ echo \"ERROR: server on $CUR, expected {BRANCH}\" >&2; exit 1; }}\n"
        f"HEAD=$(git -C '{REMOTE_DIR}' rev-parse HEAD)\n"
        f"test \"$HEAD\" = '{sha_esc}' || {{ echo \"ERROR: server at $HEAD, expected {sha_esc}\" >&2; exit 1; }}\n"
        f"echo \"server branch OK: $CUR at $(git -C '{REMOTE_DIR}' rev-parse --short HEAD)\"\n"
    )
    return header + body + footer


def ensure_remote_dirs() -> None:
    cmd = f"mkdir -p '{REMOTE_DIR}/logs' '{REMOTE_DIR}/scripts/master-production'"
    code, text = ssh_capture(cmd)
    if code != 0:
        sys.stderr.write(text)
        raise SystemExit(code)


def sync_detached_helper() -> None:
    ensure_remote_dirs()
    remote = f"{REMOTE_DIR}/scripts/master-production/redeploy-detached.sh"
    ssh_put(DETACHED, remote)


def remote_status(idle_retry_sec: int = 0) -> dict[str, str | None]:
    deadline = time.time() + idle_retry_sec
    detached_sh = "scripts/master-production/redeploy-detached.sh"
    while True:
        code, text = ssh_capture(f"cd {REMOTE_DIR} && bash {detached_sh} status")
        kv = parse_kv(text)
        status = kv.get("STATUS")
        if status == "done":
            status = "success"
        if idle_retry_sec and status == "idle" and time.time() < deadline:
            time.sleep(1)
            continue
        kv["STATUS"] = status
        kv["_raw"] = text
        kv["_code"] = str(code)
        return kv


def tail_log(log_path: str | None, offset: int) -> tuple[int, str]:
    if not log_path:
        return offset, ""
    esc = log_path.replace("'", "'\\''")
    detached_sh = "scripts/master-production/redeploy-detached.sh"
    _, text = ssh_capture(
        f"cd {REMOTE_DIR} && bash {detached_sh} tail-since '{esc}' {offset}"
    )
    new_off = offset
    lines: list[str] = []
    for line in text.splitlines():
        if line.startswith("OFFSET="):
            try:
                new_off = int(line.split("=", 1)[1])
            except ValueError:
                pass
        else:
            lines.append(line)
    chunk = "\n".join(lines)
    if chunk:
        print(chunk, flush=True)
    return new_off, chunk


def wait_remote(status_only: bool = False) -> None:
    offset = 0
    poll = 0
    while True:
        idle_retry = 15 if poll == 0 else 0
        poll += 1
        st = remote_status(idle_retry_sec=idle_retry)
        status = st.get("STATUS")
        log = st.get("LOG")
        if not status_only:
            offset, _ = tail_log(log, offset)

        if status in ("success", "done"):
            exit_s = st.get("EXIT") or "0"
            ec = int(exit_s) if exit_s.isdigit() else 0
            sha = st.get("SHA") or ""
            sha_hint = f" sha {sha[:12]}" if sha else ""
            print(f"==> remote redeploy finished (exit {ec}){sha_hint} log: {log}")
            if ec != 0:
                raise SystemExit(ec)
            return
        if status == "failed":
            print(st.get("_raw", ""))
            exit_s = st.get("EXIT") or "1"
            ec = int(exit_s) if exit_s.isdigit() else 1
            raise SystemExit(f"remote redeploy failed (exit {ec}). log: {log}")
        if status == "idle":
            raise SystemExit("no remote redeploy in progress (idle)")
        if status == "running":
            if status_only:
                print(st.get("_raw", ""))
                print(f"==> redeploy still running (pid {st.get('PID')}) log: {log}")
                return
            time.sleep(10)
            continue
        raise SystemExit(f"unexpected remote deploy status: {status}")


def start_deploy(remote_pull: str, target_sha: str) -> None:
    sync_detached_helper()
    esc_pull = remote_pull.replace("'", "'\\''")
    esc_sha = target_sha.replace("'", "'\\''")
    detached_sh = "scripts/master-production/redeploy-detached.sh"
    code, text = ssh_capture(
        f"cd {REMOTE_DIR} && bash {detached_sh} start '{esc_pull}' '{esc_sha}'"
    )
    if code == 2:
        print(text)
        raise SystemExit("concurrent deploy blocked — use --attach or --status")
    if code != 0:
        print(text)
        raise SystemExit("failed to start detached deploy on server")
    kv = parse_kv(text)
    print(f"    detached pid={kv.get('PID')} log={kv.get('LOG')}")
    wait_remote()


def main() -> None:
    parser = argparse.ArgumentParser(description="Deploy master-production to server")
    parser.add_argument("--skip-merge", action="store_true")
    parser.add_argument("--allow-dirty", action="store_true")
    parser.add_argument("--attach", action="store_true")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args()

    load_env_file()
    for var in ("SSH_HOST", "SSH_PASS"):
        if not os.environ.get(var):
            sys.exit(f"deploy.local.env must set {var}")

    os.environ.setdefault("SSH_USER", "root")

    if args.attach and args.status:
        sys.exit("Use --attach or --status, not both")

    if args.attach:
        print("==> attach remote redeploy")
        sync_detached_helper()
        wait_remote()
        print(f"==> deploy finished ({BRANCH}).")
        return

    if args.status:
        print("==> remote redeploy status")
        sync_detached_helper()
        wait_remote(status_only=True)
        return

    porcelain = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    if porcelain and not args.allow_dirty:
        sys.exit(
            "Local working tree is dirty; commit/revert or pass --allow-dirty "
            "(see docs/deploy-master-production.md)."
        )
    if porcelain and args.allow_dirty:
        print("==> [1/3] skip local git (--allow-dirty)")
    elif args.skip_merge:
        print("==> [1/3] skip merge (--skip-merge)")
    else:
        print(f"==> [1/3] merge master -> {BRANCH}")
        git("fetch", "origin", "master", BRANCH)
        git("checkout", BRANCH)
        git("merge", "origin/master", "--no-edit")
        git("push", "-u", "origin", BRANCH)

    deploy_url = deploy_git_url()
    masked = re.sub(r"(://[^:]+:)[^@]+@", r"\1***@", deploy_url)
    print("==> [2/3] server git pull + redeploy (detached)")
    print(f"    remote: {masked}")

    git("fetch", "origin", BRANCH)
    target_sha = git("rev-parse", f"origin/{BRANCH}")
    print(f"    target SHA: {target_sha[:12]}")

    pull_body = build_pull_script(deploy_url, target_sha)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    local_pull = Path("/tmp") / f"nsoft3-pull-on-server-{ts}.sh"
    local_pull.write_text(pull_body.replace("\r\n", "\n").replace("\r", "\n"), encoding="utf-8")
    remote_pull = f"{REMOTE_DIR}/logs/.deploy-pull-{ts}.sh"

    ensure_remote_dirs()
    print(f"    uploading pull script -> {remote_pull}")
    ssh_put(local_pull, remote_pull)

    print("==> [3/3] trigger detached full deploy on server")
    start_deploy(remote_pull, target_sha)
    print(f"==> deploy finished ({BRANCH}).")


if __name__ == "__main__":
    main()
