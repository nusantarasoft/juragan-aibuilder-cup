#!/usr/bin/env python3
"""Apply / check kasir Hermes posture for platform locks Q1–Q3.

Q1 multimodal ON uses Hermes gateway STT + image_input_mode (not WA toolsets).
Prod stays chat-only via KASIR_MULTIMODAL=0; this script only prepares STT/vision.

Usage:
  python3 scripts/master-production/hermes-kasir-platform-locks.py check
  python3 scripts/master-production/hermes-kasir-platform-locks.py apply
  HERMES_CONTAINER=nsoft3-hermes python3 … apply --docker
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_HOME = ROOT / "volumes" / "hermes"


def set_yaml_key(text: str, section: str, key: str, value: str) -> tuple[str, bool]:
    sec_re = re.compile(
        rf"(?ms)^({re.escape(section)}:\n)(.*?)(?=^[a-zA-Z_][\w]*:|\Z)"
    )
    m = sec_re.search(text)
    line = f"  {key}: {value}\n"
    if not m:
        return text.rstrip() + "\n\n" + f"{section}:\n" + line, True
    head, body = m.group(1), m.group(2)
    key_re = re.compile(rf"(?m)^  {re.escape(key)}:.*$")
    if key_re.search(body):
        body2 = key_re.sub(f"  {key}: {value}", body, count=1)
        return text[: m.start()] + head + body2 + text[m.end() :], body2 != body
    body2 = body + ("" if body.endswith("\n") else "\n") + line
    return text[: m.start()] + head + body2 + text[m.end() :], True


def apply_text(text: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    for section, key, value in (
        ("stt", "language", "id"),
        ("stt", "enabled", "true"),
        ("agent", "image_input_mode", "auto"),
    ):
        text, changed = set_yaml_key(text, section, key, value)
        if changed:
            notes.append(f"{section}.{key}={value}")
    return text, notes


def check_text(text: str) -> list[tuple[bool, str]]:
    out: list[tuple[bool, str]] = []
    stt_m = re.search(r"(?ms)^stt:\n(.*?)(?=^[a-zA-Z_]|\Z)", text)
    stt = stt_m.group(1) if stt_m else ""
    lang_m = re.search(r"(?m)^  language:\s*(\S+)", stt)
    lang = lang_m.group(1).strip().strip("\"'") if lang_m else ""
    out.append((lang in ("id", "id-ID"), f"stt.language={lang!r} (want id)"))
    en_m = re.search(r"(?m)^  enabled:\s*(\S+)", stt)
    en = (en_m.group(1).strip().lower() if en_m else "true")
    out.append((en in ("true", "1", "yes", "on", ""), f"stt.enabled={en!r}"))
    ag_m = re.search(r"(?ms)^agent:\n(.*?)(?=^[a-zA-Z_]|\Z)", text)
    ag = ag_m.group(1) if ag_m else ""
    im_m = re.search(r"(?m)^  image_input_mode:\s*(\S+)", ag)
    im = im_m.group(1).strip().strip("\"'") if im_m else "auto"
    out.append((im in ("auto", "native", "text"), f"agent.image_input_mode={im!r}"))
    return out


def docker_cat(container: str, path: str) -> str | None:
    try:
        out = subprocess.check_output(
            ["docker", "exec", container, "cat", path],
            stderr=subprocess.DEVNULL,
            timeout=20,
        )
        return out.decode("utf-8", "replace")
    except Exception:
        return None


def docker_write(container: str, path: str, text: str) -> None:
    """Write file via docker exec python (avoids host mount assumptions)."""
    import base64

    b64 = base64.b64encode(text.encode("utf-8")).decode("ascii")
    subprocess.check_call(
        [
            "docker",
            "exec",
            container,
            "python3",
            "-c",
            f"from pathlib import Path; Path({path!r}).write_text("
            f"__import__('base64').b64decode({b64!r}).decode(), encoding='utf-8')",
        ],
        timeout=30,
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("action", choices=("check", "apply"))
    ap.add_argument("--docker", action="store_true")
    ap.add_argument(
        "--container",
        default=os.environ.get("HERMES_CONTAINER", "nsoft3-hermes"),
    )
    ap.add_argument("--home", default=os.environ.get("HERMES_HOME", str(DEFAULT_HOME)))
    args = ap.parse_args()

    if args.docker:
        cfg_path = "/opt/data/config.yaml"
        text = docker_cat(args.container, cfg_path)
        if text is None:
            print("FAIL  cannot read container config", file=sys.stderr)
            return 1
        if args.action == "apply":
            text2, notes = apply_text(text)
            docker_write(args.container, cfg_path, text2)
            print("applied", ",".join(notes) or "noop")
            # Mirror to host volume if present (best-effort via container path is enough)
            text = text2
        failed = False
        for ok, detail in check_text(text):
            print(f"{'PASS' if ok else 'FAIL'}  {detail}")
            if not ok:
                failed = True
        soul = docker_cat(args.container, "/opt/data/SOUL.md") or ""
        soul_ok = (
            "kasir_get_stock" in soul
            and ("Foto / voice" in soul or "multimodal" in soul.lower())
            and "kasir_consult" in soul
        )
        print(
            f"{'PASS' if soul_ok else 'WARN'}  SOUL tools+multimodal+consult routing={soul_ok}"
        )
        mem = docker_cat(args.container, "/opt/data/MEMORY.md")
        print(
            f"{'PASS' if mem is None else 'WARN'}  MEMORY.md "
            f"{'absent' if mem is None else 'present (must not store ledger)'}"
        )
        return 1 if failed and args.action == "check" else 0

    cfg = Path(args.home) / "config.yaml"
    if not cfg.is_file():
        print(f"FAIL  missing {cfg}", file=sys.stderr)
        return 1
    text = cfg.read_text(encoding="utf-8", errors="replace")
    if args.action == "apply":
        text, notes = apply_text(text)
        cfg.write_text(text, encoding="utf-8")
        print("applied", ",".join(notes) or "noop")
    failed = False
    for ok, detail in check_text(text):
        print(f"{'PASS' if ok else 'FAIL'}  {detail}")
        if not ok:
            failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
