#!/usr/bin/env python3
"""Restore / verify Hermes kasir production posture (idempotent).

After hermes recreate, config.yaml can lose plugins.enabled, display silence,
or drift back to Hermes stock LLM (Claude Opus via OpenRouter). This script
re-applies the locked kasir posture without a full plugin redeploy.

Usage (on server):
  HERMES_HOME=/opt/nusantarasoft-3/volumes/hermes \\
    python3 scripts/master-production/hermes-kasir-posture.py apply
  HERMES_HOME=/opt/nusantarasoft-3/volumes/hermes \\
    python3 scripts/master-production/hermes-kasir-posture.py check

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
DEFAULT_HOME = Path(
    os.environ.get("HERMES_HOME") or (ROOT / "volumes" / "hermes")
)

# G16–G18 — UMKM kasir: never silent-drift to Claude Opus.
# Main = GLM for tools; vision = Qwen3.7 Flash (trial: murah + multimodal; eval OCR vs Qwen3-VL).
LOCKED_MODEL_DEFAULT = "z-ai/glm-5.3"
LOCKED_MODEL_PROVIDER = "openrouter"
LOCKED_MODEL_BASE_URL = "https://openrouter.ai/api/v1"
LOCKED_VISION_PROVIDER = "openrouter"
LOCKED_VISION_MODEL = "qwen/qwen3.7-flash"

PLUGINS_BLOCK = """plugins:
  enabled:
    - kasir-pipe
    - kasir-probe
    - kasir-tools
  disabled: []
  entries:
    kasir-probe:
      allow_tool_override: false
    kasir-tools:
      allow_tool_override: false
    kasir-pipe:
      allow_tool_override: false
"""

DISPLAY_DEFAULTS = {
    "tool_progress": "off",
    "interim_assistant_messages": "false",
    "show_commentary": "false",
    "tool_progress_command": "false",
    "cleanup_progress": "true",
    "long_running_notifications": "false",
    "busy_ack_detail": "false",
    "streaming": "false",
}

MODEL_BLOCK = f"""model:
  default: {LOCKED_MODEL_DEFAULT}
  provider: {LOCKED_MODEL_PROVIDER}
  base_url: {LOCKED_MODEL_BASE_URL}
"""

AUX_VISION_BLOCK = f"""auxiliary:
  vision:
    provider: {LOCKED_VISION_PROVIDER}
    model: {LOCKED_VISION_MODEL}
