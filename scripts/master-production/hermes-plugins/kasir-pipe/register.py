"""UMKM WhatsApp registration wizard (non-allowlisted senders).

Pure state machine + message builders. DB/send side effects live in kasir-pipe.
"""

from __future__ import annotations

import re
from typing import Any, Optional

# wizard_step values
STEP_ASK_STORE = "ask_store_name"
STEP_CONFIRM = "confirm_phone"
STEP_DONE = "done"

OPEN_STATUSES = frozenset({"draft", "pending"})


def normalize_phone(value: str) -> str:
    head = (value or "").split("@", 1)[0].split(":", 1)[0]
    return re.sub(r"\D", "", head)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def is_daftar(text: str) -> bool:
    t = normalize_text(text)
    return t in ("daftar", "daftar dulu", "mau daftar", "register", "signup")


def is_status(text: str) -> bool:
    return normalize_text(text) in ("status", "cek status", "status daftar")


def is_batal(text: str) -> bool:
    return normalize_text(text) in ("batal", "cancel", "batalkan")


def is_ya(text: str) -> bool:
    t = normalize_text(text)
    return t in ("ya", "iya", "y", "ok", "oke", "benar", "setuju", "yes")


def is_tidak(text: str) -> bool:
    t = normalize_text(text)
    return t in ("tidak", "nggak", "enggak", "no", "batal")


def msg_intro() -> str:
    return (
        "Halo! Ini *kasir WhatsApp* untuk warung UMKM.\n\n"
        "Ketik *DAFTAR* untuk mendaftarkan toko Anda, "
        "atau hubungi admin jika sudah punya akun."
    )


def msg_ask_store() -> str:
    return "Nama tokonya apa? (contoh: Warung Bu Ani)"


def msg_confirm(store: str, phone: str) -> str:
    return (
        f"Toko *{store}* akan didaftarkan dengan nomor *{phone}* sebagai pemilik.\n\n"
        "Ketik *YA* untuk kirim ke admin, atau *BATAL* untuk batalkan."
    )


def msg_pending(store: str) -> str:
    return (
        f"Draft *{store}* sudah dikirim.\n"
        "Tunggu approve admin (biasanya segera).\n"
        "Ketik *STATUS* untuk cek."
    )


def msg_status_pending(store: str | None) -> str:
    name = store or "toko Anda"
    return f"*{name}* masih menunggu approve admin. Ketik *STATUS* lagi nanti."


def msg_status_rejected(reason: str | None) -> str:
    try:
        from .user_safe import sanitize_reject_reason
    except ImportError:  # loaded as flat module in unit tests
        from user_safe import sanitize_reject_reason

    base = "Pendaftaran ditolak admin."
    clean = sanitize_reject_reason(reason)
    if clean:
        return f"{base} Alasan: {clean}\nKetik *DAFTAR* untuk coba lagi."
    return f"{base}\nKetik *DAFTAR* untuk coba lagi."


def msg_status_approved(store: str | None) -> str:
    name = store or "Toko Anda"
    return f"*{name}* sudah aktif. Coba ketik: *cek stok* atau *laporan*."


def msg_status_none() -> str:
    return "Belum ada pendaftaran. Ketik *DAFTAR* untuk mulai."


def msg_expired() -> str:
    return "Draft daftar sudah kedaluwarsa. Ketik *DAFTAR* untuk mulai lagi."


def msg_cancelled() -> str:
    return "Pendaftaran dibatalkan. Ketik *DAFTAR* kalau mau mulai lagi."


def msg_need_active() -> str:
    return (
        "Nomor ini belum aktif sebagai kasir.\n"
        "Ketik *DAFTAR* untuk mendaftar, atau *STATUS* untuk cek antrean."
    )


def msg_system_busy() -> str:
    """Fallback when pipe hits an unexpected error (no silent skip)."""
    return (
        "Sistem daftar sedang sibuk. Coba lagi sebentar, "
        "atau hubungi admin."
    )


