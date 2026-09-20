"""WA kurikulum consult — Hermes tool → Nest /internal/kasir-consult.

Feature flag ``KASIR_CONSULT`` (default off). Always registered; OFF returns
fixed copy without HTTP (eng-review D7).
"""

from __future__ import annotations

import json
import logging
import os
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
_DEFAULT_URL = "http://middleware:4001/internal/kasir-consult"
_TIMEOUT_SEC = 30
_QUESTION_MAX = 500


def is_consult_enabled() -> bool:
    return os.environ.get("KASIR_CONSULT", "0").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def consult_url() -> str:
    return (os.environ.get("KASIR_CONSULT_URL") or _DEFAULT_URL).strip() or _DEFAULT_URL


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

        key = (os.environ.get("KASIR_CONSULT_KEY") or "").strip()
        if not key:
            logger.warning("kasir_consult: KASIR_CONSULT_KEY missing")
            return CONSULT_BUSY_COPY

        body = json.dumps({"question": question}).encode("utf-8")
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
            },
            "required": ["question"],
        },
    },
    handle_consult,
)
