"""Best-effort WA turn mirror + human takeover probe (Nest /internal)."""

from __future__ import annotations

import json
import logging
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Optional

logger = logging.getLogger("hermes.plugins.kasir-pipe.wa_sync")

_HANDOFF_CACHE: tuple[float, dict[str, tuple[bool, Optional[str]]]] = (0.0, {})
_DEFAULT_TURN_URL = "http://middleware:4001/internal/wa-turn"
_DEFAULT_HANDOFF_URL = "http://middleware:4001/internal/wa-handoff"


def _digits(value: str) -> str:
    head = (value or "").split("@", 1)[0].split(":", 1)[0]
    return re.sub(r"\D", "", head)


def _internal_key() -> str:
    return (os.environ.get("KASIR_CONSULT_KEY") or "").strip()


def _turn_url() -> str:
    return (os.environ.get("KASIR_WA_TURN_URL") or _DEFAULT_TURN_URL).strip() or _DEFAULT_TURN_URL


def _handoff_url() -> str:
    return (os.environ.get("KASIR_WA_HANDOFF_URL") or _DEFAULT_HANDOFF_URL).strip() or _DEFAULT_HANDOFF_URL


def _handoff_ttl_sec() -> float:
    try:
        return float(os.environ.get("KASIR_WA_HANDOFF_CACHE_SEC") or "8")
    except Exception:
        return 8.0


def _post_json(url: str, payload: dict[str, Any], timeout: float = 6.0) -> None:
    key = _internal_key()
    if not key:
        return
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Kasir-Consult-Key": key,
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if int(resp.status) >= 400:
            raise RuntimeError(f"HTTP {resp.status}")


def _get_handoff(phone: str) -> tuple[bool, Optional[str]]:
    key = _internal_key()
    if not key or len(_digits(phone)) < 8:
        return False, None
    q = urllib.parse.urlencode({"phone": _digits(phone)})
    url = f"{_handoff_url()}?{q}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"X-Kasir-Consult-Key": key},
    )
    with urllib.request.urlopen(req, timeout=6) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    data = json.loads(raw) if raw.strip() else {}
    if not isinstance(data, dict):
        return False, None
    active = bool(data.get("active"))
    until = data.get("until")
    return active, str(until) if until else None


def handoff_active(phone: str) -> bool:
    """Cached GET /internal/wa-handoff — False on any error (fail-open for WA delivery)."""
    dig = _digits(phone)
    if len(dig) < 8:
        return False
    global _HANDOFF_CACHE
    now = time.time()
    cached_at, cache = _HANDOFF_CACHE
    ttl = _handoff_ttl_sec()
    if (now - cached_at) < ttl and dig in cache:
        return cache[dig][0]
    active = False
    until: Optional[str] = None
    try:
        active, until = _get_handoff(dig)
    except Exception as exc:
        logger.warning("wa_sync: handoff probe failed phone=%s: %s", dig, exc)
    cache = dict(cache)
    cache[dig] = (active, until)
    _HANDOFF_CACHE = (now, cache)
    return active


def record_turn_async(
    *,
    phone: str,
    chat_id: str,
    author_kind: str,
    body_text: str,
) -> None:
    """Fire-and-forget POST /internal/wa-turn."""

    def _run() -> None:
        try:
            text = (body_text or "").strip()
            if not text:
                return
            _post_json(
                _turn_url(),
                {
                    "phone": _digits(phone),
                    "chat_id": chat_id,
                    "author_kind": author_kind,
                    "body_text": text,
                },
            )
        except Exception as exc:
            logger.warning("wa_sync: wa-turn failed: %s", exc)

    threading.Thread(target=_run, daemon=True).start()
