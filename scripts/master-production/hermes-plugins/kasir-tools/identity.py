"""Shared WhatsApp sender identity between kasir-pipe and kasir-tools.

kasir-pipe writes the current allowlisted sender before the agent runs.
kasir-tools reads it when tool kwargs lack a JID (Hermes tool hooks often omit chat_id).
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any

_RUNTIME = Path(os.environ.get("KASIR_IDENTITY_DIR") or "/opt/data/runtime")
_PATH = _RUNTIME / "kasir_active_sender.json"
_MAX_AGE_SEC = 180.0


def _digits(value: str) -> str:
    head = (value or "").split("@", 1)[0].split(":", 1)[0]
    return "".join(ch for ch in head if ch.isdigit())


def remember_sender(*, chat_id: str, phone: str) -> None:
    phone_d = _digits(phone)
    chat_d = _digits(chat_id)
    if len(phone_d) < 8:
        return
    _RUNTIME.mkdir(parents=True, exist_ok=True)
    payload = {
        "phone": phone_d,
        "chat": chat_d or chat_id,
        "chat_raw": chat_id,
        "ts": time.time(),
    }
    # Atomic replace
    fd, tmp = tempfile.mkstemp(dir=str(_RUNTIME), prefix="kasir_sender_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh)
        os.replace(tmp, _PATH)
    except Exception:
        try:
            os.unlink(tmp)
        except Exception:
            pass
        raise


def read_sender(max_age_sec: float = _MAX_AGE_SEC) -> str:
    try:
        raw = _PATH.read_text(encoding="utf-8")
        data: dict[str, Any] = json.loads(raw)
    except Exception:
        return ""
    ts = float(data.get("ts") or 0)
    if ts <= 0 or (time.time() - ts) > max_age_sec:
        return ""
    phone = _digits(str(data.get("phone") or ""))
    return phone if len(phone) >= 8 else ""
