#!/usr/bin/env python3
"""Apply / verify WhatsApp Hermes tool allowlist (G13 / eng-review T1).

Kasir WA must not expose coding toolsets. Allowed on platform `whatsapp`:
  clarify, kasir

Apply prefers `hermes tools disable|enable` (preserves config comments).
Check parses `platform_toolsets.whatsapp` from config.yaml.

Usage:
  python3 scripts/master-production/hermes-wa-tool-allowlist.py check
  python3 scripts/master-production/hermes-wa-tool-allowlist.py apply
  HERMES_CONTAINER=nsoft3-hermes python3 … apply --docker
  HERMES_CONTAINER=nsoft3-hermes python3 … check --docker

Exit 0 = ok; 1 = fail.
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOME = ROOT / "volumes" / "hermes"

ALLOWED_WHATSAPP = ("clarify", "kasir")

# Disable these on WhatsApp if present.
DISABLE_WHATSAPP = (
    "terminal",
    "browser",
    "file",
    "web",
    "code_execution",
    "vision",
    "image_gen",
    "tts",
    "skills",
    "todo",
    "memory",
    "session_search",
    "delegation",
    "cronjob",
    "computer_use",
    "kanban",
    "homeassistant",
    "spotify",
    "yuanbao",
    "discord",
    "discord_admin",
    "video",
    "video_gen",
    "stt",
    "x_search",
    "a2a",
    "context_engine",
)

FORBIDDEN_COMPOSITES = ("hermes-whatsapp", "hermes-cli", "coding", "debugging", "all", "*")


def _load_yaml_text(text: str) -> dict:
    try:
        import yaml  # type: ignore
    except ImportError:
        print("FAIL  pyyaml required", file=sys.stderr)
        sys.exit(1)
    data = yaml.safe_load(text) or {}
    return data if isinstance(data, dict) else {}


def _whatsapp_toolsets(data: dict) -> list[str]:
    pt = data.get("platform_toolsets") or {}
    raw = pt.get("whatsapp") or []
    if isinstance(raw, str):
        return [raw.strip()] if raw.strip() else []
    if not isinstance(raw, list):
        return []
    return [str(x).strip() for x in raw if str(x).strip()]


def _platform_toolsets_block(text: str) -> tuple[str, int, int] | None:
    """Return (inner, start, end) of platform_toolsets section body."""
    m = re.search(r"(?ms)^(platform_toolsets:\n)(.*?)(?=^[a-zA-Z_]|\Z)", text)
    if not m:
        return None
    return m.group(2), m.start(2), m.end(2)


def _parse_whatsapp_toolsets_from_text(text: str) -> list[str] | None:
    """Parse platform_toolsets.whatsapp without PyYAML (health/deploy friendly)."""
    found = _platform_toolsets_block(text)
    if not found:
        return None
    body, _, _ = found
    m = re.search(r"(?m)^  whatsapp:\n((?:    - [^\n]*\n)+)", body)
    if not m:
        return None
    names: list[str] = []
    for line in m.group(1).splitlines():
        line = line.strip()
        if line.startswith("- "):
            names.append(line[2:].strip().strip("\"'"))
    return names


def check_allowlist_from_text(text: str) -> tuple[bool, str]:
    enabled = _parse_whatsapp_toolsets_from_text(text)
    if enabled is None:
        return False, "platform_toolsets.whatsapp block not found"
    return check_allowlist_list(enabled)


def check_allowlist_list(enabled: list[str]) -> tuple[bool, str]:
    if not enabled:
        return False, "platform_toolsets.whatsapp empty"
    for bad in FORBIDDEN_COMPOSITES:
        if bad in enabled:
            return False, f"forbidden composite {bad!r}; have={enabled}"
    missing = [x for x in ALLOWED_WHATSAPP if x not in enabled]
    if missing:
        return False, f"missing required {missing}; have={enabled}"
    forbidden_hit = [x for x in enabled if x in DISABLE_WHATSAPP]
    if forbidden_hit:
        return False, f"forbidden still enabled: {forbidden_hit}; have={enabled}"
    extra = [x for x in enabled if x not in ALLOWED_WHATSAPP]
    if extra:
        return False, f"unexpected extras: {extra}; want {list(ALLOWED_WHATSAPP)}"
    return True, f"whatsapp toolsets={enabled}"


def check_allowlist(data: dict) -> tuple[bool, str]:
    return check_allowlist_list(_whatsapp_toolsets(data))


def _docker_exec(container: str, argv: list[str], *, timeout: int = 90) -> tuple[int, str]:
    cmd = ["docker", "exec", "-e", "HERMES_HOME=/opt/data", container, *argv]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=timeout)
        out = (proc.stdout or b"").decode("utf-8", "replace")
        err = (proc.stderr or b"").decode("utf-8", "replace")
        return proc.returncode, (out + err).strip()
    except Exception as exc:
        return 1, str(exc)


def _read_config(args: argparse.Namespace) -> tuple[str, Path | None]:
    if args.docker:
        text = _docker_cat_raw(args.container)
        if not text:
            raise SystemExit(f"cannot read /opt/data/config.yaml from {args.container}")
        return text, None
    home = Path(os.environ.get("HERMES_HOME") or DEFAULT_HOME)
    path = home / "config.yaml"
    if not path.is_file():
        raise SystemExit(f"missing {path}")
    return path.read_text(encoding="utf-8"), path


def _docker_cat_raw(container: str) -> str | None:
    try:
        out = subprocess.check_output(
            ["docker", "exec", container, "cat", "/opt/data/config.yaml"],
            stderr=subprocess.DEVNULL,
            timeout=20,
        )
        return out.decode("utf-8", "replace")
    except Exception:
        return None


def _surgical_set_whatsapp_list(text: str, names: list[str]) -> str:
    """Replace platform_toolsets.whatsapp list in-place without full YAML dump."""
    found = _platform_toolsets_block(text)
    if not found:
        raise RuntimeError("platform_toolsets: block not found")
    body, start, end = found
    new_list = "".join(f"    - {n}\n" for n in names)
    m = re.search(r"(?m)^  whatsapp:\n(?:    - [^\n]*\n)+", body)
    if not m:
        raise RuntimeError("platform_toolsets.whatsapp list not found")
    body2 = body[: m.start()] + "  whatsapp:\n" + new_list + body[m.end() :]
    return text[:start] + body2 + text[end:]


def cmd_check(args: argparse.Namespace) -> int:
    text, _ = _read_config(args)
    ok, detail = check_allowlist_from_text(text)
    print(f"{'PASS' if ok else 'FAIL'}  whatsapp-tool-allowlist: {detail}")
    return 0 if ok else 1


def cmd_apply(args: argparse.Namespace) -> int:
    if args.docker:
        # Surgical rewrite is source of truth (Hermes CLI can leave extras like kanban).
        rc = _apply_surgical_docker(args.container)
        if rc != 0:
            return rc
        # Best-effort sync Hermes tool UI state (ignore unknown toolset errors).
        _docker_exec(
            args.container,
            [
                "hermes",
                "tools",
                "disable",
                "--platform",
                "whatsapp",
                *[
                    x
                    for x in DISABLE_WHATSAPP
                    if x not in ("discord", "discord_admin")
                ],
            ],
            timeout=120,
        )
        _docker_exec(
            args.container,
            [
                "hermes",
                "tools",
                "enable",
                "--platform",
                "whatsapp",
                *ALLOWED_WHATSAPP,
            ],
            timeout=60,
        )
        # Re-pin — CLI may have re-expanded the list.
        return _apply_surgical_docker(args.container)

    text, path = _read_config(args)
    assert path is not None
    try:
        new = _surgical_set_whatsapp_list(text, list(ALLOWED_WHATSAPP))
    except RuntimeError as exc:
        print(f"FAIL  {exc}", file=sys.stderr)
        return 1
    path.write_text(new, encoding="utf-8")
    ok, detail = check_allowlist_from_text(new)
    print(f"{'PASS' if ok else 'FAIL'}  apply-local: {detail}")
    return 0 if ok else 1


def _apply_surgical_docker(container: str) -> int:
    text = _docker_cat_raw(container)
    if not text:
        print("FAIL  cannot read config for surgical fix", file=sys.stderr)
        return 1
    try:
        new = _surgical_set_whatsapp_list(text, list(ALLOWED_WHATSAPP))
    except RuntimeError as exc:
        print(f"FAIL  {exc}", file=sys.stderr)
        return 1
    # Prefer writing host bind mount (prod).
    host = Path("/opt/nusantarasoft-3/volumes/hermes/config.yaml")
    # When run from laptop, write via docker.
    proc = subprocess.run(
        ["docker", "exec", "-i", container, "sh", "-lc", "cat > /opt/data/config.yaml"],
        input=new.encode("utf-8"),
        capture_output=True,
        timeout=30,
    )
    if proc.returncode != 0:
        print(proc.stderr.decode("utf-8", "replace"), file=sys.stderr)
        return 1
    _ = host  # noqa: documenting prod path
    data = None  # noqa — surgical path only
    ok, detail = check_allowlist_from_text(new)
    print(f"{'PASS' if ok else 'FAIL'}  apply-surgical: {detail}")
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("action", choices=("apply", "check"))
    ap.add_argument("--docker", action="store_true")
    ap.add_argument(
        "--container",
        default=os.environ.get("HERMES_CONTAINER", "hermes"),
    )
    args = ap.parse_args()
    if args.action == "apply":
        return cmd_apply(args)
    return cmd_check(args)


if __name__ == "__main__":
    raise SystemExit(main())