"""


def ensure_auxiliary_vision(text: str) -> tuple[str, bool]:
    """Force OpenRouter Gemma for foto annotate (main GLM is text-only)."""
    wanted = {
        "provider": LOCKED_VISION_PROVIDER,
        "model": LOCKED_VISION_MODEL,
    }
    m = re.search(r"(?ms)^(auxiliary:\n)(.*?)(?=^[a-zA-Z_][\w]*:|\Z)", text)
    if not m:
        text2 = text.rstrip() + "\n\n" + AUX_VISION_BLOCK
        return text2, True

    head, body = m.group(1), m.group(2)
    orig = body
    # Ensure vision: subsection
    if not re.search(r"(?m)^  vision:\s*$", body):
        body = body.rstrip("\n") + "\n  vision:\n"
        for k, v in wanted.items():
            body += f"    {k}: {v}\n"
    else:
        for k, v in wanted.items():
            pat = re.compile(
                rf"(?ms)(^  vision:\n(?:    .*\n)*?    {re.escape(k)}:\s*)\S*"
            )
            if pat.search(body):
                body = pat.sub(rf"\g<1>{v}", body, count=1)
            else:
                body = re.sub(
                    r"(?m)^(  vision:\s*)$",
                    rf"\1\n    {k}: {v}",
                    body,
                    count=1,
                )
    if not body.endswith("\n"):
        body += "\n"
    text2 = text[: m.start()] + head + body + text[m.end() :]
    return text2, body != orig or text2 != text


def _set_top(block: str, key: str, value: str) -> str:
    pat = re.compile(rf"(?m)^  {re.escape(key)}:.*$")
    line = f"  {key}: {value}"
    if pat.search(block):
        return pat.sub(line, block, count=1)
    return block.rstrip("\n") + f"\n{line}\n"


def ensure_plugins(text: str) -> tuple[str, bool]:
    if re.search(r"(?m)^plugins:\s*$", text):
        text2 = re.sub(
            r"(?ms)^plugins:\n.*?(?=^[a-zA-Z_]|\Z)",
            PLUGINS_BLOCK.rstrip() + "\n\n",
            text,
            count=1,
        )
    else:
        text2 = text.rstrip() + "\n\n" + PLUGINS_BLOCK
    return text2, text2 != text


def ensure_model_lock(text: str) -> tuple[str, bool]:
    """Force OpenRouter + locked main LLM (Hermes stock default is Claude Opus)."""
    wanted = {
        "default": LOCKED_MODEL_DEFAULT,
        "provider": LOCKED_MODEL_PROVIDER,
        "base_url": LOCKED_MODEL_BASE_URL,
    }
    m = re.search(r"(?ms)^(model:\n)(.*?)(?=^[a-zA-Z_][\w]*:|\Z)", text)
    if not m:
        text2 = MODEL_BLOCK.rstrip() + "\n\n" + text.lstrip()
        return text2, True

    head, body = m.group(1), m.group(2)
    orig = body
    for k, v in wanted.items():
        body = _set_top(body, k, v)
    if not body.endswith("\n"):
        body += "\n"
    text2 = text[: m.start()] + head + body + text[m.end() :]
    return text2, body != orig or text2 != text


def parse_model_fields(text: str) -> dict[str, str]:
    """Return model.default / provider / base_url (best-effort without PyYAML)."""
    out: dict[str, str] = {}
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text) or {}
        model = data.get("model") or {}
        if isinstance(model, dict):
            for k in ("default", "provider", "base_url"):
                if model.get(k) is not None:
                    out[k] = str(model.get(k)).strip().strip("\"'")
            return out
    except Exception:
        pass
    m = re.search(r"(?ms)^model:\n(.*?)(?=^[a-zA-Z_]|\Z)", text)
    body = m.group(1) if m else ""
    for k in ("default", "provider", "base_url"):
        mm = re.search(rf"(?m)^  {k}:\s*(\S+)", body)
        if mm:
            out[k] = mm.group(1).strip().strip("\"'")
    return out


def ensure_display_silence(text: str) -> tuple[str, bool]:
    """Create display: if missing; force tool_progress off + key silence flags."""
    m = re.search(r"(?ms)^(display:\n)(.*?)(?=^[a-zA-Z_][\w]*:|\Z)", text)
    if not m:
        body = ""
        for k, v in DISPLAY_DEFAULTS.items():
            body += f"  {k}: {v}\n"
        body += "  platforms:\n    whatsapp:\n      tool_progress: off\n"
        text2 = text.rstrip() + "\n\ndisplay:\n" + body + "\n"
        return text2, True

    head, body = m.group(1), m.group(2)
    orig = body
    for k, v in DISPLAY_DEFAULTS.items():
        body = _set_top(body, k, v)

    # platforms.whatsapp.tool_progress under display (Hermes layout variant)
    if re.search(r"(?m)^  platforms:\s*$", body):
        if re.search(r"(?m)^    whatsapp:\s*$", body):
            if re.search(
                r"(?ms)^    whatsapp:\n(?:      .*\n)*?      tool_progress:",
                body,
            ):
                body = re.sub(
                    r"(?ms)(^    whatsapp:\n(?:      .*\n)*?      tool_progress:\s*)\S*",
                    r"\1off",
                    body,
                    count=1,
                )
            else:
                body = re.sub(
                    r"(?m)^(    whatsapp:\s*)$",
                    r"\1\n      tool_progress: off",
                    body,
                    count=1,
                )
        else:
            body = re.sub(
                r"(?m)^(  platforms:\s*)$",
                r"\1\n    whatsapp:\n      tool_progress: off",
                body,
                count=1,
            )
    else:
        body = body.rstrip("\n") + "\n  platforms:\n    whatsapp:\n      tool_progress: off\n"

    if not body.endswith("\n"):
        body += "\n"
    text2 = text[: m.start()] + head + body + text[m.end() :]
    # Un-glue accidental offstt:
    text2 = text2.replace("tool_progress: offstt:", "tool_progress: off\nstt:")
    return text2, body != orig or text2 != text


def apply_config(path: Path) -> list[str]:
    notes: list[str] = []
    text = path.read_text(encoding="utf-8", errors="replace")
    text, ch = ensure_model_lock(text)
    if ch:
        notes.append("model.glm-lock")
    text, ch = ensure_auxiliary_vision(text)
    if ch:
        notes.append("auxiliary.vision.qwen37-flash")
    text, ch = ensure_plugins(text)
    if ch:
        notes.append("plugins.enabled")
    text, ch = ensure_display_silence(text)
    if ch:
        notes.append("display.silence")
    # Keep plugins after display edits
    text, ch = ensure_plugins(text)
    if ch:
        notes.append("plugins.reassert")
    # Re-assert model + vision last — other rewrites must not drift LLM back to Claude.
    text, ch = ensure_model_lock(text)
    if ch:
        notes.append("model.reassert")
    text, ch = ensure_auxiliary_vision(text)
    if ch:
        notes.append("auxiliary.vision.reassert")
    path.write_text(text, encoding="utf-8")
    return notes


def check_config(path: Path) -> list[tuple[bool, str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    out: list[tuple[bool, str]] = []
    plugins: list[str] = []
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text) or {}
        raw = (data.get("plugins") or {}).get("enabled") or []
        if isinstance(raw, list):
            plugins = [str(x).strip() for x in raw if str(x).strip()]
    except Exception:
        m = re.search(
            r"(?ms)^plugins:\n  enabled:\n((?:    - .*\n)+)",
            text,
        )
        if m:
            plugins = [
                ln.strip()[2:].strip()
                for ln in m.group(1).splitlines()
                if ln.strip().startswith("- ")
            ]
    out.append(
        (
            "kasir-pipe" in plugins and "kasir-tools" in plugins,
            f"plugins.enabled={plugins}",
        )
    )
    # display.tool_progress — accept off/false/0
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text) or {}
        disp = data.get("display") or {}
        val = str(disp.get("tool_progress", "")).strip().lower()
    except Exception:
        m = re.search(r"(?ms)^display:\n(.*?)(?=^[a-zA-Z_]|\Z)", text)
        body = m.group(1) if m else ""
        tp = re.search(r"(?m)^  tool_progress:\s*(\S+)", body)
        val = (tp.group(1).strip().strip("\"'").lower() if tp else "")
    out.append((val in ("off", "false", "0"), f"display.tool_progress={val!r}"))

    model = parse_model_fields(text)
    model_ok = (
        model.get("default") == LOCKED_MODEL_DEFAULT
        and model.get("provider") == LOCKED_MODEL_PROVIDER
        and model.get("base_url") == LOCKED_MODEL_BASE_URL
    )
    out.append(
        (
            model_ok,
            f"model.default={model.get('default')!r} "
            f"provider={model.get('provider')!r} "
            f"base_url={model.get('base_url')!r} "
            f"(want {LOCKED_MODEL_DEFAULT} / {LOCKED_MODEL_PROVIDER})",
        )
    )
    # auxiliary.vision
    vis_provider = vis_model = ""
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(text) or {}
        vis = ((data.get("auxiliary") or {}).get("vision") or {})
        if isinstance(vis, dict):
            vis_provider = str(vis.get("provider") or "").strip().strip("\"'")
            vis_model = str(vis.get("model") or "").strip().strip("\"'")
    except Exception:
        m = re.search(r"(?ms)^auxiliary:\n(.*?)(?=^[a-zA-Z_]|\Z)", text)
        body = m.group(1) if m else ""
        pm = re.search(r"(?m)^    provider:\s*(\S+)", body)
        mm = re.search(r"(?m)^    model:\s*(\S+)", body)
        vis_provider = pm.group(1).strip().strip("\"'") if pm else ""
        vis_model = mm.group(1).strip().strip("\"'") if mm else ""
    vis_ok = (
        vis_provider == LOCKED_VISION_PROVIDER and vis_model == LOCKED_VISION_MODEL
    )
    out.append(
        (
            vis_ok,
            f"auxiliary.vision.provider={vis_provider!r} model={vis_model!r} "
            f"(want {LOCKED_VISION_PROVIDER} / {LOCKED_VISION_MODEL})",
        )
    )
    return out


def _run(cmd: list[str], timeout: int = 120) -> int:
    print(">>>", " ".join(cmd)[:200], flush=True)
    return subprocess.call(cmd, timeout=timeout)


def apply_side_scripts(*, docker: bool, container: str, home: Path) -> int:
    here = Path(__file__).resolve().parent
    env = os.environ.copy()
    if docker:
        env["HERMES_CONTAINER"] = container
        cmds = [
            [
                sys.executable,
                str(here / "hermes-wa-tool-allowlist.py"),
                "apply",
                "--docker",
                "--container",
                container,
            ],
            [
                sys.executable,
                str(here / "hermes-kasir-platform-locks.py"),
                "apply",
                "--docker",
                "--container",
                container,
            ],
        ]
    else:
        env["HERMES_HOME"] = str(home)
        cmds = [
            [sys.executable, str(here / "hermes-wa-tool-allowlist.py"), "apply"],
            [sys.executable, str(here / "hermes-kasir-platform-locks.py"), "apply"],
        ]
    rc = 0
    for cmd in cmds:
        code = subprocess.call(cmd, env=env, timeout=120)
        if code != 0:
            rc = code
    return rc


def sync_plugins_from_repo(home: Path) -> None:
    """Copy kasir plugins + SOUL from repo scripts into Hermes volume."""
    repo = ROOT
    plugins_src = repo / "scripts" / "master-production" / "hermes-plugins"
    dest = home / "plugins"
    dest.mkdir(parents=True, exist_ok=True)
    for name in ("kasir-tools", "kasir-pipe"):
        src = plugins_src / name
        if not src.is_dir():
            continue
        subprocess.check_call(["cp", "-a", str(src), str(dest / "")])
    soul = (
        repo
        / "scripts"
        / "master-production"
        / "hermes-home"
        / "SOUL.md"
    )
    if soul.is_file():
        (home / "SOUL.md").write_text(
            soul.read_text(encoding="utf-8"), encoding="utf-8"
        )
        print("synced SOUL.md + plugins", flush=True)


def harden_session_chmod(home: Path) -> None:
    """Baileys session dir should be 700 (Hermes BP / gap G6) — enforce on apply."""
    session = home / "platforms" / "whatsapp" / "session"
    if not session.is_dir():
        return
    try:
        session.chmod(0o700)
        print("session chmod 700", session, flush=True)
    except OSError as exc:
        print("WARN  session chmod failed:", exc, flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("action", choices=("apply", "check"))
    ap.add_argument("--docker", action="store_true")
    ap.add_argument(
        "--container",
        default=os.environ.get("HERMES_CONTAINER", "nsoft3-hermes"),
    )
    ap.add_argument("--home", default=str(DEFAULT_HOME))
    ap.add_argument(
        "--sync-plugins",
        action="store_true",
        help="Copy repo kasir-pipe/tools + SOUL into HERMES_HOME before apply",
    )
    ap.add_argument(
        "--skip-side",
        action="store_true",
        help="Skip allowlist + platform-locks scripts",
    )
    args = ap.parse_args()
    home = Path(args.home)

    if args.docker:
        # Config lives on host volume bind in prod; still prefer host path.
        cfg = home / "config.yaml"
        if not cfg.is_file():
            print(f"FAIL  missing {cfg} (host volume)", file=sys.stderr)
            return 1
    else:
        cfg = home / "config.yaml"
        if not cfg.is_file():
            print(f"FAIL  missing {cfg}", file=sys.stderr)
            return 1

    if args.action == "apply":
        if args.sync_plugins:
            sync_plugins_from_repo(home)
        harden_session_chmod(home)
        notes = apply_config(cfg)
        print("applied", ",".join(notes) or "noop", flush=True)
        if not args.skip_side:
            side = apply_side_scripts(
                docker=args.docker, container=args.container, home=home
            )
            if side != 0:
                print("WARN  side scripts exited", side, flush=True)

    failed = False
    for ok, detail in check_config(cfg):
        print(f"{'PASS' if ok else 'FAIL'}  {detail}")
        if not ok:
            failed = True

    # Health is authoritative for required checks when not --skip-side
    if args.action == "check" or not args.skip_side:
        env = os.environ.copy()
        env["HERMES_HOME"] = str(home)
        health = Path(__file__).resolve().parent / "hermes-kasir-health.py"
        code = subprocess.call([sys.executable, str(health)], env=env, timeout=60)
        if code != 0:
            failed = True

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