def msg_approved_notify(store: str) -> str:
    return (
        f"✅ Toko *{store}* sudah diaktifkan admin.\n"
        "Coba ketik: *cek stok* / *laporan* / *jual 1 [nama barang]*."
    )


def msg_rejected_notify(reason: str | None) -> str:
    try:
        from .user_safe import sanitize_reject_reason
    except ImportError:
        from user_safe import sanitize_reject_reason

    clean = sanitize_reject_reason(reason)
    if clean:
        return f"Pendaftaran ditolak: {clean}\nKetik *DAFTAR* untuk coba lagi."
    return "Pendaftaran ditolak admin.\nKetik *DAFTAR* untuk coba lagi."


def slugify_tenant(store_name: str) -> str:
    raw = re.sub(r"[^a-z0-9]+", "-", (store_name or "").strip().lower())
    raw = raw.strip("-")[:48] or "toko"
    return f"umkm-{raw}"


def advance_wizard(
    *,
    text: str,
    phone: str,
    row: Optional[dict[str, Any]],
) -> tuple[str, Optional[dict[str, Any]]]:
    """Return (reply_text, row_patch_or_None).

    ``row_patch`` keys merge into DB row. Special keys:
    - ``_action``: ``create`` | ``update`` | ``expire`` (caller interprets)
    If patch is None, only reply (no DB write).
    """
    phone = normalize_phone(phone)
    raw = (text or "").strip()

    if is_status(raw):
        if not row:
            return msg_status_none(), None
        status = str(row.get("status") or "")
        if status == "pending":
            return msg_status_pending(row.get("store_name")), None
        if status == "rejected":
            return msg_status_rejected(row.get("reject_reason")), None
        if status == "approved":
            return msg_status_approved(row.get("store_name")), None
        if status in ("expired", "draft") and row.get("wizard_step") == STEP_DONE:
            return msg_expired(), None
        if status == "draft":
            step = row.get("wizard_step")
            if step == STEP_ASK_STORE:
                return msg_ask_store(), None
            if step == STEP_CONFIRM:
                return msg_confirm(str(row.get("store_name") or ""), phone), None
        return msg_status_none(), None

    if is_batal(raw):
        if row and str(row.get("status")) in OPEN_STATUSES:
            return msg_cancelled(), {
                "_action": "update",
                "status": "rejected",
                "reject_reason": "Dibatalkan user",
                "wizard_step": STEP_DONE,
            }
        return msg_intro(), None

    if is_daftar(raw):
        if row and str(row.get("status")) == "pending":
            return msg_status_pending(row.get("store_name")), None
        if row and str(row.get("status")) == "draft":
            return msg_ask_store(), {
                "_action": "update",
                "wizard_step": STEP_ASK_STORE,
                "store_name": None,
            }
        return msg_ask_store(), {
            "_action": "create",
            "phone": phone,
            "status": "draft",
            "wizard_step": STEP_ASK_STORE,
            "store_name": None,
        }

    if not row or str(row.get("status")) not in OPEN_STATUSES:
        return msg_intro(), None

    step = str(row.get("wizard_step") or "")
    status = str(row.get("status") or "")

    if status == "pending":
        return msg_status_pending(row.get("store_name")), None

    if step == STEP_ASK_STORE:
        store = raw.strip()
        if len(store) < 2:
            return "Nama toko terlalu pendek. Coba lagi.", None
        if len(store) > 80:
            store = store[:80]
        return msg_confirm(store, phone), {
            "_action": "update",
            "store_name": store,
            "wizard_step": STEP_CONFIRM,
        }

    if step == STEP_CONFIRM:
        if is_ya(raw):
            store = str(row.get("store_name") or "").strip() or "Toko"
            return msg_pending(store), {
                "_action": "update",
                "status": "pending",
                "wizard_step": STEP_DONE,
            }
        if is_tidak(raw) or is_batal(raw):
            return msg_cancelled(), {
                "_action": "update",
                "status": "rejected",
                "reject_reason": "Dibatalkan user",
                "wizard_step": STEP_DONE,
            }
        return msg_confirm(str(row.get("store_name") or ""), phone), None

    return msg_need_active(), None
