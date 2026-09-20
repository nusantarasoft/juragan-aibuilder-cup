#!/usr/bin/env python3
"""Multimodal gate smoke for kasir-pipe (OFF refuse / ON pass-through).

Runs inside the Hermes container (or with HERMES_HOME + plugins on path).
Sends a real refuse WhatsApp text on OFF when --send is set.

Usage:
  docker exec -e HERMES_HOME=/opt/data nsoft3-hermes \\
    python3 /opt/data/plugins/../multimodal-smoke.py off --phone 6287859031592 --send
  docker exec … python3 /opt/data/multimodal-smoke.py on --phone 6287859031592
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import types
from pathlib import Path


def load_pipe(root: Path):
    pkg = types.ModuleType("kasir_pipe")
    pkg.__path__ = [str(root)]
    sys.modules["kasir_pipe"] = pkg
    spec = importlib.util.spec_from_file_location(
        "kasir_pipe.__init__",
        root / "__init__.py",
        submodule_search_locations=[str(root)],
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    mod.__package__ = "kasir_pipe"
    sys.modules["kasir_pipe.__init__"] = mod
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("mode", choices=("off", "on"))
    ap.add_argument("--phone", default="6287859031592")
    ap.add_argument(
        "--send",
        action="store_true",
        help="OFF mode: actually send refuse text via bridge (default: capture only)",
    )
    ap.add_argument(
        "--plugin-root",
        default="/opt/data/plugins/kasir-pipe",
    )
    args = ap.parse_args()
    phone = "".join(c for c in args.phone if c.isdigit())
    chat = f"{phone}@s.whatsapp.net"

    # Align env with mode under test
    os.environ["KASIR_MULTIMODAL"] = "1" if args.mode == "on" else "0"

    mod = load_pipe(Path(args.plugin_root))
    print("env", os.environ.get("KASIR_MULTIMODAL"))
    print("flag_on", mod._multimodal_enabled())

    class Ev:
        internal = False
        message_type = "photo"
        media_urls = ["/tmp/smoke-nota.jpg"]
        media_types = ["image/jpeg"]

    mod._platform_name = lambda e: "whatsapp"
    mod._platforms = lambda: {"whatsapp"}
    mod._chat_id = lambda e: chat

    sent: list[str] = []
    if args.mode == "on":
        mod._sender_allowed = lambda s: True
        mod._resolve_sender_phone = lambda s: phone
        mod._stamp_active_sender = lambda **kw: None
        mod._send_wa_text = lambda c, t, gateway=None: sent.append(t)
        out = mod._on_pre_gateway_dispatch(Ev(), gateway=None)
        print("result", out)
        print("sent_count", len(sent))
        if out is not None:
            print("FAIL: ON must pass through (result None)")
            return 1
        if sent:
            print("FAIL: ON must not send refuse")
            return 1
        print("PASS ON pass-through")
        return 0

    # OFF
    if not args.send:
        mod._send_wa_text = lambda c, t, gateway=None: sent.append(t)
    out = mod._on_pre_gateway_dispatch(Ev(), gateway=None)
    print("result", out)
    if not (isinstance(out, dict) and out.get("action") == "skip"):
        print("FAIL: OFF must skip")
        return 1
    if "media refused" not in str(out.get("reason", "")):
        print("FAIL: OFF reason missing media refused")
        return 1
    if not args.send:
        print("sent_count", len(sent))
        if not sent or "ketik" not in sent[0].lower():
            print("FAIL: OFF must queue refuse text")
            return 1
        print("sent0", sent[0][:100])
    print("PASS OFF refuse")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
