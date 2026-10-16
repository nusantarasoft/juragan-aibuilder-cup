"""Fase 2 write tools: draft + confirm sale/purchase (Hermes → Supabase).

Never writes without an explicit confirm tool call. Drafts live in-process
with a 15-minute TTL and are mirrored to the Hermes volume so `ya` survives
container recreate (KASIR_IDENTITY_DIR / kasir_drafts.json).
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import string
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, List, Optional, Tuple

from .user_safe import safe_user_error

logger = logging.getLogger("hermes.plugins.kasir-tools.writes")

_JAKARTA = timezone(timedelta(hours=7))
_DRAFT_TTL_SEC = 15 * 60
# draft_id -> draft dict (also persisted under Hermes volume)
_DRAFTS: dict[str, dict[str, Any]] = {}
_DRAFTS_LOADED = False


def _drafts_path() -> Path:
    override = (os.environ.get("KASIR_DRAFTS_PATH") or "").strip()
    if override:
        return Path(override)
    runtime = Path(os.environ.get("KASIR_IDENTITY_DIR") or "/opt/data/runtime")
    return runtime / "kasir_drafts.json"


def _ensure_drafts_loaded() -> None:
    """Load persisted drafts once per process (best-effort)."""
    global _DRAFTS_LOADED, _DRAFTS
    if _DRAFTS_LOADED:
        return
    _DRAFTS_LOADED = True
    path = _drafts_path()
    try:
        if not path.is_file():
            return
        raw = path.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else {}
        if isinstance(data, dict):
            # Only accept mapping of draft_id -> object
            loaded = {
                str(k): v
                for k, v in data.items()
                if isinstance(v, dict) and v.get("kind") in ("sale", "purchase")
            }
            _DRAFTS.update(loaded)
            logger.info("kasir drafts loaded count=%s path=%s", len(loaded), path)
    except Exception:
        logger.exception("kasir drafts load failed path=%s", path)


def _persist_drafts() -> None:
    """Atomic write of current draft map (best-effort; never raises to callers)."""
    _ensure_drafts_loaded()
    path = _drafts_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix="kasir_drafts_")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(_DRAFTS, fh, ensure_ascii=False)
            os.replace(tmp, path)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise
    except Exception:
        logger.exception("kasir drafts persist failed path=%s", path)


def _set_draft(draft_id: str, draft: dict[str, Any]) -> None:
    _ensure_drafts_loaded()
    _DRAFTS[draft_id] = draft
    _persist_drafts()


def _pop_draft(draft_id: str) -> None:
    _ensure_drafts_loaded()
    _DRAFTS.pop(draft_id, None)
    _persist_drafts()


def _send_confirm_poll(phone: str, title: str) -> bool:
    """Best-effort Ya/Batal poll via Baileys bridge. Fail-open → False (text fallback)."""
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) < 8:
        return False
    jid = f"{digits}@s.whatsapp.net"
    name = (title or "Konfirmasi").strip()[:200] or "Konfirmasi"
    # Bridge schema: chatId + question + options (not Nest-style name/values).
    payload = json.dumps(
        {
            "chatId": jid,
            "question": name,
            "options": ["Ya, simpan", "Batal"],
            "selectableCount": 1,
        }
    ).encode("utf-8")
    ports = [
        int(os.environ.get("WHATSAPP_BRIDGE_PORT") or "3000"),
        int(os.environ.get("KASIR_BRIDGE_PROXY_PORT") or "8765"),
    ]
    for port in ports:
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/send-poll",
                data=payload,
                method="POST",
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if int(resp.status) < 400:
                    return True
        except Exception:
            continue
    logger.info("kasir confirm poll unavailable phone=%s…", digits[-4:])
    return False


def _draft_confirm_footer(*, poll_sent: bool) -> str:
    if poll_sent:
        return (
            "Pilih *Ya, simpan* atau *Batal* di tombol di atas "
            "(atau ketik *ya* / *batal*)."
        )
    return (
        "Kalau sudah benar, balas *ya* untuk simpan. "
        "Kalau salah / batal, ketik *batal* atau kirim draft baru."
    )


_LAST_SALE_TTL_SEC = 24 * 60 * 60


def _last_sale_path() -> Path:
    override = (os.environ.get("KASIR_LAST_SALE_PATH") or "").strip()
    if override:
        return Path(override)
    runtime = Path(os.environ.get("KASIR_IDENTITY_DIR") or "/opt/data/runtime")
    return runtime / "kasir_last_sale.json"


def _load_last_sales() -> dict[str, Any]:
    path = _last_sale_path()
    try:
        if not path.is_file():
            return {}
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        logger.exception("kasir last_sale load failed")
        return {}


def _save_last_sales(data: dict[str, Any]) -> None:
    path = _last_sale_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix="kasir_last_sale_")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False)
            os.replace(tmp, path)
        except Exception:
            try:
                os.unlink(tmp)
            except OSError:
                pass
            raise
    except Exception:
        logger.exception("kasir last_sale persist failed")


def _last_sale_key(phone: str, tenant_id: str) -> str:
    digits = re.sub(r"\D", "", phone)
    return f"{digits}::{tenant_id}"


def _remember_last_sale(*, phone: str, tenant_id: str, items: list[dict[str, Any]]) -> None:
    if not items:
        return
    # Prefer first line item for "satu lagi" (typical single-SKU jual)
    first = items[0]
    payload = {
        "updated_at": time.time(),
        "phone": re.sub(r"\D", "", phone),
        "tenant_id": tenant_id,
        "items": [
            {
                "name": first.get("name"),
                "quantity": first.get("quantity"),
                "unit_price": first.get("unit_price"),
                "item_id": first.get("item_id"),
                "item_sku": first.get("item_sku"),
                "catalog_matched": first.get("catalog_matched"),
            }
        ],
    }
    data = _load_last_sales()
    data[_last_sale_key(phone, tenant_id)] = payload
    _save_last_sales(data)


def _get_last_sale(*, phone: str, tenant_id: str) -> dict[str, Any] | None:
    data = _load_last_sales()
    row = data.get(_last_sale_key(phone, tenant_id))
    if not isinstance(row, dict):
        return None
    updated = float(row.get("updated_at") or 0)
    if time.time() - updated > _LAST_SALE_TTL_SEC:
        return None
    items = row.get("items")
    if not isinstance(items, list) or not items:
        return None
    return row

_WithTenant = Callable[
    [Optional[dict], dict],
    Tuple[Optional[Tuple[str, str]], Optional[str]],
]
_ActiveProducts = Callable[[str], List[dict]]
_Idr = Callable[[Any], str]

_with_tenant: _WithTenant | None = None
_active_products: _ActiveProducts | None = None
_idr: _Idr | None = None


def bind(
    *,
    with_tenant: _WithTenant,
    active_products: _ActiveProducts,
    idr: _Idr,
) -> None:
    global _with_tenant, _active_products, _idr
    _with_tenant = with_tenant
    _active_products = active_products
    _idr = idr


def _purge_expired() -> None:
    _ensure_drafts_loaded()
    now = time.time()
    dead = [k for k, v in _DRAFTS.items() if now - float(v.get("created_at") or 0) > _DRAFT_TTL_SEC]
    if not dead:
        return
    for k in dead:
        _DRAFTS.pop(k, None)
    _persist_drafts()


def _find_draft(
    *,
    phone: str,
    kind: str,
    tenant_id: str,
    draft_id: str = "",
) -> tuple[str, dict[str, Any] | None]:
    """Resolve draft by optional id, else latest open draft for (phone, kind, tenant)."""
    _purge_expired()
    if draft_id:
        draft = _DRAFTS.get(draft_id)
        if (
            draft
            and draft.get("kind") == kind
            and draft.get("phone") == phone
            and draft.get("tenant_id") == tenant_id
        ):
            return draft_id, draft
    candidates = [
        (did, d)
        for did, d in _DRAFTS.items()
        if d.get("kind") == kind
        and d.get("phone") == phone
        and d.get("tenant_id") == tenant_id
    ]
    if not candidates:
        return "", None
    did, d = max(candidates, key=lambda item: float(item[1].get("created_at") or 0))
    return did, d

def _supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or "").rstrip("/")


def _service_key() -> str:
    return (
        os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()


def _sb(
    method: str,
    path: str,
    *,
    query: dict[str, str] | None = None,
    body: Any = None,
    prefer: str | None = None,
) -> Any:
    base = _supabase_url()
    key = _service_key()
    if not base or not key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY belum di-set")
    url = f"{base}/rest/v1/{path}"
    if query:
        url += "?" + urllib.parse.urlencode(query)
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            raw = resp.read().decode("utf-8", "replace")
            return json.loads(raw) if raw.strip() else None
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"HTTP {err.code} {path}: {detail}") from err


def _new_draft_id() -> str:
    return uuid.uuid4().hex[:12]


def _match_product(name: str, products: list[dict[str, Any]]) -> dict[str, Any] | None:
    q = (name or "").strip().lower()
    if not q:
        return None
    exact = [p for p in products if str(p.get("name") or "").lower() == q]
    if len(exact) == 1:
        return exact[0]
    partial = [
        p
        for p in products
        if q in str(p.get("name") or "").lower()
        or (p.get("sku") and q in str(p.get("sku")).lower())
    ]
    if len(partial) == 1:
        return partial[0]
    if partial:
        # Prefer shortest name containing query
        partial.sort(key=lambda p: len(str(p.get("name") or "")))
        return partial[0]
    return None


def _parse_items(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            return []
    if not isinstance(raw, list):
        return []
    out = []
    for it in raw:
        if not isinstance(it, dict):
            continue
        name = str(it.get("name") or it.get("product") or "").strip()
        try:
            qty = float(it.get("quantity") or it.get("qty") or 0)
        except Exception:
            qty = 0
        try:
            price = float(
                it.get("unit_price")
                or it.get("unitPrice")
                or it.get("price")
                or it.get("unit_cost")
                or it.get("unitCost")
                or 0
            )
        except Exception:
            price = 0
        if name and qty > 0 and price >= 0:
            # PostgREST/Postgres often typed quantity as integer on order lines.
            qty_out: float | int = int(qty) if float(qty).is_integer() else qty
            out.append({"name": name, "quantity": qty_out, "unit_price": price})
    return out


def _order_number() -> str:
    now = datetime.now(_JAKARTA)
    suffix = "".join(random.choices(string.digits, k=4))
    return f"WA-{now.strftime('%Y%m%d-%H%M%S')}-{suffix}"


def _purchase_number() -> str:
    now = datetime.now(_JAKARTA)
    suffix = "".join(random.choices(string.digits, k=4))
    return f"BL-{now.strftime('%Y%m%d')}-{suffix}"


def _as_qty(value: float | int) -> int | float:
    try:
        f = float(value)
    except Exception:
        return 0
    return int(f) if f.is_integer() else f


def _stock_move(
    tenant_id: str,
    *,
    item_id: str,
    movement_type: str,
    quantity: float,
    unit_cost: float,
    reference: str,
    reference_type: str,
    reference_id: str,
    notes: str,
) -> None:
    _sb(
        "POST",
        "inv_stock_movements",
        body={
            "tenant_id": tenant_id,
            "item_id": item_id,
            "variant_id": None,
            "warehouse_id": None,
            "movement_type": movement_type,
            "quantity": _as_qty(quantity),
            "unit_cost": unit_cost,
            "total_cost": unit_cost * abs(float(quantity)),
            "reference": reference,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "notes": notes,
        },
        prefer="return=minimal",
    )
    existing = _sb(
        "GET",
        "inv_stock_ledger",
        query={
            "select": "id,on_hand",
            "tenant_id": f"eq.{tenant_id}",
            "item_id": f"eq.{item_id}",
            "warehouse_id": "eq.default",
            "limit": "1",
        },
    )
    row = existing[0] if isinstance(existing, list) and existing else None
    inbound = movement_type in (
        "IN",
        "RETURN_IN",
        "ADJUST_IN",
        "PRODUCTION",
        "MANUAL_IN",
    )
    delta = abs(quantity) if inbound else -abs(quantity)
    if row:
        _sb(
            "PATCH",
            "inv_stock_ledger",
            query={"id": f"eq.{row['id']}"},
            body={
                "on_hand": float(row.get("on_hand") or 0) + delta,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            prefer="return=minimal",
        )
    else:
        _sb(
            "POST",
            "inv_stock_ledger",
            body={
                "tenant_id": tenant_id,
                "item_id": item_id,
                "variant_id": None,
                "warehouse_id": "default",
                "on_hand": max(0, delta),
                "reserved": 0,
                "committed": 0,
            },
            prefer="return=minimal",
        )


def handle_draft_sale(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        assert _with_tenant and _active_products and _idr
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        phone, tenant_id = resolved
        items = _parse_items(params.get("items"))
        if not items:
            return (
                "Draft penjualan belum lengkap. Sebutkan barang, jumlah, "
                "dan harga (contoh: jual 2 indomie 7000)."
            )
        products = _active_products(tenant_id)
        resolved_items = []
        for it in items:
            match = _match_product(it["name"], products)
            unit = it["unit_price"]
            if match and (not unit or unit <= 0):
                unit = float(match.get("selling_price") or 0)
            catalog = bool(match)
            resolved_items.append(
                {
                    "name": str(match.get("name") if match else it["name"]),
                    "quantity": it["quantity"],
                    "unit_price": unit,
                    "item_id": str(match["id"]) if match else None,
                    "item_sku": (match.get("sku") if match else None),
                    "catalog_matched": catalog,
                }
            )
        total = sum(r["quantity"] * r["unit_price"] for r in resolved_items)
        payment = (params.get("payment_method") or params.get("paymentMethod") or "").strip() or None
        customer = (params.get("customer_name") or params.get("customerName") or "").strip() or None
        _purge_expired()
        draft_id = _new_draft_id()
        _set_draft(
            draft_id,
            {
                "kind": "sale",
                "created_at": time.time(),
                "phone": phone,
                "tenant_id": tenant_id,
                "payment_method": payment,
                "customer_name": customer,
                "notes": (params.get("notes") or None),
                "items": resolved_items,
                "total": total,
            },
        )
        lines = [
            "📋 *Konfirmasi penjualan*",
            "",
        ]
        for r in resolved_items:
            mark = "" if r["catalog_matched"] else " _(belum match katalog)_"
            lines.append(
                f"• {r['quantity']:g} × {r['name']} @ {_idr(r['unit_price'])}{mark}"
            )
        poll_ok = _send_confirm_poll(phone, "Konfirmasi penjualan")
        lines += [
            "",
            f"Total: *{_idr(total)}*",
            f"Bayar: {payment or '(belum diisi)'}",
            "",
            _draft_confirm_footer(poll_sent=poll_ok),
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.exception("draft_sale failed: %s", exc)
        return safe_user_error("draft_sale")


def _is_paid(payment: str) -> bool:
    return bool(re.search(r"tunai|cash|transfer|qris|debit|paid|lunas", payment, re.I))


def handle_confirm_sale(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        assert _with_tenant and _idr
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        phone, tenant_id = resolved
        draft_id = str(params.get("draft_id") or params.get("draftId") or "").strip()
        draft_id, draft = _find_draft(
            phone=phone, kind="sale", tenant_id=tenant_id, draft_id=draft_id
        )
        if not draft or not draft_id:
            return "Draft penjualan tidak ditemukan / sudah kadaluarsa. Buat draft baru."
        items = draft["items"]
        total = float(draft["total"])
        payment = draft.get("payment_method")
        is_paid = bool(payment and _is_paid(payment))
        order_number = _order_number()
        order = _sb(
            "POST",
            "ecom_orders",
            body={
                "tenant_id": tenant_id,
                "order_number": order_number,
                "customer_name": draft.get("customer_name") or f"WA {phone}",
                "customer_phone": phone,
                "subtotal": total,
                "total_amount": total,
                "paid_amount": total if is_paid else 0,
                "payment_method": payment,
                "payment_status": "paid" if is_paid else "unpaid",
                "notes": draft.get("notes"),
                "source": "api",
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
            prefer="return=representation",
        )
        if isinstance(order, list):
            order = order[0] if order else None
        if not order or not order.get("id"):
            return "Gagal menyimpan order."
        order_id = str(order["id"])
        warnings = []
        for r in items:
            sku = r.get("item_sku") or (
                "WA-" + re.sub(r"\s+", "-", str(r["name"])[:20]).upper()
            )
            _sb(
                "POST",
                "ecom_order_items",
                body={
                    "order_id": order_id,
                    "item_id": r.get("item_id"),
                    "item_name": r["name"],
                    "item_sku": sku,
                    "quantity": _as_qty(r["quantity"]),
                    "unit_price": r["unit_price"],
                    "subtotal": r["quantity"] * r["unit_price"],
                    "status": "fulfilled",
                },
                prefer="return=minimal",
            )
            if r.get("item_id") and r.get("catalog_matched"):
                try:
                    _stock_move(
                        tenant_id,
                        item_id=r["item_id"],
                        movement_type="SALE_OUT",
                        quantity=r["quantity"],
                        unit_cost=r["unit_price"],
                        reference=order_number,
                        reference_type="ecom_order",
                        reference_id=order_id,
                        notes=f"UMKM WA: {r['quantity']} × {r['name']}",
                    )
                except Exception as stock_err:
                    logger.warning("stock deduct failed: %s", stock_err)
                    warnings.append(str(r["name"]))
        _pop_draft(draft_id)
        _remember_last_sale(phone=phone, tenant_id=tenant_id, items=items)
        lines = [
            "✅ *Penjualan tercatat*",
            f"No. {order_number}",
            f"Total: {_idr(total)}",
        ]
        if warnings:
            lines.append("Stok gagal dipotong untuk: " + ", ".join(warnings))
        lines.append("Mau ulang item yang sama? Ketik *satu lagi*.")
        return "\n".join(lines)
    except Exception as exc:
        logger.exception("confirm_sale failed: %s", exc)
        return safe_user_error("confirm_sale")


def handle_draft_purchase(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        assert _with_tenant and _active_products and _idr
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        phone, tenant_id = resolved
        items = _parse_items(params.get("items"))
        # unit_cost alias already handled in _parse_items via unit_price field
        if not items:
            return (
                "Draft belanja belum lengkap. Sebutkan barang, jumlah, "
                "dan harga modal (contoh: beli 10 indomie modal 3000)."
            )
        products = _active_products(tenant_id)
        resolved_items = []
        for it in items:
            match = _match_product(it["name"], products)
            resolved_items.append(
                {
                    "name": str(match.get("name") if match else it["name"]),
                    "quantity": it["quantity"],
                    "unit_cost": it["unit_price"],
                    "item_id": str(match["id"]) if match else None,
                    "catalog_matched": bool(match),
                }
            )
        total = sum(r["quantity"] * r["unit_cost"] for r in resolved_items)
        purchase_date = (
            str(params.get("purchase_date") or params.get("purchaseDate") or "").strip()
            or datetime.now(_JAKARTA).strftime("%Y-%m-%d")
        )
        supplier = (
            str(params.get("supplier_name") or params.get("supplierName") or "").strip()
            or None
        )
        _purge_expired()
        draft_id = _new_draft_id()
        _set_draft(
            draft_id,
            {
                "kind": "purchase",
                "created_at": time.time(),
                "phone": phone,
                "tenant_id": tenant_id,
                "purchase_date": purchase_date,
                "supplier_name": supplier,
                "notes": params.get("notes"),
                "items": resolved_items,
                "total": total,
            },
        )
        lines = [
            "📋 *Konfirmasi belanja*",
            f"Tanggal: {purchase_date}",
            f"Supplier: {supplier or '-'}",
            "",
        ]
        for r in resolved_items:
            mark = "" if r["catalog_matched"] else " _(belum match katalog)_"
            lines.append(
                f"• {r['quantity']:g} × {r['name']} @ {_idr(r['unit_cost'])}{mark}"
            )
        poll_ok = _send_confirm_poll(phone, "Konfirmasi belanja")
        lines += [
            "",
            f"Total: *{_idr(total)}*",
            "",
            _draft_confirm_footer(poll_sent=poll_ok),
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.exception("draft_purchase failed: %s", exc)
        return safe_user_error("draft_purchase")


def handle_confirm_purchase(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        assert _with_tenant and _idr
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        phone, tenant_id = resolved
        draft_id = str(params.get("draft_id") or params.get("draftId") or "").strip()
        draft_id, draft = _find_draft(
            phone=phone, kind="purchase", tenant_id=tenant_id, draft_id=draft_id
        )
        if not draft or not draft_id:
            return "Draft belanja tidak ditemukan / sudah kadaluarsa. Buat draft baru."
        purchase_number = _purchase_number()
        header = _sb(
            "POST",
            "studio_umkm_purchases",
            body={
                "tenant_id": tenant_id,
                "purchase_number": purchase_number,
                "purchase_date": draft["purchase_date"],
                "supplier_name": draft.get("supplier_name"),
                "total_cost": draft["total"],
                "notes": draft.get("notes"),
                "source": "whatsapp",
                "status": "completed",
            },
            prefer="return=representation",
        )
        if isinstance(header, list):
            header = header[0] if header else None
        if not header or not header.get("id"):
            return "Gagal menyimpan belanja."
        purchase_id = str(header["id"])
        for r in draft["items"]:
            _sb(
                "POST",
                "studio_umkm_purchase_items",
                body={
                    "purchase_id": purchase_id,
                    "item_id": r.get("item_id"),
                    "item_name": r["name"],
                    "quantity": _as_qty(r["quantity"]),
                    "unit_cost": r["unit_cost"],
                    "subtotal": r["quantity"] * r["unit_cost"],
                },
                prefer="return=minimal",
            )
            if r.get("item_id"):
                try:
                    _stock_move(
                        tenant_id,
                        item_id=r["item_id"],
                        movement_type="MANUAL_IN",
                        quantity=r["quantity"],
                        unit_cost=r["unit_cost"],
                        reference=purchase_number,
                        reference_type="umkm_purchase",
                        reference_id=purchase_id,
                        notes=f"Belanja WA {purchase_number}",
                    )
                except Exception as stock_err:
                    logger.warning("stock in failed: %s", stock_err)
        _pop_draft(draft_id)
        return "\n".join(
            [
                "✅ *Belanja tercatat*",
                f"No. {purchase_number}",
                f"Tanggal: {draft['purchase_date']}",
                f"Total: {_idr(draft['total'])}",
            ]
        )
    except Exception as exc:
        logger.exception("confirm_purchase failed: %s", exc)
        return safe_user_error("confirm_purchase")


def handle_repeat_last_sale(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    """Draft the same first line item as the last confirmed sale ("satu lagi")."""
    try:
        assert _with_tenant and _idr
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        phone, tenant_id = resolved
        last = _get_last_sale(phone=phone, tenant_id=tenant_id)
        if not last:
            return (
                "Belum ada penjualan terakhir untuk diulang. "
                "Sebutkan barangnya dulu (contoh: jual 1 indomie)."
            )
        items = last.get("items") or []
        draft_items = []
        for it in items:
            draft_items.append(
                {
                    "name": it.get("name"),
                    "quantity": it.get("quantity") or 1,
                    "unit_price": it.get("unit_price") or 0,
                }
            )
        return handle_draft_sale(
            {
                "phone": phone,
                "items": draft_items,
                "payment_method": params.get("payment_method")
                or params.get("paymentMethod"),
            },
            **kwargs,
        )
    except Exception as exc:
        logger.exception("repeat_last_sale failed: %s", exc)
        return safe_user_error("draft_sale")


WRITE_TOOL_SPECS: list[tuple[str, dict[str, Any], Callable[..., str]]] = [
    (
        "kasir_draft_sale",
        {
            "name": "kasir_draft_sale",
            "description": (
                "Siapkan draft penjualan (BELUM menulis ke database). "
                "Panggil saat user minta catat jual. Setelah preview, "
                "tunggu user balas ya lalu panggil kasir_confirm_sale "
                "(draft_id opsional — pakai draft terakhir untuk nomor ini)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "description": "Daftar item {name, quantity, unit_price}",
                        "items": {"type": "object"},
                    },
                    "payment_method": {"type": "string"},
                    "customer_name": {"type": "string"},
                    "phone": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["items"],
            },
        },
        handle_draft_sale,
    ),
    (
        "kasir_repeat_last_sale",
        {
            "name": "kasir_repeat_last_sale",
            "description": (
                "Ulang penjualan terakhir sebagai draft baru (satu lagi / ulang). "
                "Panggil saat user bilang 'satu lagi' atau 'ulang yang tadi' "
                "tanpa menyebut produk. Lalu tunggu ya → kasir_confirm_sale."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "phone": {"type": "string"},
                    "payment_method": {"type": "string"},
                },
                "required": [],
            },
        },
        handle_repeat_last_sale,
    ),
    (
        "kasir_confirm_sale",
        {
            "name": "kasir_confirm_sale",
            "description": (
                "Commit draft penjualan ke database + potong stok. "
                "Hanya setelah user setuju (ya / Ya, simpan). draft_id opsional — "
                "kosongkan untuk memakai draft penjualan terakhir nomor ini."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "draft_id": {
                        "type": "string",
                        "description": "Opsional. Kosong = draft penjualan terakhir.",
                    },
                    "phone": {"type": "string"},
                },
                "required": [],
            },
        },
        handle_confirm_sale,
    ),
    (
        "kasir_draft_purchase",
        {
            "name": "kasir_draft_purchase",
            "description": (
                "Siapkan draft belanja/pembelian (BELUM menulis). "
                "unit_price pada items = harga modal. Setelah preview, "
                "tunggu ya lalu kasir_confirm_purchase."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "description": "Daftar item {name, quantity, unit_price=modal}",
                        "items": {"type": "object"},
                    },
                    "purchase_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "supplier_name": {"type": "string"},
                    "phone": {"type": "string"},
                    "notes": {"type": "string"},
                },
                "required": ["items"],
            },
        },
        handle_draft_purchase,
    ),
    (
        "kasir_confirm_purchase",
        {
            "name": "kasir_confirm_purchase",
            "description": (
                "Commit draft belanja + tambah stok. Hanya setelah user setuju. "
                "draft_id opsional — kosongkan untuk draft belanja terakhir."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "draft_id": {
                        "type": "string",
                        "description": "Opsional. Kosong = draft belanja terakhir.",
                    },
                    "phone": {"type": "string"},
                },
                "required": [],
            },
        },
        handle_confirm_purchase,
    ),
]
