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
_TIMEOUT_SEC = 30
_QUESTION_MAX = 500


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

        if looks_like_kasir_ledger_question(question):
            return CONSULT_LEDGER_REDIRECT_COPY

        key = (os.environ.get("KASIR_CONSULT_KEY") or "").strip()
        if not key:
            logger.warning("kasir_consult: KASIR_CONSULT_KEY missing")
            return CONSULT_BUSY_COPY

        payload: dict[str, Any] = {"question": question}
        phone = _resolve_phone_best_effort(params, kwargs)
        if phone:
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
            "Konsultasi bisnis dari buku kurikulum UKM (bukan stok/omzet toko). "
            "Panggil saat user diawali *tanya* / *konsultasi* / *pendamping* + "
            "pertanyaan bisnis (modal, harga jual konsep, manajemen usaha). "
            "Jangan pakai untuk cek stok / jual / laporan — itu tool kasir DB. "
            "Argumen: question = isi pertanyaan (boleh tanpa kata tanya)."
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
