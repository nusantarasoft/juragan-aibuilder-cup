"""WA kurikulum consult — Hermes tool → Nest /internal/kasir-consult.

Feature flag ``KASIR_CONSULT`` (default off). Always registered; OFF returns
fixed copy without HTTP (eng-review D7).

Optional ``phone`` is forwarded so Nest can inject a short kasir metrics
snapshot when ``KASIR_CONSULT_INJECT_METRICS=1`` (default off; L8-labeled).
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.request
from typing import Any

logger = logging.getLogger("hermes.plugins.kasir-tools.consult")

CONSULT_OFF_COPY = (
    "Konsultasi kurikulum belum aktif. Untuk data toko ketik cek stok / laporan."
)
CONSULT_BUSY_COPY = "Layanan konsultasi lagi sibuk. Coba lagi sebentar."
CONSULT_EMPTY_Q = (
    "Tulis pertanyaan setelah *tanya* / *konsultasi*, contoh: tanya cara atur modal."
)
CONSULT_LEDGER_REDIRECT_COPY = (
    "Untuk stok, jual-beli, atau laporan toko, ketik langsung *cek stok* / *jual* / "
    "*laporan* — itu data kasir, bukan dari buku kurikulum."
)
_DEFAULT_URL = "http://middleware:4001/internal/kasir-consult"
# Nest retrieve + OpenRouter synthesize often 15–35s; 30s caused false "sibuk" on WA.
_TIMEOUT_SEC = int(os.environ.get("KASIR_CONSULT_TIMEOUT_SEC") or "60")
_QUESTION_MAX = 500

_COACH_ALIASES = frozenset({"pendamping", "saran bisnis", "pendamping bisnis"})


def _normalize_pendamping_alias(question: str) -> str:
    t = (question or "").strip().lower()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"[.!?]+$", "", t).strip()
    return t


def is_coach_alias(question: str) -> bool:
    """Exact pendamping coach aliases — Nest coach mode (not kurikulum-only RAG)."""
    return _normalize_pendamping_alias(question) in _COACH_ALIASES


_LEDGER_RES = (
    re.compile(r"\bcek\s*stok\b", re.I),
    re.compile(r"\bstok\s+(mau\s+)?habis\b", re.I),
    re.compile(r"\bstok\s+menipis\b", re.I),
    re.compile(r"\bsisa\s+(stok|barang)\b", re.I),
    re.compile(r"\bberapa\s+stok\b", re.I),
    re.compile(r"\bstok\s+berapa\b", re.I),
    re.compile(r"\b(omzet|laporan|paling\s+laris|tutup\s+toko)\b", re.I),
    re.compile(r"\b(jual|ada\s+yang\s+beli)\s+\d", re.I),
    re.compile(r"^\s*(jual|belanja|restock|satu\s+lagi)\b", re.I),
)


def looks_like_kasir_ledger_question(question: str) -> bool:
    """L8: live store facts must not go through kurikulum RAG."""
    q = (question or "").strip().lower()
    if not q:
        return False
    bare = re.sub(r"^(tanya|konsultasi|pendamping)\s+", "", q, count=1, flags=re.I).strip()
    return any(r.search(bare) or r.search(q) for r in _LEDGER_RES)


def is_consult_enabled() -> bool:
    return os.environ.get("KASIR_CONSULT", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def consult_url() -> str:
    return (os.environ.get("KASIR_CONSULT_URL") or _DEFAULT_URL).strip() or _DEFAULT_URL


def _digits(raw: str) -> str:
    return re.sub(r"\D", "", raw or "")


def _resolve_phone_best_effort(params: dict[str, Any], kwargs: dict[str, Any]) -> str:
    """Phone for optional Nest metrics inject — never blocks consult."""
    explicit = _digits(str(params.get("phone") or ""))
    if len(explicit) >= 8:
        return explicit
    try:
        # Prefer package resolver when kasir-tools is fully loaded.
        from kasir_tools import _resolve_phone  # type: ignore

        phone = _resolve_phone(params, kwargs) or ""
        if len(_digits(phone)) >= 8:
            return _digits(phone)
    except Exception:
        pass
    try:
        from .identity import read_sender

        phone = read_sender() or ""
        if len(_digits(phone)) >= 8:
            return _digits(phone)
    except Exception:
        pass
    return ""


def handle_consult(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    """Tool handler — returns user-facing Indonesian text only."""
    try:
        if not is_consult_enabled():
            return CONSULT_OFF_COPY

        params = params or {}
        question = (
            params.get("question") or params.get("query") or params.get("text") or ""
        )
        if not isinstance(question, str):
            question = str(question or "")
        question = question.strip()[:_QUESTION_MAX]
        if not question:
            return CONSULT_EMPTY_Q

        coach_mode = is_coach_alias(question)

        if not coach_mode and looks_like_kasir_ledger_question(question):
            return CONSULT_LEDGER_REDIRECT_COPY

        key = (os.environ.get("KASIR_CONSULT_KEY") or "").strip()
        if not key:
            logger.warning("kasir_consult: KASIR_CONSULT_KEY missing")
            return CONSULT_BUSY_COPY

        payload: dict[str, Any] = {"question": question}
        phone = _resolve_phone_best_effort(params, kwargs)
        if coach_mode:
            payload["mode"] = "coach"
            if not phone:
                logger.warning("kasir_consult coach: phone missing")
                return CONSULT_BUSY_COPY
            payload["phone"] = phone
        elif phone:
            payload["phone"] = phone

        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            consult_url(),
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "X-Kasir-Consult-Key": key,
            },
        )
        with urllib.request.urlopen(req, timeout=_TIMEOUT_SEC) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        data = json.loads(raw) if raw.strip() else {}
        text = (data.get("text") if isinstance(data, dict) else "") or ""
        text = str(text).strip()
        if not text:
            return CONSULT_BUSY_COPY
        return text
    except Exception as err:
        logger.warning("kasir_consult failed: %s", err)
        return CONSULT_BUSY_COPY


TOOL_SPEC = (
    "kasir_consult",
    {
        "name": "kasir_consult",
        "description": (
            "Konsultasi bisnis / pendamping (bukan stok/omzet langsung). "
            "Exact *pendamping* / *saran bisnis* / *pendamping bisnis* → coach gabungan "
            "(angka toko + playbook). "
            "*tanya* / *konsultasi* + pertanyaan → kurikulum buku saja. "
            "Jangan pakai untuk cek stok / jual / laporan — itu tool kasir DB. "
            "Argumen: question = teks user (alias pendamping atau pertanyaan setelah tanya/konsultasi)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "Pertanyaan bisnis pemilik (Bahasa Indonesia).",
                },
                "phone": {
                    "type": "string",
                    "description": "Nomor toko (opsional; biasanya otomatis).",
                },
            },
            "required": ["question"],
        },
    },
    handle_consult,
)
