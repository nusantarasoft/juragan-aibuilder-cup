"""Shared WhatsApp sender identity between kasir-pipe and kasir-tools.

kasir-pipe stamps each allowlisted inbound chat before the agent runs.
kasir-tools reads the stamp when tool kwargs lack a JID.

File format (v2): multiple concurrent chats, keyed by chat id — not a single
global "active" phone (that raced under multi-owner traffic on one WA number).

  {
    "v": 2,
    "by_chat": {
      "<chat_raw_or_digits>": {"phone": "628…", "chat_raw": "…", "ts": 123.0}
    }
  }

read_sender():
  - with chat_id → that chat's phone if fresh
  - with phone hint → confirm that phone still has a fresh stamp
  - with neither → only if exactly one fresh entry (else "" fail-closed)
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
_MAX_ENTRIES = 64


def _digits(value: str) -> str:
    head = (value or "").split("@", 1)[0].split(":", 1)[0]
    return "".join(ch for ch in head if ch.isdigit())


def _chat_key(chat_id: str) -> str:
    raw = (chat_id or "").strip()
    dig = _digits(raw)
    # Prefer stable digits when present; keep raw for @lid / non-digit JIDs.
    if len(dig) >= 8:
        return dig
    return raw or dig


def _load() -> dict[str, Any]:
    try:
        data = json.loads(_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"v": 2, "by_chat": {}}
    if not isinstance(data, dict):
        return {"v": 2, "by_chat": {}}
    # Migrate v1 single-stamp → v2 map
    if "by_chat" not in data and data.get("phone"):
        phone = _digits(str(data.get("phone") or ""))
        chat_raw = str(data.get("chat_raw") or data.get("chat") or phone)
        key = _chat_key(chat_raw) or phone
        return {
            "v": 2,
            "by_chat": {
                key: {
                    "phone": phone,
                    "chat_raw": chat_raw,
                    "ts": float(data.get("ts") or 0),
                }
            },
        }
    by_chat = data.get("by_chat")
    if not isinstance(by_chat, dict):
        by_chat = {}
    return {"v": 2, "by_chat": by_chat}


def _save(data: dict[str, Any]) -> None:
    _RUNTIME.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(_RUNTIME), prefix="kasir_sender_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False)
        os.replace(tmp, _PATH)
    except Exception:
        try:
            os.unlink(tmp)
        except Exception:
            pass
        raise


def _prune(by_chat: dict[str, Any], *, now: float, max_age: float) -> dict[str, Any]:
    fresh: dict[str, Any] = {}
    for key, row in by_chat.items():
        if not isinstance(row, dict):
            continue
        ts = float(row.get("ts") or 0)
        if ts <= 0 or (now - ts) > max_age:
            continue
        phone = _digits(str(row.get("phone") or ""))
        if len(phone) < 8:
            continue
        fresh[str(key)] = {
            "phone": phone,
            "chat_raw": str(row.get("chat_raw") or key),
            "ts": ts,
        }
    if len(fresh) <= _MAX_ENTRIES:
        return fresh
    # Keep newest
    ordered = sorted(fresh.items(), key=lambda kv: float(kv[1].get("ts") or 0), reverse=True)
    return dict(ordered[:_MAX_ENTRIES])


def remember_sender(*, chat_id: str, phone: str) -> None:
    phone_d = _digits(phone)
    if len(phone_d) < 8:
        return
    key = _chat_key(chat_id) or phone_d
    now = time.time()
    data = _load()
    by_chat = dict(data.get("by_chat") or {})
    by_chat[key] = {
        "phone": phone_d,
        "chat_raw": (chat_id or "").strip() or key,
        "ts": now,
    }
    # Also index by phone digits so LID→phone remaps still find a stamp.
    by_chat[phone_d] = {
        "phone": phone_d,
        "chat_raw": (chat_id or "").strip() or phone_d,
        "ts": now,
    }
    data["by_chat"] = _prune(by_chat, now=now, max_age=_MAX_AGE_SEC)
    data["v"] = 2
    _save(data)


def read_sender(
    max_age_sec: float = _MAX_AGE_SEC,
    *,
    chat_id: str | None = None,
    phone: str | None = None,
) -> str:
    """Return stamped phone digits, or "" if unknown / ambiguous."""
    now = time.time()
    data = _load()
    by_chat = _prune(dict(data.get("by_chat") or {}), now=now, max_age=max_age_sec)

    chat_k = _chat_key(chat_id or "")
    if chat_k and chat_k in by_chat:
        return str(by_chat[chat_k]["phone"])

    phone_d = _digits(phone or "")
    if len(phone_d) >= 8 and phone_d in by_chat:
        return str(by_chat[phone_d]["phone"])

    if chat_k or len(phone_d) >= 8:
        # Explicit hint missed — do not guess another tenant.
        return ""

    # No hint: only safe if exactly one distinct fresh phone.
    phones = {str(row["phone"]) for row in by_chat.values()}
    if len(phones) == 1:
        return next(iter(phones))
    return ""
