#!/usr/bin/env python3
"""Kasir consult smoke — KASIR_CONSULT OFF refuse / ON Nest mock.

Local (no Docker):
  python3 scripts/master-production/hermes-consult-smoke.py off
  python3 scripts/master-production/hermes-consult-smoke.py on

Inside Hermes container (after posture sync):
  docker exec -e KASIR_CONSULT=0 nsoft3-hermes \\
    python3 /opt/data/plugins/../consult-smoke.py off
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
import types
from pathlib import Path
from unittest import mock


def _repo_plugin_root() -> Path:
    here = Path(__file__).resolve()
    # Container copy: /opt/data/consult-smoke.py → plugins next to it
    if (Path("/opt/data/plugins/kasir-tools") / "consult.py").is_file():
        return Path("/opt/data/plugins/kasir-tools")
    return here.parent / "hermes-plugins" / "kasir-tools"


def load_consult(root: Path):
    pkg = types.ModuleType("kasir_tools")
    pkg.__path__ = [str(root)]
    sys.modules["kasir_tools"] = pkg

    us_spec = importlib.util.spec_from_file_location(
        "kasir_tools.user_safe", root / "user_safe.py"
    )
    us = importlib.util.module_from_spec(us_spec)
    assert us_spec and us_spec.loader
    sys.modules["kasir_tools.user_safe"] = us
    us_spec.loader.exec_module(us)

    spec = importlib.util.spec_from_file_location(
        "kasir_tools.consult", root / "consult.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules["kasir_tools.consult"] = mod
    spec.loader.exec_module(mod)
    return mod


class _FakeResp:
    def __init__(self, payload: dict):
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("mode", choices=("off", "on"))
    ap.add_argument(
        "--plugin-root",
        default="",
        help="Path to kasir-tools (default: repo hermes-plugins/kasir-tools)",
    )
    args = ap.parse_args()
    root = Path(args.plugin_root) if args.plugin_root else _repo_plugin_root()
    if not (root / "consult.py").is_file():
        print(f"FAIL missing consult.py under {root}")
        return 1

    os.environ["KASIR_CONSULT"] = "1" if args.mode == "on" else "0"
    os.environ.setdefault("KASIR_CONSULT_KEY", "smoke-key")
    os.environ.setdefault(
        "KASIR_CONSULT_URL", "http://middleware:4001/internal/kasir-consult"
    )

    mod = load_consult(root)
    print("env", os.environ.get("KASIR_CONSULT"))
    print("flag_on", mod.is_consult_enabled())
    print("tool", mod.TOOL_SPEC[0])

    if mod.TOOL_SPEC[0] != "kasir_consult":
        print("FAIL tool name")
        return 1

    # Static: stock tools still in package (regression vs wiping register)
    init_text = (root / "__init__.py").read_text(encoding="utf-8")
    if "kasir_get_stock" not in init_text or "consult.TOOL_SPEC" not in init_text:
        print("FAIL __init__.py missing stock or consult registration")
        return 1
    print("PASS register wiring (stock + consult)")

    if args.mode == "off":
        with mock.patch.object(mod.urllib.request, "urlopen") as urlopen:
            out = mod.handle_consult({"question": "tanya cara atur modal"})
            print("out", out[:80])
            if out != mod.CONSULT_OFF_COPY:
                print("FAIL OFF copy mismatch")
                return 1
            if urlopen.called:
                print("FAIL OFF must not HTTP")
                return 1
        print("PASS OFF no-http + copy")
        return 0

    # ON
    with mock.patch.object(
        mod.urllib.request,
        "urlopen",
        return_value=_FakeResp(
            {"status": "hit", "text": "Pisahkan modal dari uang rumah. (dari buku Manajemen UKM)"}
        ),
    ) as urlopen:
        out = mod.handle_consult({"question": "gimana atur modal"})
        print("out", out[:100])
        if "modal" not in out.lower():
            print("FAIL ON hit text")
            return 1
        if not urlopen.called:
            print("FAIL ON must HTTP")
            return 1
        if urlopen.call_args.kwargs.get("timeout") != 30:
            print("FAIL timeout must be 30")
            return 1

    # Nest also off while Hermes on
    with mock.patch.object(
        mod.urllib.request,
        "urlopen",
        return_value=_FakeResp({"status": "off", "text": mod.CONSULT_OFF_COPY}),
    ):
        out2 = mod.handle_consult({"question": "tanya"})
        if out2 != mod.CONSULT_OFF_COPY:
            print("FAIL Nest-off passthrough")
            return 1
    print("PASS ON hit + Nest-off passthrough")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
