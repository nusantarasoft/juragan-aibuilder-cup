#!/usr/bin/env python3
"""Check Hermes kasir posture vs docs/hermes-gaps.md (G2/G5/G6/G7).

Usage:
  python3 scripts/master-production/hermes-kasir-health.py
  python3 scripts/master-production/hermes-kasir-health.py --docker
  HERMES_HOME=./volumes/hermes python3 scripts/master-production/hermes-kasir-health.py

Exit 0 = all required checks pass (warnings allowed).
Exit 1 = required check failed.
"""

from __future__ import annotations

import argparse
import os
import stat
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOME = ROOT / "volumes" / "hermes"
REQUIRED_PLUGINS = ("kasir-pipe", "kasir-tools")


def load_yaml(path: Path) -> dict:
    try:
        import yaml  # type: ignore
    except ImportError:
        # Minimal fallback: only parse plugins.enabled list-ish
        text = path.read_text(encoding="utf-8", errors="replace")
        enabled: list[str] = []
        in_enabled = False
        for line in text.splitlines():
            if line.strip().startswith("enabled:"):
                in_enabled = True
                continue
            if in_enabled:
                if line.startswith("  ") and line.strip().startswith("- "):
                    enabled.append(line.strip()[2:].strip().strip("\"'"))
                    continue
                if line and not line.startswith(" "):
                    break
                if line.startswith("  ") and not line.strip().startswith("-"):
                    if not line.strip().startswith("#"):
                        break
        return {"plugins": {"enabled": enabled}, "_fallback": True}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return data if isinstance(data, dict) else {}


def check(name: str, ok: bool, detail: str, required: bool, results: list) -> None:
    level = "PASS" if ok else ("FAIL" if required else "WARN")
    results.append((level, name, detail, required))
    print(f"{level}  {name}: {detail}")


def docker_cat(container: str, path: str) -> str | None:
    try:
        out = subprocess.check_output(
            ["docker", "exec", container, "cat", path],
            stderr=subprocess.DEVNULL,
            timeout=15,
        )
        return out.decode("utf-8", "replace")
    except Exception:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--docker",
        action="store_true",
        help="Read config/session from running Hermes container",
    )
    ap.add_argument(
        "--container",
        default=os.environ.get("HERMES_CONTAINER", "hermes"),
        help="Docker container name (default hermes; prod often nsoft3-hermes)",
    )
    args = ap.parse_args()
    results: list = []

    home = Path(os.environ.get("HERMES_HOME") or DEFAULT_HOME)
    config_path = home / "config.yaml"
    session_dir = home / "platforms" / "whatsapp" / "session"

    config_text = None
    if args.docker:
        config_text = docker_cat(args.container, "/opt/data/config.yaml")
        if config_text is None:
            check(
                "docker-config",
                False,
                f"cannot read /opt/data/config.yaml from {args.container}",
                True,
                results,
            )
            return 1
        tmp = home / ".health-config-cache.yaml"
        tmp.parent.mkdir(parents=True, exist_ok=True)
        tmp.write_text(config_text, encoding="utf-8")
        config_path = tmp
        # session perms via docker stat
        try:
            mode_s = subprocess.check_output(
                [
                    "docker",
                    "exec",
                    args.container,
                    "stat",
                    "-c",
                    "%a",
                    "/opt/data/platforms/whatsapp/session",
                ],
                stderr=subprocess.DEVNULL,
                timeout=10,
            ).decode().strip()
            mode = int(mode_s, 8) if mode_s.isdigit() else 0
            world = bool(mode & 0o007)
            check(
                "session-chmod",
                not world and mode != 0,
                f"session dir mode {mode_s} (want 700, not world-readable)",
                False,
                results,
            )
        except Exception:
            check(
                "session-chmod",
                False,
                "session dir missing or unreadable in container",
                False,
                results,
            )
    else:
        check(
            "hermes-home",
            home.is_dir(),
            str(home),
            True,
            results,
        )
        if not home.is_dir():
            return 1
        check(
            "config.yaml",
            config_path.is_file(),
            str(config_path),
            True,
            results,
        )
        if session_dir.is_dir():
            mode = stat.S_IMODE(session_dir.stat().st_mode)
            world = bool(mode & (stat.S_IROTH | stat.S_IWOTH | stat.S_IXOTH))
            check(
                "session-chmod",
                not world,
                f"mode {oct(mode)} (Hermes BP: chmod 700)",
                False,
                results,
            )
        else:
            check(
                "session-chmod",
                False,
                f"missing {session_dir} (ok before first pair)",
                False,
                results,
            )

    if not config_path.is_file() and config_text is None:
        return 1

    data = load_yaml(config_path)
    plugins = data.get("plugins") or {}
    enabled = plugins.get("enabled") or []
    if isinstance(enabled, str):
        enabled = [enabled]
    if not isinstance(enabled, list):
        enabled = []
    enabled_norm = [str(x).strip() for x in enabled]

    for name in REQUIRED_PLUGINS:
        check(
            f"plugin:{name}",
            name in enabled_norm,
            f"plugins.enabled={enabled_norm!r}",
            True,
            results,
        )

    display = data.get("display") or {}
    tp = display.get("tool_progress")
    platforms = (display.get("platforms") or {}) if isinstance(display, dict) else {}
    wa = (platforms.get("whatsapp") or {}) if isinstance(platforms, dict) else {}
    wa_tp = wa.get("tool_progress") if isinstance(wa, dict) else None
    silenced = str(tp).lower() in ("off", "false", "0") or str(wa_tp).lower() in (
        "off",
        "false",
        "0",
    )
    check(
        "tool-progress-silenced",
        silenced,
        f"display.tool_progress={tp!r} whatsapp.tool_progress={wa_tp!r} "
        "(prod should be off — run silence-hermes-wa-tools / deploy-kasir-tools)",
        False,
        results,
    )

    if data.get("_fallback"):
        check(
            "yaml-parser",
            True,
            "PyYAML missing — used fallback parser for plugins.enabled only",
            False,
            results,
        )

    failed = [r for r in results if r[0] == "FAIL"]
    print()
    if failed:
        print(f"FAILED {len(failed)} required check(s). See docs/hermes-gaps.md")
        return 1
    print("OK — required checks passed (see WARNs in docs/hermes-gaps.md)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
