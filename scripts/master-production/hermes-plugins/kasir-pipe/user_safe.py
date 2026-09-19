"""User-facing text sanitizer for Hermes kasir WhatsApp copy.

Single source of truth for leak hardening (eng-review 2026-09-19).
Keep in sync with ``kasir-tools/user_safe.py`` (same content; plugins are separate trees).
"""

from __future__ import annotations

import re

# Tokens / patterns that must never reach WhatsApp users.
_DENY_RE = re.compile(
    r"("
    r"kasir_[a-z0-9_]+"
    r"|draft_id"
    r"|traceback"
    r"|urllib"
    r"|PGRST\d*"
    r"|HTTPError"
    r"|RuntimeError"
    r"|SUPABASE_"
    r"|Bearer\s+\S+"
    r"|https?://\S+"
    r"|/rest/v1/\S+"
    r"|\"unit_price\"\s*:"
    r"|file://\S+"
    r"|Exception:"
    r"|Error:\s*\d{3}"
    r"|status[=:]\s*\d{3}"
    r")",
    re.IGNORECASE,
)

_SAFE_BY_KIND: dict[str, str] = {
    "stock": "Gagal cek stok. Coba lagi sebentar ya.",
    "low_stock": "Gagal cek stok menipis. Coba lagi sebentar ya.",
    "products": "Gagal ambil daftar barang. Coba lagi sebentar ya.",
    "report": "Gagal buat laporan. Coba lagi sebentar ya.",
    "top": "Gagal ambil produk terlaris. Coba lagi sebentar ya.",
    "tenant": "Toko belum bisa diakses dari nomor ini. Coba lagi atau hubungi admin.",
    "draft_sale": "Gagal siapkan draft penjualan. Coba lagi sebentar ya.",
    "confirm_sale": "Gagal simpan penjualan. Coba lagi sebentar ya.",
    "draft_purchase": "Gagal siapkan draft belanja. Coba lagi sebentar ya.",
    "confirm_purchase": "Gagal simpan belanja. Coba lagi sebentar ya.",
    "registration": "Sistem daftar sedang sibuk. Coba lagi sebentar, atau hubungi admin.",
    "generic": "Sistem kasir sedang sibuk. Coba lagi sebentar ya.",
}

_MAX_REJECT_REASON = 120


def looks_unsafe(text: str) -> bool:
    return bool(text and _DENY_RE.search(text))


def sanitize_user_text(text: str, *, fallback: str | None = None) -> str:
    """Return text unchanged if clean; otherwise a short Indonesian fallback."""
    raw = text if isinstance(text, str) else str(text or "")
    if not raw.strip():
        return raw
    if looks_unsafe(raw):
        return fallback or _SAFE_BY_KIND["generic"]
    return raw


def safe_user_error(kind: str = "generic") -> str:
    return _SAFE_BY_KIND.get(kind) or _SAFE_BY_KIND["generic"]


def sanitize_reject_reason(reason: str | None) -> str | None:
    """Cap length and strip denylist patterns from admin reject reasons."""
    if reason is None:
        return None
    text = str(reason).strip()
    if not text:
        return None
    if looks_unsafe(text):
        return None
    if len(text) > _MAX_REJECT_REASON:
        text = text[: _MAX_REJECT_REASON - 1].rstrip() + "…"
    if looks_unsafe(text):
        return None
    return text
